import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { StoreMember, UserRole } from '../types';
import { addStoreMember, removeStoreMember, updateStoreMemberRole } from '../lib/db';
import { formatDate } from '../lib/utils';
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Shield, 
  X, 
  AlertCircle, 
  Check, 
  KeyRound,
  Users
} from 'lucide-react';

export const StaffView: React.FC = () => {
  const { currentStore, members, currentMemberRole, refreshStoreData } = useStore();
  const { user } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('cashier');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canManageStaff = currentMemberRole === 'owner' || currentMemberRole === 'admin';

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !newStaffEmail.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      await addStoreMember(currentStore.id, newStaffEmail.trim(), newStaffRole);
      setIsAddModalOpen(false);
      setNewStaffEmail('');
      await refreshStoreData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add staff member. Make sure they have registered an account.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: UserRole) => {
    if (!canManageStaff) return;
    try {
      await updateStoreMemberRole(memberId, role);
      await refreshStoreData();
    } catch (err: any) {
      alert(`Could not update staff role: ${err?.message}`);
    }
  };

  const handleRemoveMember = async (memberId: string, email?: string) => {
    if (!canManageStaff) return;
    if (!confirm(`Are you sure you want to revoke store access for ${email || 'this staff member'}?`)) return;

    try {
      await removeStoreMember(memberId);
      await refreshStoreData();
    } catch (err: any) {
      alert(`Could not remove staff member: ${err?.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff & Permissions</h1>
          <p className="text-sm text-slate-500">
            Manage authorized team members and role-based access control for {currentStore?.name}
          </p>
        </div>

        {canManageStaff && (
          <button
            type="button"
            onClick={() => { setIsAddModalOpen(true); setErrorMsg(null); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Staff Member</span>
          </button>
        )}
      </div>

      {/* Permissions Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { role: 'Owner', desc: 'Complete store governance, staff hiring, reports, and financial controls' },
          { role: 'Admin', desc: 'Catalogue management, inventory stock, staff administration, and ledger audits' },
          { role: 'Manager', desc: 'Product pricing, stock adjustments, vendor orders, and sales reporting' },
          { role: 'Cashier', desc: 'Point-of-sale checkout, customer lookups, and receipt printing terminal' },
        ].map((item) => (
          <div key={item.role} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>{item.role}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Team Member</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Assigned Role</th>
                <th className="px-5 py-3">Added Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No staff members found</p>
                  </td>
                </tr>
              ) : (
                members.map((m: StoreMember) => {
                  const isCurrent = m.user_id === user?.id;
                  const isOwner = m.role === 'owner';
                  const displayName = m.user_name || (m as any).full_name || 'Staff User';
                  const displayEmail = m.user_email || (m as any).email || 'N/A';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {(displayName || displayEmail)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {displayName}
                              {isCurrent && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                        {displayEmail}
                      </td>
                      <td className="px-5 py-3.5">
                        {canManageStaff && !isOwner ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                            className="text-xs font-semibold px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 capitalize"
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="cashier">Cashier</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            isOwner 
                              ? 'bg-purple-100 text-purple-800' 
                              : m.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {m.role}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {canManageStaff && !isOwner && !isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id, displayEmail)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Remove staff access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add Staff Member</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddStaff} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  User Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="cashier@store.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  The user must have an existing ALTECH StockWise registered account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Store Role *
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 capitalize"
                >
                  <option value="admin">Admin (All business operations except store ownership)</option>
                  <option value="manager">Manager (Inventory, catalogue, and view sales)</option>
                  <option value="cashier">Cashier (POS register sales and customer lookup only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
