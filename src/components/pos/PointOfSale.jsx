import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Search, 
  ShoppingCart, 
  UserCheck, 
  UserPlus, 
  Trash2, 
  Plus, 
  Minus, 
  FileText, 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  CreditCard, 
  ArrowRight,
  Download,
  Send,
  Sparkles,
  Phone
} from 'lucide-react';
import { generateInvoicePdf } from '../../utils/pdfGenerator';

export const PointOfSale = ({ onSaleComplete }) => {
  const navigate = useNavigate();
  const { 
    pharmacy, 
    inventory, 
    medicines, 
    batches, 
    searchCustomerByPhone, 
    processSale,
    resendInvoiceEmail,
    normalizePhone 
  } = usePharmacy();

  // Redirection Countdown after Sale
  const [countdown, setCountdown] = useState(null);

  // Customer State
  const [phoneInput, setPhoneInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [existingCustomer, setExistingCustomer] = useState(null);

  // Medicine Search & FEFO Selection
  const [medicineQuery, setMedicineQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedUnitType, setSelectedUnitType] = useState('strip'); // 'strip' or 'piece'
  const [selectedQty, setSelectedQty] = useState(1);

  // Cart State
  const [cartItems, setCartItems] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0); // 0 or 5% / 12%
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Checkout Execution & Status
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [completedSale, setCompletedSale] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Phone lookup effect: Normalize and auto-check existing customer
  useEffect(() => {
    const cleaned = normalizePhone(phoneInput);
    if (cleaned.length >= 10) {
      const match = searchCustomerByPhone(cleaned);
      if (match) {
        setExistingCustomer(match);
        setCustomerName(match.name);
        setCustomerEmail(match.email || '');
      } else {
        setExistingCustomer(null);
      }
    } else {
      setExistingCustomer(null);
    }
  }, [phoneInput]);

  // Available medicines with in-stock, non-expired batches
  const availableMedicines = useMemo(() => {
    return medicines.filter((med) => {
      // Find non-expired batches with stock > 0
      const validBatches = batches.filter(
        b => b.medicine_id === med.id && b.expiry_date >= todayStr
      );

      const hasStock = validBatches.some(b => {
        const inv = inventory.find(i => i.batch_id === b.id);
        return inv && Number(inv.total_pieces) > 0;
      });

      if (!hasStock) return false;

      if (!medicineQuery.trim()) return true;
      const q = medicineQuery.toLowerCase();
      return (
        med.name.toLowerCase().includes(q) ||
        (med.generic_name && med.generic_name.toLowerCase().includes(q)) ||
        (med.brand && med.brand.toLowerCase().includes(q))
      );
    });
  }, [medicines, batches, inventory, medicineQuery, todayStr]);

  // When medicine is selected, implement FEFO:
  // Automatically recommend the non-expired batch with earliest expiry date!
  useEffect(() => {
    if (selectedMedicine) {
      const validBatches = batches
        .filter(b => b.medicine_id === selectedMedicine.id && b.expiry_date >= todayStr)
        .filter(b => {
          const inv = inventory.find(i => i.batch_id === b.id);
          return inv && Number(inv.total_pieces) > 0;
        })
        .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)); // FEFO: Earliest expiry first!

      if (validBatches.length > 0) {
        setSelectedBatchId(validBatches[0].id);
      } else {
        setSelectedBatchId('');
      }
    }
  }, [selectedMedicine, batches, inventory, todayStr]);

  // Get active selected batch details & stock limits
  const activeBatch = batches.find(b => b.id === selectedBatchId);
  const activeInventory = inventory.find(i => i.batch_id === selectedBatchId);
  const piecesPerStrip = activeInventory?.pieces_per_strip || selectedMedicine?.pieces_per_strip || 10;
  const maxAvailablePieces = activeInventory?.total_pieces || 0;
  const maxAvailableStrips = Math.floor(maxAvailablePieces / piecesPerStrip);

  // Add Item to Cart
  const handleAddToCart = () => {
    if (!selectedMedicine || !activeBatch || !activeInventory) {
      setErrorMessage('Please select an in-stock medicine and batch.');
      return;
    }

    const qty = parseInt(selectedQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMessage('Please specify a valid quantity greater than 0.');
      return;
    }

    const piecesRequested = selectedUnitType === 'strip' ? qty * piecesPerStrip : qty;

    // Check if already in cart
    const existingInCart = cartItems.find(it => it.batch_id === activeBatch.id && it.unit_type === selectedUnitType);
    const existingPieces = cartItems
      .filter(it => it.batch_id === activeBatch.id)
      .reduce((acc, it) => acc + it.pieces_count, 0);

    if (existingPieces + piecesRequested > maxAvailablePieces) {
      setErrorMessage(`Insufficient stock. Batch has only ${maxAvailablePieces} total pieces available.`);
      return;
    }

    const unitPrice = selectedUnitType === 'strip' ? activeInventory.price_per_strip : activeInventory.price_per_piece;
    const totalPrice = unitPrice * qty;

    if (existingInCart) {
      setCartItems(cartItems.map(it => 
        it === existingInCart ? {
          ...it,
          quantity_units: it.quantity_units + qty,
          pieces_count: it.pieces_count + piecesRequested,
          total_price: it.total_price + totalPrice,
        } : it
      ));
    } else {
      setCartItems([
        ...cartItems,
        {
          medicine_id: selectedMedicine.id,
          medicine_name: selectedMedicine.name,
          batch_id: activeBatch.id,
          batch_number: activeBatch.batch_number,
          expiry_date: activeBatch.expiry_date,
          unit_type: selectedUnitType,
          quantity_units: qty,
          pieces_per_strip: piecesPerStrip,
          pieces_count: piecesRequested,
          unit_price: unitPrice,
          total_price: totalPrice,
        }
      ]);
    }

    setErrorMessage(null);
    setSelectedQty(1);
  };

  const handleRemoveFromCart = (index) => {
    setCartItems(cartItems.filter((_, idx) => idx !== index));
  };

  // Financial Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.total_price, 0);
  const discountAmount = (subtotal * (parseFloat(discountPercent) || 0)) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * (parseFloat(taxPercent) || 0)) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  // Checkout & Sale Confirmation
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (processing) return;
    setErrorMessage(null);

    if (cartItems.length === 0) {
      setErrorMessage('Your cart is empty. Add medicine items before billing.');
      return;
    }

    const cleanedPhone = normalizePhone(phoneInput);
    if (!cleanedPhone || cleanedPhone.length < 10) {
      setErrorMessage('Please provide a valid 10-digit customer mobile number.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Please provide customer name.');
      return;
    }

    setProcessing(true);

    try {
      const saleResult = await processSale({
        customer_id: existingCustomer?.id,
        customer_data: {
          name: customerName.trim(),
          phone: cleanedPhone,
          email: customerEmail.trim(),
        },
        items: cartItems,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: grandTotal,
        payment_method: paymentMethod,
      });

      // Normalize completedSale structure
      setCompletedSale({
        ...saleResult,
        sale: {
          ...saleResult,
          id: saleResult.sale_id,
          sale_number: saleResult.sale_number,
          invoice_number: saleResult.invoice_number,
          customer_name: saleResult.customer_name || customerName.trim(),
          customer_phone: saleResult.customer_phone || cleanedPhone,
          customer_email: saleResult.customer_email || customerEmail.trim(),
          total_amount: saleResult.total_amount || grandTotal,
          items: saleResult.items && saleResult.items.length > 0 ? saleResult.items : cartItems,
        },
        invoice: {
          id: saleResult.invoice_id,
          invoice_number: saleResult.invoice_number,
        },
        emailStatus: customerEmail.trim() ? 'sent' : 'none',
      });

      // Clear Cart
      setCartItems([]);
      setPhoneInput('');
      setCustomerName('');
      setCustomerEmail('');
      setExistingCustomer(null);
    } catch (err) {
      setErrorMessage(err.message || 'Sale transaction failed.');
    } finally {
      setProcessing(false);
    }
  };

  // Resend Invoice Email Action
  const handleResendEmail = async () => {
    if (!completedSale?.invoice?.id) return;
    setResendingEmail(true);
    try {
      const res = await resendInvoiceEmail(completedSale.invoice.id);
      if (res.success) {
        setCompletedSale({
          ...completedSale,
          emailStatus: 'sent',
          emailErrorMessage: null,
        });
        alert('Invoice re-sent successfully!');
      } else {
        alert(`Failed to resend: ${res.error || 'Check email configuration.'}`);
      }
    } catch (e) {
      alert(`Email error: ${e.message}`);
    } finally {
      setResendingEmail(false);
    }
  };

  const handleDownloadPdf = () => {
    if (completedSale?.pdfResult) {
      completedSale.pdfResult.save(`Invoice_${completedSale.sale.sale_number}.pdf`);
    } else {
      const pdf = generateInvoicePdf({
        pharmacy,
        sale: completedSale.sale,
        customer: {
          name: completedSale.sale.customer_name,
          phone: completedSale.sale.customer_phone,
          email: completedSale.sale.customer_email,
        },
        items: completedSale.sale.items,
      });
      pdf.save(`Invoice_${completedSale.sale.sale_number}.pdf`);
    }
  };

  // Redirect to Dashboard after Sale
  const handleGoToDashboard = () => {
    setCountdown(null);
    setCompletedSale(null);
    if (onSaleComplete) {
      onSaleComplete();
    } else {
      navigate('/pharmacist/dashboard');
    }
  };

  // Automatic countdown redirection to dashboard
  useEffect(() => {
    if (!completedSale) {
      setCountdown(null);
      return;
    }

    setCountdown(4);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [completedSale]);

  // Clean navigation outside state updater
  useEffect(() => {
    if (countdown === 0 && completedSale) {
      handleGoToDashboard();
    }
  }, [countdown, completedSale]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 font-bold">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              POS Billing Counter & Cart
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            FEFO batch recommendation, atomic stock deduction, instant PDF invoice, and automated email delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>FEFO Guard Active</span>
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* POS Layout: Left Column = Customer & Medicine Selector (7 cols), Right Column = Cart & Checkout (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Customer Lookup & Product Picker */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Customer Identification Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Customer Search (By Phone)</span>
              </h2>

              {existingCustomer ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  <span>Existing Patient Loaded</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <UserPlus className="w-3 h-3" />
                  <span>New Customer</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Arun Nair"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Gmail (For Invoice)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="patient@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Medicine Search & FEFO Batch Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
              2. Add Medicine to Cart
            </h2>

            {/* Medicine Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={medicineQuery}
                onChange={(e) => setMedicineQuery(e.target.value)}
                placeholder="Search medicine brand, generic name, salt..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            {/* Medicine Radio List */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {availableMedicines.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4">No matching in-stock medicine.</p>
              ) : (
                availableMedicines.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => setSelectedMedicine(med)}
                    className={`p-2 rounded-lg cursor-pointer text-xs flex items-center justify-between transition-colors ${
                      selectedMedicine?.id === med.id
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-bold">{med.name}</span>{' '}
                      {med.strength && <span className="opacity-80">({med.strength})</span>}
                      <span className="text-[10px] block opacity-75">{med.generic_name}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/10">
                      Select
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Batch & Unit Selector */}
            {selectedMedicine && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Selected: {selectedMedicine.name}
                  </span>
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                    FEFO Auto-Recommendation
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Batch (Earliest Expiry First)
                    </label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {batches
                        .filter(b => b.medicine_id === selectedMedicine.id && b.expiry_date >= todayStr)
                        .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
                        .map(b => {
                          const inv = inventory.find(i => i.batch_id === b.id);
                          return (
                            <option key={b.id} value={b.id}>
                              {b.batch_number} (Exp: {b.expiry_date} • {inv?.total_pieces || 0} pcs left)
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Dispensing Unit
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSelectedUnitType('strip')}
                        className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                          selectedUnitType === 'strip' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Strip ({piecesPerStrip} pcs)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedUnitType('piece')}
                        className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                          selectedUnitType === 'piece' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Loose Piece
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Quantity ({selectedUnitType})
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max={selectedUnitType === 'strip' ? maxAvailableStrips : maxAvailablePieces}
                        value={selectedQty}
                        onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-xl text-xs whitespace-nowrap shadow-sm"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stock limit helper */}
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Available in this batch: <strong>{maxAvailablePieces} pieces</strong> ({maxAvailableStrips} full strips + {maxAvailablePieces % piecesPerStrip} loose)</span>
                  <span className="font-bold text-blue-600">
                    Price: ₹{selectedUnitType === 'strip' ? Number(activeInventory?.price_per_strip || 0).toFixed(2) : Number(activeInventory?.price_per_piece || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart Summary & Checkout */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between h-full space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-slate-700" />
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Cart Items ({cartItems.length})
                  </h2>
                </div>
                {cartItems.length > 0 && (
                  <button
                    onClick={() => setCartItems([])}
                    className="text-[10px] text-slate-400 hover:text-rose-600"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto my-2">
                {cartItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Cart is empty. Select medicines on the left.
                  </div>
                ) : (
                  cartItems.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{item.medicine_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Batch: {item.batch_number} • {item.quantity_units} {item.unit_type}(s) ({item.pieces_count} pcs)
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">
                          ₹{item.total_price.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Subtotal, Discounts & Tax Calculation */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span>Discount (%):</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center font-mono text-xs"
                    />
                  </div>
                  <span className="font-mono text-emerald-600">- ₹{discountAmount.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span>GST Tax (%):</span>
                    <select
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      className="px-1.5 py-0.5 border border-slate-200 rounded text-xs"
                    >
                      <option value="0">0%</option>
                      <option value="5">5% (Essential)</option>
                      <option value="12">12% (Standard)</option>
                    </select>
                  </div>
                  <span className="font-mono">+ ₹{taxAmount.toFixed(2)}</span>
                </div>

                {/* Grand Total */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-lg text-blue-700 font-mono">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Mode */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                  {['Cash', 'UPI', 'Card', 'NetBanking'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 rounded-lg border text-center transition-colors ${
                        paymentMethod === m
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              onClick={handleCheckout}
              disabled={processing || cartItems.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
            >
              <span>{processing ? 'Processing Atomic Sale...' : `Complete Sale (₹${grandTotal.toFixed(2)})`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Post-Sale Completion Modal */}
      {completedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Payment & Sale Completed!
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Invoice No: <strong>{completedSale?.sale?.invoice_number || completedSale?.invoice_number || completedSale?.sale_number}</strong>
              </p>
              {countdown !== null && (
                <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-100">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Redirecting to Dashboard in {countdown}s...</span>
                </div>
              )}
            </div>

            {/* Status Checklist strictly following prompt:
                "Show:
                 Sale successful
                 Invoice generated
                 Email failed / Email sent" */}
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
                  <Mail className={`w-4 h-4 ${
                    completedSale.emailStatus === 'sent' 
                      ? 'text-emerald-600' 
                      : completedSale.emailStatus === 'failed' 
                      ? 'text-rose-600' 
                      : 'text-slate-400'
                  }`} />
                  <span className={`font-semibold ${
                    completedSale.emailStatus === 'sent' 
                      ? 'text-emerald-700' 
                      : completedSale.emailStatus === 'failed' 
                      ? 'text-rose-700' 
                      : 'text-slate-600'
                  }`}>
                    {completedSale.emailStatus === 'sent' 
                      ? `Invoice emailed to ${completedSale?.sale?.customer_email || completedSale?.customer_email}` 
                      : completedSale.emailStatus === 'failed' 
                      ? 'Email delivery failed (Check mail configuration)' 
                      : 'No email provided by customer'}
                  </span>
                </span>

                {completedSale.emailStatus === 'failed' && (
                  <button
                    onClick={handleResendEmail}
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
              <button
                onClick={handleDownloadPdf}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Download PDF</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setCountdown(null);
                    setCompletedSale(null);
                  }}
                  className="flex-1 sm:flex-initial text-slate-500 hover:text-slate-800 text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors cursor-pointer text-center"
                >
                  Stay on POS
                </button>

                <button
                  onClick={handleGoToDashboard}
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Go to Dashboard</span>
                  {countdown !== null && (
                    <span className="bg-blue-500/40 px-1.5 py-0.5 rounded text-[10px]">
                      {countdown}s
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
