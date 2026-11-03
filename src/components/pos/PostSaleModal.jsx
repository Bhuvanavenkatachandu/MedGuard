/**
 * MedGuard AI - Post-Sale Completion Modal
 * =========================================
 * Displays immediate confirmation after a successful POS checkout:
 * - Invoice reference number and payment summary
 * - Atomic inventory status and PDF invoice generation confirmation
 * - Customer email dispatch status with one-click retry
 * - Action buttons: Download PDF, Stay on POS, or auto-redirect to Dashboard
 */

import React from 'react';
import { CheckCircle2, Clock, FileText, Mail, Download, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export const PostSaleModal = ({
  completedSale,
  countdown,
  resendingEmail,
  onResendEmail,
  onDownloadPdf,
  onStayOnPos,
  onGoToDashboard,
}) => {
  if (!completedSale) return null;

  const invoiceNumber =
    completedSale?.sale?.invoice_number ||
    completedSale?.invoice_number ||
    completedSale?.sale_number;

  const customerEmail =
    completedSale?.sale?.customer_email || completedSale?.customer_email;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Payment & Sale Completed!
          </h3>
          <p className="text-xs text-slate-500 font-mono">
            Invoice No: <strong>{invoiceNumber}</strong>
          </p>
          {countdown !== null && (
            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-primary text-xs font-semibold px-3 py-1 rounded-full border border-blue-100">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Redirecting to Dashboard in {countdown}s...</span>
            </div>
          )}
        </div>

        {/* Verification Status Checklist */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between text-emerald-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sale successful & inventory updated</span>
            </span>
            <span className="text-[10px] uppercase font-mono">Atomic Done</span>
          </div>

          <div className="flex items-center justify-between text-emerald-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Invoice PDF generated & archived</span>
            </span>
            <span className="text-[10px] uppercase font-mono">PDF Ready</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Mail
                className={`w-4 h-4 ${
                  completedSale.emailStatus === 'sent'
                    ? 'text-emerald-600'
                    : completedSale.emailStatus === 'failed'
                    ? 'text-rose-600'
                    : 'text-slate-400'
                }`}
              />
              <span
                className={`font-semibold ${
                  completedSale.emailStatus === 'sent'
                    ? 'text-emerald-700'
                    : completedSale.emailStatus === 'failed'
                    ? 'text-rose-700'
                    : 'text-slate-600'
                }`}
              >
                {completedSale.emailStatus === 'sent'
                  ? `Invoice emailed to ${customerEmail}`
                  : completedSale.emailStatus === 'failed'
                  ? 'Email delivery failed (Check mail configuration)'
                  : 'No email provided by customer'}
              </span>
            </span>

            {completedSale.emailStatus === 'failed' && (
              <button
                onClick={onResendEmail}
                disabled={resendingEmail}
                className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded transition-colors"
              >
                {resendingEmail ? 'Retrying...' : 'Resend Invoice'}
              </button>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadPdf}
            leftIcon={<Download className="w-4 h-4 text-primary" />}
          >
            Download PDF
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={onStayOnPos}>
              Stay on POS
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onGoToDashboard}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Go to Dashboard {countdown !== null && `(${countdown}s)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
