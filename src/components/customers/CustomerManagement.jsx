import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';

export const CustomerManagement = () => {
  const { customers, sales, getOrCreateCustomer, normalizePhone } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const filteredCustomers = customers.filter(c => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      alert('Please provide customer name and phone number.');
      return;
    }

    try {
      await getOrCreateCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        address: newAddress.trim(),
      });

      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewAddress('');
      setShowAddModal(false);
    } catch (err) {
      alert(err.message || 'Failed to save customer');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-primary font-bold">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Customer & Patient Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registered pharmacy patients with normalized phone identifiers and purchase history.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add New Customer
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, phone number, or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-medium"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Customers Found"
            description={
              searchTerm
                ? `No customers match "${searchTerm}".`
                : 'No customers recorded yet. Customers are automatically saved during POS sale checkout!'
            }
            actionLabel="Add Customer"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Customer Name</th>
                  <th className="py-3 px-4 font-semibold">Contact Phone</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Address</th>
                  <th className="py-3 px-4 font-semibold text-center">Registration Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">
                      {cust.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {cust.phone}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {cust.email || <span className="text-slate-400 italic">N/A</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs">
                      {cust.address || <span className="text-slate-400 italic">N/A</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500">
                      {cust.created_at ? new Date(cust.created_at).toLocaleDateString('en-IN') : 'Active'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Customer"
          subtitle="Patient records are securely linked with POS invoices."
        >
          <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sumanth Reddy"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile Phone (10 digits) *</label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="patient@gmail.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Physical Address</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Residential street, apartment, locality"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
              >
                Save Patient
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
