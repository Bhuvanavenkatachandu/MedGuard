import React, { useState } from 'react';
import { usePharmacy } from '../../../shared/context/PharmacyContext';
import { 
  Truck, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  Package
} from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { Modal } from '../../../shared/components/ui/Modal';
import { EmptyState } from '../../../shared/components/ui/EmptyState';

export const SupplierManagement = () => {
  const { suppliers, batches, addSupplier } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  const filteredSuppliers = suppliers.filter(s => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q))
    );
  });

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await addSupplier({
        name: name.trim(),
        contact_person: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        gst_number: gstNumber.trim(),
      });

      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setGstNumber('');
      setShowAddModal(false);
    } catch (err) {
      alert(err.message || 'Failed to add supplier');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-primary font-bold">
              <Truck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Supplier & Distributor Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Maintain wholesale distributors, pharmaceutical representatives, and associate with inward batches.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Supplier
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
            placeholder="Search suppliers by name, representative, phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-medium"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No Suppliers Found"
            description={
              searchTerm
                ? `No suppliers match "${searchTerm}".`
                : 'No wholesale distributors registered yet. Add distributors to link with inward stock batches.'
            }
            actionLabel="Add Supplier"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Distributor Name</th>
                  <th className="py-3 px-4 font-semibold">Representative</th>
                  <th className="py-3 px-4 font-semibold">Phone Number</th>
                  <th className="py-3 px-4 font-semibold">GSTIN</th>
                  <th className="py-3 px-4 font-semibold">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((supp) => (
                  <tr key={supp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">
                      {supp.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {supp.contact_person || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {supp.phone || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {supp.gst_number || <span className="text-slate-400 italic">Unregistered</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs">
                      {supp.address || <span className="text-slate-400 italic">N/A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Supplier / Distributor"
          subtitle="Distributors can be assigned to inward stock entries."
        >
          <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / Agency Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Pharma Agencies"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Representative Name</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="e.g. 29AAAAA0000A1Z5"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Warehouse or office address"
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
                Save Supplier
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
