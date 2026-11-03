"""
MedGuard AI - Point of Sale (POS) & Checkout Service
=====================================================
Executes checkout transactions with atomicity and strict safety guarantees:
1. Customer resolution (existing customer or walk-in contact capture).
2. Stock and expiry validation across all cart items.
3. Master sale record creation.
4. Line item recording and inventory deduction (total_pieces decremented).
5. Immutable stock movement ledger recording for every deducted item.
6. Tax invoice record creation and PDF generation.
7. Background email dispatch to customer (non-blocking).
"""

import random
from datetime import datetime, date
from typing import Optional, Tuple, Dict, List, Any
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
from backend.app.schemas.sale import SaleCheckoutRequest, SaleCheckoutResponse, SaleItemRequest
from backend.app.services.invoice_service import generate_invoice_pdf
from backend.app.services.email_service import send_invoice_email_task


def checkout_sale(
    db: Session,
    pharmacy: Pharmacy,
    pharmacist: User,
    req: SaleCheckoutRequest,
    background_tasks: Optional[BackgroundTasks] = None,
) -> SaleCheckoutResponse:
    """
    Main checkout orchestrator.
    
    Reads like a clear sequence of steps:
    1. Reject empty cart requests.
    2. Identify or register customer profile.
    3. Generate unique SALE and INV reference identifiers.
    4. Verify inventory balances and check that zero expired batches are being dispensed.
    5. Save sale master transaction.
    6. Deduct inventory pieces and record stock movement ledger entries.
    7. Generate invoice record and PDF invoice.
    8. Queue background email to customer if email is available.
    """
    if not req.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty. No items to checkout.",
        )

    pharmacy_id = pharmacy.id
    today = date.today()

    # Step 1: Customer Resolution
    customer, cust_name, cust_phone, cust_email = _resolve_customer(db, pharmacy_id, req)

    # Step 2: Unique Reference Identifiers
    date_part = datetime.utcnow().strftime("%Y%m%d")
    rand_part = random.randint(10000, 99999)
    sale_number = f"SALE-{date_part}-{rand_part}"
    invoice_number = f"INV-{date_part}-{rand_part}"

    # Step 3: Validate Inventory & Expiration for all cart items
    item_inventory_map = _validate_cart_items(db, pharmacy_id, req.items, today)

    # Step 4: Create Sale Record
    sale = _create_sale_record(db, pharmacy_id, customer, pharmacist, req, sale_number)

    # Step 5: Deduct Stock, Record Sale Items, and Ledger Entries
    pdf_item_details, response_items = _deduct_stock_and_record_items(
        db, pharmacy_id, sale, req.items, item_inventory_map, sale_number
    )

    # Step 6: Create Invoice & Generate PDF
    invoice, pdf_path = _create_invoice_and_pdf(
        db=db,
        pharmacy=pharmacy,
        sale=sale,
        invoice_number=invoice_number,
        sale_number=sale_number,
        customer_name=cust_name,
        customer_phone=cust_phone,
        customer_email=cust_email,
        pdf_items=pdf_item_details,
        req=req,
    )

    db.commit()

    # Step 7: Asynchronous Email Notification (non-blocking)
    if cust_email and background_tasks:
        background_tasks.add_task(
            send_invoice_email_task,
            pharmacy_id=pharmacy_id,
            invoice_id=invoice.id,
            recipient_email=cust_email,
            customer_name=cust_name,
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
        customer_name=cust_name,
        customer_phone=cust_phone,
        customer_email=cust_email,
        total_amount=req.total_amount,
        items=response_items,
    )


# -----------------------------------------------------------------------------
# Checkout Sub-Step Helpers
# -----------------------------------------------------------------------------

def _resolve_customer(
    db: Session,
    pharmacy_id: str,
    req: SaleCheckoutRequest,
) -> Tuple[Optional[Customer], str, str, Optional[str]]:
    """Locate existing customer by ID/phone or initialize a new record."""
    customer = None
    if req.customer_id:
        customer = (
            db.query(Customer)
            .filter(Customer.id == req.customer_id, Customer.pharmacy_id == pharmacy_id)
            .first()
        )

    if not customer and req.customer_data:
        cust_phone = req.customer_data.phone.strip()
        customer = (
            db.query(Customer)
            .filter(Customer.pharmacy_id == pharmacy_id, Customer.phone == cust_phone)
            .first()
        )
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
            if req.customer_data.name:
                customer.name = req.customer_data.name.strip()
            if req.customer_data.email:
                customer.email = req.customer_data.email.strip()

    name = customer.name if customer else (req.customer_data.name if req.customer_data else "Walk-in Customer")
    phone = customer.phone if customer else (req.customer_data.phone if req.customer_data else "N/A")
    email = customer.email if customer else (req.customer_data.email if req.customer_data else None)
    return customer, name, phone, email


def _validate_cart_items(
    db: Session,
    pharmacy_id: str,
    items: List[SaleItemRequest],
    today: date,
) -> Dict[str, Tuple[Batch, Inventory]]:
    """
    Validate that each batch exists, is unexpired, and has sufficient stock.
    Returns mapping of batch_id -> (Batch, Inventory).
    """
    item_inventory_map = {}
    for item in items:
        batch = (
            db.query(Batch)
            .filter(Batch.id == item.batch_id, Batch.pharmacy_id == pharmacy_id)
            .first()
        )
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Batch {item.batch_id} not found for this pharmacy.",
            )

        if batch.expiry_date < today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot sell expired medicine from batch {batch.batch_number}. Expired on {batch.expiry_date}.",
            )

        inv = (
            db.query(Inventory)
            .filter(Inventory.batch_id == item.batch_id, Inventory.pharmacy_id == pharmacy_id)
            .first()
        )
        if not inv:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inventory record missing for batch {batch.batch_number}.",
            )

        if inv.total_pieces < item.pieces_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for batch {batch.batch_number}. "
                    f"Available: {inv.total_pieces} pieces, Requested: {item.pieces_count} pieces."
                ),
            )

        item_inventory_map[item.batch_id] = (batch, inv)

    return item_inventory_map


def _create_sale_record(
    db: Session,
    pharmacy_id: str,
    customer: Optional[Customer],
    pharmacist: User,
    req: SaleCheckoutRequest,
    sale_number: str,
) -> Sale:
    """Inserts the master Sale record into the database."""
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
    return sale


def _deduct_stock_and_record_items(
    db: Session,
    pharmacy_id: str,
    sale: Sale,
    items: List[SaleItemRequest],
    item_inventory_map: Dict[str, Tuple[Batch, Inventory]],
    sale_number: str,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Deducts stock from inventory and records SaleItem and StockMovement records."""
    pdf_item_details = []
    response_items = []

    for item in items:
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

        # Deduct total pieces directly from inventory
        inv.total_pieces -= item.pieces_count
        db.flush()

        # Record movement ledger entry
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

        item_summary = {
            "medicine_name": med_name,
            "batch_number": batch.batch_number,
            "unit_type": item.unit_type,
            "quantity_units": item.quantity_units,
            "unit_price": item.unit_price,
            "total_price": item.total_price,
        }
        pdf_item_details.append(item_summary)
        response_items.append({**item_summary, "pieces_count": item.pieces_count})

    return pdf_item_details, response_items


def _create_invoice_and_pdf(
    db: Session,
    pharmacy: Pharmacy,
    sale: Sale,
    invoice_number: str,
    sale_number: str,
    customer_name: str,
    customer_phone: str,
    customer_email: Optional[str],
    pdf_items: List[Dict[str, Any]],
    req: SaleCheckoutRequest,
) -> Tuple[Invoice, Optional[str]]:
    """Inserts Invoice record and attempts PDF invoice generation."""
    invoice = Invoice(
        pharmacy_id=pharmacy.id,
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
            items=pdf_items,
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

    return invoice, pdf_path
