import random
from datetime import datetime, date
from typing import Optional
from fastapi import HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from backend.app.models.pharmacy import Pharmacy
from backend.app.models.user import User
from backend.app.models.customer import Customer
from backend.app.models.medicine import Medicine
from backend.app.models.batch import Batch
from backend.app.models.inventory import Inventory
from backend.app.models.sale import Sale, SaleItem
from backend.app.models.invoice import Invoice
from backend.app.models.stock_movement import StockMovement
from backend.app.schemas.sale import SaleCheckoutRequest, SaleCheckoutResponse
from backend.app.services.invoice_service import generate_invoice_pdf
from backend.app.services.email_service import send_invoice_email_task

def checkout_sale(
    db: Session,
    pharmacy: Pharmacy,
    pharmacist: User,
    req: SaleCheckoutRequest,
    background_tasks: Optional[BackgroundTasks] = None,
) -> SaleCheckoutResponse:
    if not req.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty. No items to checkout.")

    today = date.today()
    pharmacy_id = pharmacy.id

    # 1. Resolve Customer
    customer = None
    if req.customer_id:
        customer = db.query(Customer).filter(Customer.id == req.customer_id, Customer.pharmacy_id == pharmacy_id).first()
    
    if not customer and req.customer_data:
        cust_phone = req.customer_data.phone.strip()
        customer = db.query(Customer).filter(Customer.pharmacy_id == pharmacy_id, Customer.phone == cust_phone).first()
        if not customer:
            customer = Customer(
                pharmacy_id=pharmacy_id,
                name=req.customer_data.name.strip(),
                phone=cust_phone,
                email=req.customer_data.email.strip() if req.customer_data.email else None,
                address=req.customer_data.address.strip() if req.customer_data.address else None,
            )
            db.add(customer)
            db.flush()
        else:
            if req.customer_data.name: customer.name = req.customer_data.name.strip()
            if req.customer_data.email: customer.email = req.customer_data.email.strip()

    customer_name = customer.name if customer else (req.customer_data.name if req.customer_data else "Walk-in Customer")
    customer_phone = customer.phone if customer else (req.customer_data.phone if req.customer_data else "N/A")
    customer_email = customer.email if customer else (req.customer_data.email if req.customer_data else None)

    # 2. Generate Unique Numbers
    date_part = datetime.utcnow().strftime("%Y%m%d")
    rand_part = random.randint(10000, 99999)
    sale_number = f"SALE-{date_part}-{rand_part}"
    invoice_number = f"INV-{date_part}-{rand_part}"

    # 3. Validate Stock & Expiry for each item
    item_inventory_map = {}
    items_to_process = []

    for item in req.items:
        batch = db.query(Batch).filter(Batch.id == item.batch_id, Batch.pharmacy_id == pharmacy_id).first()
        if not batch:
            raise HTTPException(status_code=400, detail=f"Batch {item.batch_id} not found for this pharmacy.")

        if batch.expiry_date < today:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot sell expired medicine from batch {batch.batch_number}. Expired on {batch.expiry_date}."
            )

        inv = db.query(Inventory).filter(Inventory.batch_id == item.batch_id, Inventory.pharmacy_id == pharmacy_id).first()
        if not inv:
            raise HTTPException(status_code=400, detail=f"Inventory record missing for batch {batch.batch_number}.")

        if inv.total_pieces < item.pieces_count:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for batch {batch.batch_number}. Available: {inv.total_pieces} pieces, Requested: {item.pieces_count} pieces."
            )

        item_inventory_map[item.batch_id] = (batch, inv)
        items_to_process.append(item)

    # 4. Insert Sale Master Record
    sale = Sale(
        pharmacy_id=pharmacy_id,
        customer_id=customer.id if customer else None,
        pharmacist_id=pharmacist.id,
        sale_number=sale_number,
        subtotal=req.subtotal,
        discount_amount=req.discount_amount,
        tax_amount=req.tax_amount,
        total_amount=req.total_amount,
        payment_method=req.payment_method or "Cash",
        notes=req.notes,
    )
    db.add(sale)
    db.flush()

    # 5. Process Items, Deduct Stock, and Record Stock Movements
    pdf_item_details = []
    response_items = []

    for item in items_to_process:
        batch, inv = item_inventory_map[item.batch_id]
        medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        med_name = medicine.name if medicine else "Medicine"

        sale_item = SaleItem(
            sale_id=sale.id,
            medicine_id=item.medicine_id,
            batch_id=item.batch_id,
            unit_type=item.unit_type,
            quantity_units=item.quantity_units,
            pieces_count=item.pieces_count,
            unit_price=item.unit_price,
            total_price=item.total_price,
        )
        db.add(sale_item)

        # Deduct from inventory
        inv.total_pieces -= item.pieces_count
        db.flush()

        # Record movement
        movement = StockMovement(
            pharmacy_id=pharmacy_id,
            medicine_id=item.medicine_id,
            batch_id=item.batch_id,
            movement_type="sale",
            pieces_quantity=-item.pieces_count,
            balance_after=inv.total_pieces,
            reference_id=sale_number,
            notes=f"POS Sale: {item.quantity_units} {item.unit_type}(s)",
        )
        db.add(movement)

        pdf_item_details.append({
            "medicine_name": med_name,
            "batch_number": batch.batch_number,
            "unit_type": item.unit_type,
            "quantity_units": item.quantity_units,
            "unit_price": item.unit_price,
            "total_price": item.total_price,
        })
        response_items.append({
            "medicine_name": med_name,
            "batch_number": batch.batch_number,
            "unit_type": item.unit_type,
            "quantity_units": item.quantity_units,
            "pieces_count": item.pieces_count,
            "unit_price": item.unit_price,
            "total_price": item.total_price,
        })

    # 6. Insert Invoice Record
    invoice = Invoice(
        pharmacy_id=pharmacy_id,
        sale_id=sale.id,
        invoice_number=invoice_number,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=customer_email,
        total_amount=req.total_amount,
        status="generated",
    )
    db.add(invoice)
    db.flush()

    # 7. Generate PDF
    pdf_path = None
    try:
        pharmacy_info = {
            "name": pharmacy.name,
            "address": pharmacy.address,
            "phone": pharmacy.phone,
            "license_number": pharmacy.license_number,
        }
        customer_info = {
            "name": customer_name,
            "phone": customer_phone,
            "email": customer_email,
        }
        pdf_path = generate_invoice_pdf(
            invoice_number=invoice_number,
            sale_number=sale_number,
            pharmacy_info=pharmacy_info,
            customer_info=customer_info,
            items=pdf_item_details,
            subtotal=req.subtotal,
            discount_amount=req.discount_amount,
            tax_amount=req.tax_amount,
            total_amount=req.total_amount,
            payment_method=req.payment_method,
            created_at=sale.created_at,
        )
        invoice.pdf_url = f"/api/invoices/{invoice.id}/pdf"
    except Exception as exc:
        print(f"Warning: Failed to generate invoice PDF: {exc}")

    db.commit()

    # 8. Non-blocking customer email
    if customer_email and background_tasks:
        background_tasks.add_task(
            send_invoice_email_task,
            pharmacy_id=pharmacy_id,
            invoice_id=invoice.id,
            recipient_email=customer_email,
            customer_name=customer_name,
            invoice_number=invoice_number,
            total_amount=req.total_amount,
            pdf_path=pdf_path,
        )

    return SaleCheckoutResponse(
        success=True,
        sale_id=sale.id,
        sale_number=sale_number,
        invoice_id=invoice.id,
        invoice_number=invoice_number,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=customer_email,
        total_amount=req.total_amount,
        items=response_items,
    )
