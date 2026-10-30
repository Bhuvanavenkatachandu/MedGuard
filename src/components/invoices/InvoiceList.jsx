import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  FileText, 
  Search, 
  Download, 
  Mail, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { generateInvoicePdf } from '../../utils/pdfGenerator';

export const InvoiceList = () => {
  const { invoices, sales, pharmacy, resendInvoiceEmail } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [resendingId, setResendingId] = useState(null);

  const filteredInvoices = invoices.filter(inv => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (inv.invoice_number || '').toLowerCase().includes(q) ||
      (inv.customer_name || '').toLowerCase().includes(q) ||
      (inv.customer_phone && inv.customer_phone.toLowerCase().includes(q)) ||
      (inv.customer_email && inv.customer_email.toLowerCase().includes(q))
    );
  });

  const handleDownload = (invoice) => {
    const sale = sales.find(s => s.id === invoice.sale_id || s.sale_number === invoice.invoice_number);
    const pdf = generateInvoicePdf({
      pharmacy,
      sale: sale || {
        sale_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone,
        customer_email: invoice.customer_email,
        payment_method: 'Verified',
        created_at: invoice.created_at,
        items: [],
      },
      customer: {
        name: invoice.customer_name,
        phone: invoice.customer_phone,
        email: invoice.customer_email,
      },
      items: sale?.items || [],
    });
    pdf.save(`Invoice_${invoice.invoice_number}.pdf`);
  };

  const handleResend = async (invoice) => {
    setResendingId(invoice.id);
    try {
      const res = await resendInvoiceEmail(invoice.id);
      if (res.success) {
        alert(`Invoice successfully emailed to ${invoice.customer_email}!`);
      } else {
        alert(`Email failed: ${res.error || 'Check Resend API key.'}`);
      }
    } catch (e) {
      alert(`Error resending email: ${e.message}`);
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 font-bold">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Invoices & Billing History
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Archived sales invoices with PDF retrieval and Resend email tracking.
          </p>
        </div>

        <div className="text-xs font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
          Total Invoices: <strong className="text-blue-600">{invoices.length}</strong>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice number, customer name, phone number, or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No matching invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Customer Details</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-center">Email Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.invoice_number}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(inv.created_at).toLocaleDateString('en-IN')}{' '}
                      <span className="text-[10px] text-slate-400">
                        {new Date(inv.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{inv.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {inv.customer_phone} {inv.customer_email && `• ${inv.customer_email}`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right">
                      ₹{Number(inv.total_amount).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {inv.status === 'emailed' ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Emailed</span>
                        </span>
                      ) : inv.status === 'email_failed' ? (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Email Failed</span>
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                          Generated
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleDownload(inv)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-3 h-3 text-blue-600" />
                          <span>PDF</span>
                        </button>

                        {inv.customer_email && (
                          <button
                            onClick={() => handleResend(inv)}
                            disabled={resendingId === inv.id}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                            title="Resend email to customer"
                          >
                            <Mail className={`w-3 h-3 ${resendingId === inv.id ? 'animate-spin' : ''}`} />
                            <span>Resend</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
