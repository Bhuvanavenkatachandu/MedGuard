import os
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from backend.app.config import settings

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
        bottomMargin=36
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
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=muted_text,
    )
    bold_style = ParagraphStyle(
        'BoldMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=dark_slate,
    )
    normal_style = ParagraphStyle(
        'NormalMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=dark_slate,
    )

    elements = []

    # 1. Header Banner / Pharmacy Info
    pharm_name = pharmacy_info.get("name", "MedGuard Pharmacy")
    pharm_addr = pharmacy_info.get("address", "")
    pharm_phone = pharmacy_info.get("phone", "")
    pharm_dl = pharmacy_info.get("license_number", "Licensed Retail Pharmacy")

    header_table_data = [
        [
            Paragraph("<b>MedGuard AI</b>", title_style),
            Paragraph(f"<b>{pharm_name}</b>", ParagraphStyle('RBold', parent=bold_style, alignment=2)),
        ],
        [
            Paragraph("Official Retail Pharmacy Tax Invoice", subtitle_style),
            Paragraph(f"{pharm_addr}", ParagraphStyle('RNorm', parent=normal_style, alignment=2)),
        ],
        [
            Paragraph("", normal_style),
            Paragraph(f"Ph: {pharm_phone} | DL: {pharm_dl}", ParagraphStyle('RNorm2', parent=normal_style, alignment=2)),
        ]
    ]
    header_table = Table(header_table_data, colWidths=[2.5 * inch, 4.5 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))

    # 2. Invoice & Customer Meta
    date_str = (created_at or datetime.utcnow()).strftime("%Y-%m-%d %H:%M UTC")
    cust_name = customer_info.get("name", "Walk-in Customer")
    cust_phone = customer_info.get("phone", "N/A")
    cust_email = customer_info.get("email", "") or "N/A"

    meta_data = [
        [
            Paragraph("<b>BILLED TO:</b>", bold_style),
            Paragraph("<b>INVOICE DETAILS:</b>", bold_style),
        ],
        [
            Paragraph(f"Customer: <b>{cust_name}</b>", normal_style),
            Paragraph(f"Invoice No: <b>{invoice_number}</b>", normal_style),
        ],
        [
            Paragraph(f"Phone: {cust_phone}", normal_style),
            Paragraph(f"Sale Ref: {sale_number}", normal_style),
        ],
        [
            Paragraph(f"Email: {cust_email}", normal_style),
            Paragraph(f"Date & Time: {date_str}", normal_style),
        ],
        [
            Paragraph("", normal_style),
            Paragraph(f"Payment Method: <b>{payment_method}</b>", normal_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[3.5 * inch, 3.5 * inch])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 15))

    # 3. Itemized Table
    table_data = [
        ["#", "Medicine / Product", "Batch", "Unit", "Qty", "Rate (₹)", "Total (₹)"]
    ]

    for idx, item in enumerate(items, start=1):
        med_name = item.get("medicine_name") or item.get("name") or "Medicine"
        batch_no = item.get("batch_number") or item.get("batch_id", "")[:8] or "N/A"
        unit_type = item.get("unit_type", "strip").capitalize()
        qty = item.get("quantity_units") or item.get("quantity") or 1
        unit_price = item.get("unit_price", 0.0)
        tot_price = item.get("total_price", 0.0)

        table_data.append([
            str(idx),
            Paragraph(f"<b>{med_name}</b>", normal_style),
            batch_no,
            unit_type,
            str(qty),
            f"₹{unit_price:.2f}",
            f"₹{tot_price:.2f}"
        ])

    item_table = Table(table_data, colWidths=[0.3 * inch, 2.7 * inch, 1.0 * inch, 0.7 * inch, 0.5 * inch, 0.9 * inch, 0.9 * inch])
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (4, 1), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (2, 1), (3, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(item_table)
    elements.append(Spacer(1, 10))

    # 4. Totals Summary
    totals_data = [
        ["Subtotal:", f"₹{subtotal:.2f}"],
        ["Discount:", f"-₹{discount_amount:.2f}"],
        ["Tax / GST:", f"+₹{tax_amount:.2f}"],
        ["Grand Total:", f"₹{total_amount:.2f}"],
    ]
    totals_table = Table(totals_data, colWidths=[1.5 * inch, 1.2 * inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (0, -2), 'Helvetica'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 11),
        ('TEXTCOLOR', (0, -1), (-1, -1), primary_color),
        ('LINEABOVE', (0, -1), (-1, -1), 1, primary_color),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))

    wrapper_table = Table([["", totals_table]], colWidths=[4.3 * inch, 2.7 * inch])
    elements.append(wrapper_table)
    elements.append(Spacer(1, 20))

    # 5. Footer Terms & AI Signature
    footer_text = (
        "Thank you for choosing MedGuard AI verified pharmacy. "
        "Medicines dispensed under strict FEFO batch controls. "
        "Please store medicines as directed. Keep out of reach of children."
    )
    elements.append(Paragraph(footer_text, ParagraphStyle('Foot', parent=subtitle_style, alignment=1)))

    doc.build(elements)
    return str(file_path)
