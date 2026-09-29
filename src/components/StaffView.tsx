import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { StoreMember, UserRole } from '../types';
import { addStoreMember, removeStoreMember, updateStoreMemberRole } from '../lib/db';
import { formatDate } from '../lib/utils';
import { ExpandableSearch } from './ExpandableSearch';
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Shield, 
  X, 
  AlertCircle, 
  Check, 
  KeyRound,
  Users,
  Eye,
  Mail,
  Search
} from 'lucide-react';

export const StaffView: React.FC = () => {
  const { currentStore, members, currentMemberRole, refreshStoreData } = useStore();
  const { user } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<StoreMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('cashier');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canManageStaff = currentMemberRole === 'owner' || currentMemberRole === 'admin';

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter((m) => {
      const name = (m.user_name || (m as any).full_name || '').toLowerCase();
      const email = (m.user_email || (m as any).email || '').toLowerCase();
      const role = (m.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [members, searchQuery]);

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

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Expandable Search Button in Top Right Corner */}
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search staff by name, email, or role..."
          />

          {canManageStaff && (
            <button
              type="button"
              onClick={() => { setIsAddModalOpen(true); setErrorMsg(null); }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-xs transition shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {searchQuery && (
        <div className="flex items-center gap-2 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl">
            <span>Searching staff: "{searchQuery}" ({filteredMembers.length} results)</span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="hover:text-blue-900 cursor-pointer ml-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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

      {/* Staff List (Replaced horizontal scrolling table with clickable list items) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="px-5 py-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No staff members found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try adjusting your search query.' : 'Invite your store clerks, cashiers, and managers above.'}
            </p>
          </div>
        ) : (
          filteredMembers.map((m: StoreMember) => {
            const isCurrent = m.user_id === user?.id;
            const isOwner = m.role === 'owner';
            const displayName = m.user_name || (m as any).full_name || 'Staff User';
            const displayEmail = m.user_email || (m as any).email || 'N/A';

            return (
              <div
                key={m.id}
                onClick={() => setViewingMember(m)}
                className="p-4 sm:px-6 hover:bg-slate-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left: Staff Member Info */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {(displayName || displayEmail)[0].toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition text-sm sm:text-base">
                        {displayName}
                      </h3>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          You
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        isOwner 
                          ? 'bg-purple-100 text-purple-800' 
                          : m.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : m.role === 'manager'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.role}
                      </span>
                    </div>

                    {/* Unboxed Metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-mono text-slate-600">{displayEmail}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>Joined {formatDate(m.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Role Change & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {canManageStaff && !isOwner && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                        className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 capitalize"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="cashier">Cashier</option>
                      </select>
                    </div>
                  )}

                  <div 
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setViewingMember(m)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="View Member Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {canManageStaff && !isOwner && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id, displayEmail)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Remove staff access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Staff Member Detail Modal */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                  {(viewingMember.user_name || (viewingMember as any).full_name || viewingMember.user_email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>{viewingMember.user_name || (viewingMember as any).full_name || 'Staff User'}</span>
                    {viewingMember.user_id === user?.id && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                        You
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{viewingMember.user_email || (viewingMember as any).email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Current Role:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  viewingMember.role === 'owner' 
                    ? 'bg-purple-100 text-purple-800' 
                    : viewingMember.role === 'admin'
                    ? 'bg-blue-100 text-blue-800'
                    : viewingMember.role === 'manager'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {viewingMember.role}
                </span>
              </div>

              <div className="py-1.5 border-b border-slate-100">
                <span className="text-slate-500 text-xs block mb-1">Role Permissions &amp; Capabilities:</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {viewingMember.role === 'owner'
                    ? 'Full ownership rights. Unrestricted access to financial settings, billing, staff invitations, and store administration.'
                    : viewingMember.role === 'admin'
                    ? 'Full administrative control. Can manage inventory, products, staff permissions, customer profiles, and analytics reports.'
                    : viewingMember.role === 'manager'
                    ? 'Operational manager. Can execute inventory adjustments, view sales history, and oversee cash registers.'
                    : 'Point of sale cashier. Limited to POS terminal, cart checkouts, and customer lookups.'}
                </p>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Member Since:</span>
                <span className="text-slate-700 font-medium">{formatDate(viewingMember.created_at)}</span>
              </div>

              {canManageStaff && viewingMember.role !== 'owner' && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Update Assigned Role:
                  </label>
                  <select
                    value={viewingMember.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      handleRoleChange(viewingMember.id, newRole);
                      setViewingMember({ ...viewingMember, role: newRole });
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 capitalize"
                  >
                    <option value="admin">Admin - Full Catalog &amp; Staff Access</option>
                    <option value="manager">Manager - Inventory Adjustments &amp; Sales</option>
                    <option value="cashier">Cashier - POS Register Sales Only</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              {canManageStaff && viewingMember.role !== 'owner' && viewingMember.user_id !== user?.id ? (
                <button
                  type="button"
                  onClick={() => {
                    const m = viewingMember;
                    setViewingMember(null);
                    handleRemoveMember(m.id, m.user_email || 'staff');
                  }}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Access</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
