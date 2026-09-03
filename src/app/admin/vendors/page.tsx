'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  MapPin,
  UserPlus,
  KeyRound,
  CheckCircle2,
  Ban,
  Search,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface VendorItem {
  id: string;
  facilityName: string;
  addressLine: string;
  pincode: string;
  phone: string;
  status: 'active' | 'deactivated';
  createdAt: string;
}

export default function StaffVendorManagementPage() {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New Vendor Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [facilityName, setFacilityName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Password reset modal
  const [resetVendor, setResetVendor] = useState<VendorItem | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/staff/vendors');
      const data = await res.json();
      if (res.ok && data.success) {
        setVendors(data.vendors || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityName.trim() || !phone.trim() || !password.trim()) {
      setModalError('Facility Name, Phone, and Password are required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const res = await fetch('/api/staff/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityName,
          addressLine,
          pincode,
          phone,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create vendor account');
      }

      setShowAddModal(false);
      setFacilityName('');
      setAddressLine('');
      setPincode('');
      setPhone('');
      setPassword('');
      fetchVendors();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error creating vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (vendor: VendorItem) => {
    const nextStatus = vendor.status === 'active' ? 'deactivated' : 'active';
    try {
      const res = await fetch(`/api/staff/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchVendors();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetVendor || !newPassword.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/vendors/${resetVendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetVendor(null);
        setNewPassword('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      v.facilityName.toLowerCase().includes(term) ||
      v.phone.includes(term) ||
      v.pincode.includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Vendor Account Management</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Create vendor logins, manage access credentials, and activate/deactivate facilities</p>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            setModalError('');
          }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Vendor</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Facility Name, Phone, or Pincode..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Vendor List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Facility Name</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Address / Pincode</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                    <span>Loading vendor accounts...</span>
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No vendor accounts found.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span>{vendor.facilityName}</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-amber-400">{vendor.phone}</td>
                    <td className="p-4 text-slate-300">
                      {vendor.addressLine || 'N/A'} {vendor.pincode ? `(${vendor.pincode})` : ''}
                    </td>
                    <td className="p-4">
                      {vendor.status === 'active' ? (
                        <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                          <Ban className="w-3.5 h-3.5" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setResetVendor(vendor)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition cursor-pointer"
                        title="Reset Password"
                      >
                        <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                        Password
                      </button>

                      <button
                        onClick={() => handleToggleStatus(vendor)}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                          vendor.status === 'active'
                            ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        {vendor.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm text-white">Create New Vendor Account</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVendor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jaipur Warehouse / Gemstone Facility"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Address Line</label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, Industrial Area"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Pincode</label>
                <input
                  type="text"
                  placeholder="e.g. 302001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetVendor && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm text-white">Reset Password</h3>
              <button onClick={() => setResetVendor(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter a new password for facility: <strong className="text-white">{resetVendor.facilityName}</strong>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setResetVendor(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
