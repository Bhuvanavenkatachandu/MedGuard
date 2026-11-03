import React, { useState } from 'react';
import { usePharmacy } from '../../../shared/context/PharmacyContext';
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
import { generateInvoicePdf } from '../../../shared/utils/pdfGenerator';
import { Button } from '../../../shared/components/ui/Button';
import { EmptyState } from '../../../shared/components/ui/EmptyState';

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
        alert(`Email failed: ${res.error || 'Check SMTP mail server settings.'}`);
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
            <span className="p-1.5 rounded-lg bg-blue-100 text-primary font-bold">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Invoices & Billing History
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Archived sales invoices with instant PDF retrieval and automated email tracking.
          </p>
        </div>

        <div className="text-xs font-semibold bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-xs">
          Total Invoices: <strong className="text-primary">{invoices.length}</strong>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice number, patient name, phone number, or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-medium"
          />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Invoices Found"
            description={
              searchTerm
                ? `No invoices match "${searchTerm}".`
                : 'No invoices created yet. Completed POS transactions will automatically archive here.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Customer Details</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold text-right">Invoice Amount</th>
                  <th className="py-3 px-4 font-semibold text-center">Email Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.invoice_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{inv.customer_phone}</div>
                      {inv.customer_email && (
                        <div className="text-[10px] text-slate-400">{inv.customer_email}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{new Date(inv.created_at).toLocaleDateString('en-IN')}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(inv.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-extrabold text-slate-900 text-right font-mono text-sm">
                      ₹{Number(inv.total_amount).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {inv.customer_email ? (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          inv.email_status === 'sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <Mail className="w-3 h-3" />
                          <span>{inv.email_status === 'sent' ? 'Delivered' : 'Pending'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No email</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleDownload(inv)}
                          leftIcon={<Download className="w-3.5 h-3.5 text-primary" />}
                        >
                          PDF
                        </Button>

                        {inv.customer_email && (
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={resendingId === inv.id}
                            onClick={() => handleResend(inv)}
                            leftIcon={<Mail className="w-3.5 h-3.5" />}
                          >
                            {resendingId === inv.id ? 'Sending...' : 'Email'}
                          </Button>
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
