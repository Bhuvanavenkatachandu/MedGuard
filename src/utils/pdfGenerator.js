import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates a clean, professional pharmacy invoice PDF
 */
export const generateInvoicePdf = ({
  pharmacy,
  sale,
  customer,
  items,
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Primary colors
  const primaryColor = [30, 64, 175]; // Royal Blue
  const darkSlate = [15, 23, 42];
  const mutedText = [100, 116, 139];

  // Header Background Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MedGuard AI', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Retail Pharmacy Tax Invoice', 14, 22);

  // Pharmacy Details (Right Aligned Header)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text((pharmacy?.name || 'MedGuard Partner Pharmacy').toUpperCase(), pageWidth - 14, 12, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(pharmacy?.phone ? `Ph: ${pharmacy.phone}` : 'Ph: Verified Store', pageWidth - 14, 17, { align: 'right' });
  doc.text(pharmacy?.license_number ? `DL No: ${pharmacy.license_number}` : 'Licensed Pharmacy', pageWidth - 14, 22, { align: 'right' });

  // Invoice Meta Section
  let y = 38;
  doc.setTextColor(...darkSlate);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE / CASH MEMO', 14, y);

  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, y - 2, pageWidth - 14, y - 2);

  // Left Column: Customer Details
  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  doc.text('BILLED TO (PATIENT / CUSTOMER):', 14, y + 4);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text(customer?.name || sale?.customer_name || 'Walk-in Customer', 14, y + 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);
  doc.text(`Phone: ${customer?.phone || sale?.customer_phone || 'N/A'}`, 14, y + 15);
  doc.text(`Email: ${customer?.email || sale?.customer_email || 'N/A'}`, 14, y + 20);

  // Right Column: Invoice Details
  const rightX = pageWidth - 70;
  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  doc.text('INVOICE DETAILS:', rightX, y + 4);

  doc.setTextColor(...darkSlate);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice No: ${sale?.sale_number || sale?.invoice_number || 'INV-001'}`, rightX, y + 10);
  
  doc.setFont('helvetica', 'normal');
  const saleDate = sale?.created_at ? new Date(sale.created_at) : new Date();
  doc.text(`Date & Time: ${saleDate.toLocaleDateString('en-IN')} ${saleDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, rightX, y + 15);
  doc.text(`Payment Mode: ${sale?.payment_method || 'Cash'}`, rightX, y + 20);

  y += 28;

  // Table Data Preparation
  const tableRows = (items || sale?.items || []).map((item, idx) => {
    const unitLabel = item.unit_type === 'strip' ? 'Strip(s)' : 'Piece(s)';
    return [
      idx + 1,
      item.medicine_name || 'Medicine',
      item.batch_number || 'N/A',
      item.expiry_date || 'N/A',
      `${item.quantity_units} ${unitLabel}`,
      `₹${Number(item.unit_price).toFixed(2)}`,
      `₹${Number(item.total_price).toFixed(2)}`,
    ];
  });

  // Render Table using jspdf-autotable
  doc.autoTable({
    startY: y,
    head: [['#', 'Item Description', 'Batch', 'Expiry', 'Quantity', 'Rate', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: darkSlate,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26 },
      3: { cellWidth: 22 },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 26, halign: 'right' },
    },
    didDrawPage: (data) => {
      // Table ended
    }
  });

  // Calculate final Y position after table
  const finalY = doc.lastAutoTable.finalY + 8;

  // Financial Breakdown (Right Aligned)
  const totalsX = pageWidth - 65;
  const valuesX = pageWidth - 14;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);

  doc.text('Subtotal:', totalsX, finalY);
  doc.text(`₹${Number(sale?.subtotal || sale?.total_amount || 0).toFixed(2)}`, valuesX, finalY, { align: 'right' });

  let curY = finalY + 5;
  if (sale?.discount_amount && Number(sale.discount_amount) > 0) {
    doc.text('Discount:', totalsX, curY);
    doc.text(`- ₹${Number(sale.discount_amount).toFixed(2)}`, valuesX, curY, { align: 'right' });
    curY += 5;
  }

  if (sale?.tax_amount && Number(sale.tax_amount) > 0) {
    doc.text('Taxes (GST):', totalsX, curY);
    doc.text(`₹${Number(sale.tax_amount).toFixed(2)}`, valuesX, curY, { align: 'right' });
    curY += 5;
  }

  // Grand Total Highlight Bar
  doc.setFillColor(241, 245, 249);
  doc.rect(totalsX - 4, curY - 1, (pageWidth - totalsX) - 10 + 4, 9, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text('Grand Total:', totalsX, curY + 5);
  doc.text(`₹${Number(sale?.total_amount || 0).toFixed(2)}`, valuesX, curY + 5, { align: 'right' });

  // Left Note / FEFO compliance notice
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);
  doc.text('• Batches dispensed in compliance with FEFO guidelines.', 14, finalY);
  doc.text('• Keep medicines out of reach of children. Store in a cool, dry place.', 14, finalY + 5);
  doc.text('• Please consult your physician before consuming any prescription medicine.', 14, finalY + 10);

  // Pharmacist Signature Block
  const sigY = curY + 28;
  if (sigY < doc.internal.pageSize.getHeight() - 25) {
    doc.setDrawColor(203, 213, 225);
    doc.line(pageWidth - 65, sigY, pageWidth - 14, sigY);
    doc.setFontSize(8);
    doc.setTextColor(...mutedText);
    doc.text('Authorized Pharmacist Signature', pageWidth - 40, sigY + 4, { align: 'center' });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('MedGuard AI - Intelligent Pharmacy Management & Discovery Ecosystem', pageWidth / 2, footerY, { align: 'center' });

  const blob = doc.output('blob');
  const dataUri = doc.output('datauristring');

  return {
    doc,
    blob,
    dataUri,
    save: (fileName) => doc.save(fileName || `Invoice_${sale?.sale_number || 'sale'}.pdf`),
  };
};

/**
 * Creates a local download URL for the invoice PDF
 */
export const uploadInvoicePdf = async (blob, invoiceNumber) => {
  return {
    success: true,
    publicUrl: URL.createObjectURL(blob),
  };
};
