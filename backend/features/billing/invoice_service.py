"""MedGuard AI - Invoice Generation Service (Billing Feature)"""

import os
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from backend.shared.config import settings

INVOICE_STORAGE_DIR = Path(settings.STORAGE_DIR) / "invoices"
INVOICE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def generate_invoice_pdf(
    invoice_number: str,
    sale_number: str,
    pharmacy_info: dict,
    customer_info: dict,
    items: list,
    subtotal: float,
    discount_amount: float,
    tax_amount: float,
    total_amount: float,
    payment_method: str = "Cash",
    created_at: datetime = None,
) -> str:
    filename = f"{invoice_number}.pdf"
    file_path = INVOICE_STORAGE_DIR / filename

    doc = SimpleDocTemplate(
        str(file_path),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    primary_color = colors.HexColor("#1e40af")
    dark_slate = colors.HexColor("#0f172a")
    muted_text = colors.HexColor("#64748b")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=primary_color,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=dark_slate,
    )

    bold_style = ParagraphStyle(
        'DocBold',
        parent=body_style,
        fontName='Helvetica-Bold',
    )

    elements = []

    # Header
    pharmacy_meta = [
        Paragraph(f"<b>{pharmacy_info.get('name', 'MedGuard Partner Pharmacy')}</b>", title_style),
        Paragraph(pharmacy_info.get('address', ''), body_style),
        Paragraph(f"Phone: {pharmacy_info.get('phone', 'N/A')}", body_style),
    ]
    if pharmacy_info.get('license_number'):
        pharmacy_meta.append(Paragraph(f"Drug License: {pharmacy_info['license_number']}", body_style))

    inv_date = (created_at or datetime.utcnow()).strftime("%d %b %Y, %I:%M %p")
    invoice_meta = [
        Paragraph("<b>TAX INVOICE / CASH BILL</b>", ParagraphStyle('InvTitle', parent=bold_style, fontSize=14, textColor=primary_color, alignment=2)),
        Paragraph(f"<b>Invoice #:</b> {invoice_number}", ParagraphStyle('InvNum', parent=body_style, alignment=2)),
        Paragraph(f"<b>Sale Ref:</b> {sale_number}", ParagraphStyle('SaleNum', parent=body_style, alignment=2)),
        Paragraph(f"<b>Date:</b> {inv_date}", ParagraphStyle('DateText', parent=body_style, alignment=2)),
    ]

    header_table = Table([[pharmacy_meta, invoice_meta]], colWidths=[3.5 * inch, 3.5 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))

    # Customer Details
    cust_data = [
        [Paragraph(f"<b>Bill To:</b> {customer_info.get('name', 'Walk-in Customer')}", body_style),
         Paragraph(f"<b>Mobile:</b> {customer_info.get('phone', 'N/A')}", body_style)],
    ]
    if customer_info.get('email'):
        cust_data.append([Paragraph(f"<b>Email:</b> {customer_info['email']}", body_style), Paragraph(f"<b>Payment:</b> {payment_method}", body_style)])

    cust_table = Table(cust_data, colWidths=[4.0 * inch, 3.0 * inch])
    cust_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(cust_table)
    elements.append(Spacer(1, 14))

    # Items Table
    table_data = [["#", "Medicine Description", "Batch", "Exp", "Qty", "Unit Price", "Total (INR)"]]
    for idx, itm in enumerate(items, 1):
        u_type = itm.get('unit_type', 'strip').capitalize()
        qty = itm.get('quantity_units', 1)
        med_desc = f"<b>{itm.get('medicine_name', 'Medicine')}</b>"
        table_data.append([
            str(idx),
            Paragraph(med_desc, body_style),
            str(itm.get('batch_number', 'N/A')),
            str(itm.get('expiry_date', 'N/A'))[:7],
            f"{qty} {u_type}",
            f"{itm.get('unit_price', 0.0):.2f}",
            f"{itm.get('total_price', 0.0):.2f}",
        ])

    items_table = Table(table_data, colWidths=[0.3 * inch, 2.7 * inch, 1.1 * inch, 0.7 * inch, 0.8 * inch, 0.7 * inch, 0.7 * inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 10))

    # Summary Table
    summary_data = [
        ["Subtotal:", f"INR {subtotal:.2f}"],
        ["Discount:", f"- INR {discount_amount:.2f}"],
        ["Tax (GST Included):", f"INR {tax_amount:.2f}"],
        ["Grand Total:", f"INR {total_amount:.2f}"],
    ]
    summary_table = Table(summary_data, colWidths=[5.5 * inch, 1.5 * inch])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTSIZE', (0, -1), (-1, -1), 10),
        ('TEXTCOLOR', (0, -1), (-1, -1), primary_color),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 25))

    # Footer note
    footer_text = Paragraph(
        "<i>Thank you for your purchase. Please retain this bill for your health records. "
        "Medicines dispensed are non-returnable once opened. Generated securely by MedGuard AI.</i>",
        ParagraphStyle('FooterText', parent=body_style, fontSize=7, textColor=muted_text, alignment=1)
    )
    elements.append(footer_text)

    doc.build(elements)
    return f"/storage/invoices/{filename}"
