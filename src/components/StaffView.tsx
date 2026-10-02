import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StoreMember, StaffInvitation, StaffActivity, InvitationDeliveryMethod } from '../types';
import { 
  ALL_PERMISSIONS, 
  PERMISSION_GROUPS, 
  ROLE_TEMPLATES, 
  formatRoleName, 
  PermissionItem 
} from '../lib/permissions';
import { formatDate } from '../lib/utils';
import { 
  validateAndFormatWhatsAppPhone, 
  buildWhatsAppInviteMessage, 
  buildWhatsAppLinks, 
  openWhatsAppChat 
} from '../lib/whatsapp';
import { WhatsAppIcon } from './WhatsAppIcon';
import { ExpandableSearch } from './ExpandableSearch';
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Shield, 
  X, 
  AlertCircle, 
  Check, 
  Users, 
  Eye, 
  Mail, 
  Phone, 
  Lock, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  Copy, 
  ExternalLink, 
  Send, 
  Calendar, 
  AlertTriangle, 
  FileText, 
  Activity, 
  Settings2, 
  ChevronDown, 
  ChevronRight,
  Smartphone,
  Sparkles,
  Link as LinkIcon,
  MessageCircle,
  Share2,
  Globe
} from 'lucide-react';

interface StaffViewProps {
  onOpenInvitationToken?: (token: string) => void;
}

export const StaffView: React.FC<StaffViewProps> = ({ onOpenInvitationToken }) => {
  const { 
    currentStore, 
    members, 
    staffInvitations, 
    staffActivity, 
    isStoreOwner, 
    hasPermission, 
    inviteStaff, 
    resendInvite, 
    cancelInvite, 
    updateStaffPermissions, 
    suspendStaff, 
    reactivateStaff, 
    removeStaff,
    refreshStoreData 
  } = useStore();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Active top tab: directory vs activity log
  const [activeTab, setActiveTab] = useState<'roster' | 'activity'>('roster');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Staff Multi-Step Wizard Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState<'details' | 'permissions' | 'preview'>('details');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffDeliveryMethod, setNewStaffDeliveryMethod] = useState<InvitationDeliveryMethod>('whatsapp');
  const [newStaffRole, setNewStaffRole] = useState<string>('cashier');
  const [newStaffNotes, setNewStaffNotes] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    ROLE_TEMPLATES.cashier.permissions
  );
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Phone number validation for WhatsApp
  const phoneValidation = useMemo(() => {
    return validateAndFormatWhatsAppPhone(newStaffPhone);
  }, [newStaffPhone]);

  // Success Confirmation Dialog
  const [invitationSuccess, setInvitationSuccess] = useState<{
    member: StoreMember;
    invitation: StaffInvitation;
    accountCreated?: boolean;
    deliveryMethod?: InvitationDeliveryMethod;
    inviteUrl?: string;
    emailSent?: boolean;
    emailError?: string;
    whatsappUrl?: string;
    whatsappMessage?: string;
    whatsappOpened?: boolean;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsAppMsg, setCopiedWhatsAppMsg] = useState(false);

  // Resend Staff Invitation Modal
  const [resendingInv, setResendingInv] = useState<StaffInvitation | null>(null);
  const [resendDeliveryMethod, setResendDeliveryMethod] = useState<InvitationDeliveryMethod>('whatsapp');
  const [resendPhone, setResendPhone] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendingLoading, setResendingLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const resendPhoneValidation = useMemo(() => {
    return validateAndFormatWhatsAppPhone(resendPhone);
  }, [resendPhone]);

  // Email Preview Modal
  const [previewEmailInv, setPreviewEmailInv] = useState<StaffInvitation | null>(null);

  // View / Edit Staff Details Drawer / Modal
  const [viewingMember, setViewingMember] = useState<StoreMember | null>(null);
  const [editingPermissionsMember, setEditingPermissionsMember] = useState<StoreMember | null>(null);
  const [editRole, setEditRole] = useState<string>('cashier');
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [updatingPermsLoading, setUpdatingPermsLoading] = useState(false);

  // Suspend / Remove Confirmation Modals
  const [suspendingMember, setSuspendingMember] = useState<StoreMember | null>(null);
  const [removingMember, setRemovingMember] = useState<StoreMember | null>(null);

  const canManageStaff = isStoreOwner || hasPermission('staff.view');
  const canCreateStaff = isStoreOwner || hasPermission('staff.create');
  const canEditStaff = isStoreOwner || hasPermission('staff.edit');
  const canSuspendStaff = isStoreOwner || hasPermission('staff.suspend');
  const canRemoveStaff = isStoreOwner || hasPermission('staff.remove');
  const canChangePermissions = isStoreOwner || hasPermission('staff.permissions');

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Exclude soft-removed
      if (m.status === 'removed') return false;

      // Status filter
      if (statusFilter !== 'all' && m.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (m.user_name || '').toLowerCase();
        const email = (m.user_email || '').toLowerCase();
        const role = (m.role || '').toLowerCase();
        const phone = (m.phone || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !role.includes(q) && !phone.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [members, statusFilter, searchQuery]);

  // Handle Role Template selection in Add modal
  const handleSelectRoleTemplate = (roleKey: string) => {
    setNewStaffRole(roleKey);
    const template = ROLE_TEMPLATES[roleKey];
    if (template) {
      setSelectedPermissions([...template.permissions]);
    }
  };

  // Toggle single permission
  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  // Toggle all permissions in a category
  const handleToggleCategory = (perms: PermissionItem[]) => {
    const allSelected = perms.every((p) => selectedPermissions.includes(p.id));
    if (allSelected) {
      const idsToRemove = perms.map((p) => p.id);
      setSelectedPermissions((prev) => prev.filter((id) => !idsToRemove.includes(id)));
    } else {
      const idsToAdd = perms.map((p) => p.id);
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    }
  };

  // Open Create Staff Wizard
  const handleOpenAddWizard = () => {
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPhone('');
    setNewStaffDeliveryMethod('whatsapp');
    setNewStaffRole('cashier');
    setNewStaffNotes('');
    setSelectedPermissions([...ROLE_TEMPLATES.cashier.permissions]);
    setAddStep('details');
    setCreateError(null);
    setIsAddModalOpen(true);
  };

  // Submit Create Staff & Send Invitation
  const handleCreateStaffSubmit = async () => {
    if (!newStaffName.trim()) {
      setCreateError('Staff full name is required.');
      return;
    }

    if (newStaffDeliveryMethod === 'whatsapp') {
      if (!newStaffPhone.trim()) {
        setCreateError('WhatsApp phone number is required.');
        return;
      }
      if (!phoneValidation.valid) {
        setCreateError(phoneValidation.error || 'Please enter a valid international WhatsApp phone number.');
        return;
      }
    } else if (newStaffDeliveryMethod === 'email') {
      if (!newStaffEmail.trim() || !newStaffEmail.includes('@')) {
        setCreateError('A valid email address is required.');
        return;
      }
    }

    setCreatingLoading(true);
    setCreateError(null);

    try {
      const result = await inviteStaff({
        name: newStaffName.trim(),
        email: newStaffEmail.trim() || undefined,
        phone: newStaffDeliveryMethod === 'whatsapp' 
          ? phoneValidation.e164WithPlus 
          : newStaffPhone.trim() || undefined,
        role: newStaffRole,
        permissions: selectedPermissions,
        notes: newStaffNotes.trim() || undefined,
        deliveryMethod: newStaffDeliveryMethod,
      });

      setIsAddModalOpen(false);
      setInvitationSuccess(result);

      if (newStaffDeliveryMethod === 'whatsapp') {
        showToast('✓ Staff created & WhatsApp DM opened with pre-filled invitation', 'success');
      } else if (newStaffDeliveryMethod === 'email') {
        if (result.emailSent) {
          showToast(`✓ Staff member created & email invitation dispatched via SendLib`, 'success');
        } else {
          showToast(
            `Staff account created! (SendLib status: ${result.emailError || 'pending delivery'}). You can copy the invite link below.`,
            'info'
          );
        }
      } else if (newStaffDeliveryMethod === 'copy_link') {
        showToast('✓ Staff created & invitation link copied to clipboard!', 'success');
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create staff member and send invitation.');
    } finally {
      setCreatingLoading(false);
    }
  };

  // Open Resend Invitation Dialog
  const handleOpenResendModal = (inv: StaffInvitation) => {
    setResendingInv(inv);
    setResendDeliveryMethod(inv.delivery_method || (inv.phone ? 'whatsapp' : 'email'));
    setResendPhone(inv.phone || '');
    setResendEmail(inv.email || '');
    setResendError(null);
  };

  // Execute Resend Staff Invitation
  const handleExecuteResend = async () => {
    if (!resendingInv) return;

    if (resendDeliveryMethod === 'whatsapp') {
      if (!resendPhone.trim()) {
        setResendError('WhatsApp phone number is required.');
        return;
      }
      if (!resendPhoneValidation.valid) {
        setResendError(resendPhoneValidation.error || 'Please enter a valid international WhatsApp phone number.');
        return;
      }
    } else if (resendDeliveryMethod === 'email') {
      if (!resendEmail.trim() || !resendEmail.includes('@')) {
        setResendError('A valid email address is required.');
        return;
      }
    }

    setResendingLoading(true);
    setResendError(null);

    try {
      const updated = await resendInvite(resendingInv.id, {
        deliveryMethod: resendDeliveryMethod,
        phone: resendDeliveryMethod === 'whatsapp' ? resendPhoneValidation.e164WithPlus : resendPhone.trim() || undefined,
        email: resendEmail.trim() || undefined,
      });

      setResendingInv(null);

      if (resendDeliveryMethod === 'whatsapp') {
        showToast(`✓ Staff invitation renewed & opened in WhatsApp for ${updated.name}`, 'success');
      } else if (resendDeliveryMethod === 'email') {
        if (updated.emailSent) {
          showToast(`✓ Staff invitation email resent via SendLib to ${updated.email}`, 'success');
        } else {
          showToast(
            updated.emailError
              ? `Invitation link renewed. SendLib notice: ${updated.emailError}`
              : '✓ Staff invitation link renewed',
            'info'
          );
        }
      } else if (resendDeliveryMethod === 'copy_link') {
        showToast('✓ Renewed invitation link copied to clipboard!', 'success');
      }
    } catch (err: any) {
      setResendError(err?.message || 'Failed to resend invitation.');
    } finally {
      setResendingLoading(false);
    }
  };

  // Cancel invitation handler
  const handleCancelInvite = async (invitationId: string) => {
    try {
      await cancelInvite(invitationId);
      showToast('✓ Invitation cancelled', 'info');
    } catch (err: any) {
      showToast(err?.message ? `Could not cancel invitation: ${err.message}` : 'Could not cancel invitation. Please try again.', 'error');
    }
  };

  // Open Edit Permissions Drawer
  const handleOpenEditPermissions = (m: StoreMember) => {
    setEditingPermissionsMember(m);
    setEditRole(m.role as string);
    setEditPerms([...(m.permissions || ROLE_TEMPLATES[m.role as string]?.permissions || [])]);
  };

  // Save Edited Permissions
  const handleSavePermissions = async () => {
    if (!editingPermissionsMember) return;
    setUpdatingPermsLoading(true);
    try {
      await updateStaffPermissions(editingPermissionsMember.id, editRole, editPerms);
      setEditingPermissionsMember(null);
      if (viewingMember?.id === editingPermissionsMember.id) {
        setViewingMember({
          ...viewingMember,
          role: editRole,
          permissions: editPerms,
        });
      }
      showToast(`✓ Permissions updated for ${editingPermissionsMember.user_name || 'staff member'}`, 'success');
    } catch (err: any) {
      showToast(err?.message ? `Failed to update permissions: ${err.message}` : 'Failed to update permissions. Please try again.', 'error');
    } finally {
      setUpdatingPermsLoading(false);
    }
  };

  // Suspend action
  const handleConfirmSuspend = async () => {
    if (!suspendingMember) return;
    try {
      await suspendStaff(suspendingMember.id);
      showToast(`✓ Staff member suspended`, 'info');
      setSuspendingMember(null);
      if (viewingMember?.id === suspendingMember.id) {
        setViewingMember({ ...viewingMember, status: 'suspended' });
      }
    } catch (err: any) {
      showToast(err?.message ? `Could not suspend staff member: ${err.message}` : 'Could not suspend staff member. Please try again.', 'error');
    }
  };

  // Reactivate action
  const handleReactivate = async (memberId: string) => {
    try {
      await reactivateStaff(memberId);
      showToast(`✓ Staff member reactivated`, 'success');
      if (viewingMember?.id === memberId) {
        setViewingMember({ ...viewingMember, status: 'active' });
      }
    } catch (err: any) {
      showToast(err?.message ? `Could not reactivate staff member: ${err.message}` : 'Could not reactivate staff member. Please try again.', 'error');
    }
  };

  // Remove staff action
  const handleConfirmRemove = async () => {
    if (!removingMember) return;
    try {
      await removeStaff(removingMember.id);
      showToast(`✓ Staff member removed`, 'info');
      setRemovingMember(null);
      if (viewingMember?.id === removingMember.id) {
        setViewingMember(null);
      }
    } catch (err: any) {
      showToast(err?.message ? `Could not remove staff member: ${err.message}` : 'Could not remove staff member. Please try again.', 'error');
    }
  };

  // Helper: copy invitation link to clipboard
  const handleCopyLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/invite/${token}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyWhatsAppMessage = (msg: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      setCopiedWhatsAppMsg(true);
      showToast('✓ WhatsApp message copied to clipboard!', 'info');
      setTimeout(() => setCopiedWhatsAppMsg(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Role &amp; Permissions
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage staff members, granular permission toggles, and invitation access for {currentStore?.name}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Expandable Search Button */}
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search staff by name, email, or role..."
          />

          {canCreateStaff && (
            <button
              type="button"
              id="btn-add-staff"
              onClick={handleOpenAddWizard}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-xs transition shrink-0 cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Staff</span>
            </button>
          )}
        </div>
      </div>

      {/* Roster vs Activity Tabs & Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Top-Level Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'roster'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Directory ({members.filter((m) => m.status !== 'removed').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'activity'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Staff Activity Log ({staffActivity.length})</span>
          </button>
        </div>

        {/* Sub-Filters for Roster */}
        {activeTab === 'roster' && (
          <div className="flex items-center gap-1 self-start sm:self-auto overflow-x-auto">
            {(['all', 'active', 'pending', 'suspended'] as const).map((st) => {
              const count = members.filter((m) => st === 'all' ? m.status !== 'removed' : m.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {st === 'pending' ? 'Pending Invite' : st} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: STAFF ROSTER LIST                                 */}
      {/* ======================================================== */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredMembers.length === 0 ? (
            <div className="px-5 py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700">No staff members found</p>
              <p className="text-xs text-slate-400 mt-1">
                {statusFilter !== 'all' 
                  ? `No staff currently match the status "${statusFilter}".` 
                  : 'Tap "+ Add Staff" to invite employees, cashiers, and managers to your store.'}
              </p>
            </div>
          ) : (
            filteredMembers.map((m: StoreMember) => {
              const isCurrent = m.user_id === user?.id;
              const isOwner = m.role === 'owner' || m.store_id === currentStore?.id && currentStore?.owner_id === m.user_id;
              const displayName = m.user_name || m.user_email?.split('@')[0] || 'Staff User';
              const displayEmail = m.user_email || (m.phone ? `WhatsApp: ${m.phone}` : 'No email recorded');
              const permsCount = m.permissions ? m.permissions.length : (ROLE_TEMPLATES[m.role as string]?.permissions?.length || 0);

              // Associated pending invitation if any
              const pendingInv = staffInvitations.find(
                (i) => i.status === 'pending' && (
                  i.token === m.invitation_token || 
                  (i.email && m.user_email && i.email.toLowerCase() === m.user_email.toLowerCase()) ||
                  (i.phone && m.phone && i.phone === m.phone) ||
                  i.staff_id === m.id
                )
              );

              return (
                <div
                  key={m.id}
                  onClick={() => setViewingMember(m)}
                  className={`p-4 sm:px-6 hover:bg-slate-50/80 transition cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group ${
                    m.status === 'suspended' ? 'bg-red-50/20' : m.status === 'pending' ? 'bg-amber-50/20' : ''
                  }`}
                >
                  {/* Left: Staff Identity */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-xs ${
                      isOwner 
                        ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                        : m.status === 'suspended'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : m.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {displayName[0].toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition text-sm sm:text-base">
                          {displayName}
                        </h3>

                        {isCurrent && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                            You
                          </span>
                        )}

                        {/* Role Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                          isOwner 
                            ? 'bg-purple-100 text-purple-800' 
                            : m.role === 'manager'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.role === 'sales_staff'
                            ? 'bg-blue-100 text-blue-800'
                            : m.role === 'inventory_staff'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {formatRoleName(m.role)}
                        </span>

                        {/* Status Badge */}
                        {m.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Invitation</span>
                          </span>
                        ) : m.status === 'suspended' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span>Suspended</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </span>
                        )}
                      </div>

                      {/* Contact & Date Metadata */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="font-mono text-slate-700">{displayEmail}</span>
                        {m.phone && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span>{m.phone}</span>
                          </>
                        )}
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span>Added {formatDate(m.created_at)}</span>
                        {m.last_active && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="text-slate-400">Active {formatDate(m.last_active)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Permissions count & Quick Actions */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="text-[11px] text-slate-500">
                        Permissions Granted:
                      </div>
                      <div className="font-bold text-slate-800 mt-0.5 font-mono">
                        {isOwner ? 'Full Ownership (All)' : `${permsCount} Features Allowed`}
                      </div>
                    </div>

                    <div 
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Actions for Pending Invitations */}
                      {m.status === 'pending' && pendingInv && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(pendingInv.token)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                            title="Copy invitation link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenResendModal(pendingInv)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                            title="Resend invitation via WhatsApp, Email, or Link"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Resend</span>
                          </button>

                          {onOpenInvitationToken && (
                            <button
                              type="button"
                              onClick={() => onOpenInvitationToken(pendingInv.token)}
                              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                              title="Accept invitation as staff"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Invite</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Actions for Active / Suspended Staff */}
                      {canChangePermissions && !isOwner && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditPermissions(m)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                          title="Edit staff role and granular permissions"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>Permissions</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setViewingMember(m)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Suspend / Reactivate */}
                      {canSuspendStaff && !isOwner && !isCurrent && (
                        m.status === 'suspended' ? (
                          <button
                            type="button"
                            onClick={() => handleReactivate(m.id)}
                            className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            title="Reactivate staff access"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSuspendingMember(m)}
                            className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Suspend staff access"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )
                      )}

                      {/* Remove Staff */}
                      {canRemoveStaff && !isOwner && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => setRemovingMember(m)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Remove staff member"
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
      )}

      {/* ======================================================== */}
      {/* TAB 2: STAFF ACTIVITY AUDIT LOG                          */}
      {/* ======================================================== */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Staff Audit &amp; Activity Stream</h3>
              <p className="text-xs text-slate-500">Permanent record of important actions performed by staff across this store</p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-400">
              {staffActivity.length} events logged
            </span>
          </div>

          {staffActivity.length === 0 ? (
            <div className="px-5 py-16 text-center text-slate-400">
              <Activity className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700">No staff activity recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                When staff members execute sales, record repayments, or modify inventory, events audit here.
              </p>
            </div>
          ) : (
            staffActivity.map((act) => (
              <div key={act.id} className="p-4 sm:px-6 hover:bg-slate-50/70 transition flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {act.action}
                    </div>
                    {act.details && (
                      <p className="text-slate-600 mt-0.5">{act.details}</p>
                    )}
                    <div className="text-[11px] text-slate-400 mt-1">
                      Staff: <strong className="text-slate-700">{act.staff_name}</strong>
                      {act.staff_email && <span> &bull; {act.staff_email}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right text-slate-400 font-mono text-[11px] shrink-0 whitespace-nowrap">
                  {formatDate(act.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MULTI-STEP ADD STAFF & INVITATION WIZARD                 */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-100 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Invite New Staff Member</h3>
                  <p className="text-xs text-slate-500">Configure role templates and granular permission boundaries</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Header */}
            <div className="grid grid-cols-3 gap-2 my-4">
              {[
                { step: 'details', label: '1. Staff & Delivery' },
                { step: 'permissions', label: '2. Set Permissions' },
                { step: 'preview', label: '3. Review & Send' },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  disabled={
                    s.step === 'permissions' && (
                      !newStaffName.trim() ||
                      (newStaffDeliveryMethod === 'whatsapp' && (!newStaffPhone.trim() || !phoneValidation.valid)) ||
                      (newStaffDeliveryMethod === 'email' && (!newStaffEmail.trim() || !newStaffEmail.includes('@')))
                    )
                  }
                  onClick={() => setAddStep(s.step as any)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition border cursor-pointer ${
                    addStep === s.step
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {/* STEP 1: Staff Details, Delivery Method & Role Selection */}
            {addStep === 'details' && (
              <div className="space-y-4">
                {/* 1. Full Name & Role Template */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Staff Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. David"
                      value={newStaffName}
                      onChange={(e) => {
                        setNewStaffName(e.target.value);
                        if (createError) setCreateError(null);
                      }}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Store Assignment
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentStore?.name || 'Active Store'}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                {/* 2. INVITATION FLOW: How would you like to send the invitation? */}
                <div className="pt-1">
                  <div className="mb-2">
                    <label className="block text-xs font-bold text-slate-900 tracking-tight">
                      How would you like to send the invitation? *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Choose your preferred delivery channel for the secure invitation link
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Option 1: WhatsApp */}
                    <div
                      onClick={() => {
                        setNewStaffDeliveryMethod('whatsapp');
                        if (createError) setCreateError(null);
                      }}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${
                        newStaffDeliveryMethod === 'whatsapp'
                          ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                          </div>
                          {newStaffDeliveryMethod === 'whatsapp' ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-300" />
                          )}
                        </div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm mt-2.5">
                          Send via WhatsApp
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Open the staff member&apos;s WhatsApp chat with the invitation ready to send.
                        </p>
                      </div>
                    </div>

                    {/* Option 2: Email */}
                    <div
                      onClick={() => {
                        setNewStaffDeliveryMethod('email');
                        if (createError) setCreateError(null);
                      }}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${
                        newStaffDeliveryMethod === 'email'
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                            <Mail className="w-4 h-4 text-blue-600" />
                          </div>
                          {newStaffDeliveryMethod === 'email' ? (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-300" />
                          )}
                        </div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm mt-2.5">
                          Send via Email
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Send the invitation directly to the staff member&apos;s email.
                        </p>
                      </div>
                    </div>

                    {/* Option 3: Copy Link */}
                    <div
                      onClick={() => {
                        setNewStaffDeliveryMethod('copy_link');
                        if (createError) setCreateError(null);
                      }}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${
                        newStaffDeliveryMethod === 'copy_link'
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <LinkIcon className="w-4 h-4 text-indigo-600" />
                          </div>
                          {newStaffDeliveryMethod === 'copy_link' ? (
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-300" />
                          )}
                        </div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm mt-2.5">
                          Copy Invitation Link
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Copy the invitation link and share it anywhere.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. DYNAMIC CONTACT FIELDS BASED ON DELIVERY METHOD */}
                <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                  {newStaffDeliveryMethod === 'whatsapp' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1 flex items-center justify-between">
                          <span>WhatsApp Phone Number *</span>
                          <span className="text-[11px] font-normal text-slate-500">Include country code</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            placeholder="+234 800 000 0000 or +1 555 123 4567"
                            value={newStaffPhone}
                            onChange={(e) => {
                              setNewStaffPhone(e.target.value);
                              if (createError) setCreateError(null);
                            }}
                            className={`w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border rounded-xl font-mono focus:outline-none ${
                              newStaffPhone.trim() && !phoneValidation.valid
                                ? 'border-amber-300 focus:border-amber-500'
                                : 'border-slate-200 focus:border-emerald-500'
                            }`}
                          />
                        </div>

                        {/* Real-time Phone Validation Indicator */}
                        {newStaffPhone.trim() && (
                          <div className="mt-1.5 text-[11px] flex items-center gap-1.5">
                            {phoneValidation.valid ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>International E.164: {phoneValidation.formattedDisplay}</span>
                              </span>
                            ) : (
                              <span className="text-amber-800 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{phoneValidation.error}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Email Address (Optional)
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. employee@company.com"
                          value={newStaffEmail}
                          onChange={(e) => setNewStaffEmail(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {newStaffDeliveryMethod === 'email' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-900 mb-1">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            placeholder="employee@company.com"
                            value={newStaffEmail}
                            onChange={(e) => {
                              setNewStaffEmail(e.target.value);
                              if (createError) setCreateError(null);
                            }}
                            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Phone Number (Optional)
                        </label>
                        <input
                          type="tel"
                          placeholder="+234 800 000 0000"
                          value={newStaffPhone}
                          onChange={(e) => setNewStaffPhone(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {newStaffDeliveryMethod === 'copy_link' && (
                    <div className="space-y-3">
                      <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 flex items-start gap-2">
                        <LinkIcon className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Direct Link Sharing Mode</span>
                          <p className="text-[11px] text-indigo-800/90 mt-0.5">
                            A unique, secure invitation token will be created and copied to your clipboard. You can paste and share it anywhere (SMS, WhatsApp, Slack, etc.).
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Email (Optional)
                          </label>
                          <input
                            type="email"
                            placeholder="employee@company.com"
                            value={newStaffEmail}
                            onChange={(e) => setNewStaffEmail(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Phone (Optional)
                          </label>
                          <input
                            type="tel"
                            placeholder="+234 800 000 0000"
                            value={newStaffPhone}
                            onChange={(e) => setNewStaffPhone(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Role Template Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Staff Role:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(ROLE_TEMPLATES).map(([key, tpl]) => {
                      const isSelected = newStaffRole === key;
                      return (
                        <div
                          key={key}
                          onClick={() => handleSelectRoleTemplate(key)}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs sm:text-sm text-slate-900">{tpl.name}</span>
                            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.2 rounded-full">
                              {tpl.permissions.length} perms
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{tpl.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internal Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Work shifts, authorized register stations, contact details..."
                    value={newStaffNotes}
                    onChange={(e) => setNewStaffNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      !newStaffName.trim() ||
                      (newStaffDeliveryMethod === 'whatsapp' && (!newStaffPhone.trim() || !phoneValidation.valid)) ||
                      (newStaffDeliveryMethod === 'email' && (!newStaffEmail.trim() || !newStaffEmail.includes('@')))
                    }
                    onClick={() => setAddStep('permissions')}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Configure Permissions</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Granular Permissions Checklist */}
            {addStep === 'permissions' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Active Template: {ROLE_TEMPLATES[newStaffRole]?.name}</span>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      You can customize every individual permission below. Selected: <strong>{selectedPermissions.length}</strong> of {ALL_PERMISSIONS.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPermissions(ALL_PERMISSIONS.map((p) => p.id))}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                  >
                    Select All
                  </button>
                </div>

                {/* Grouped Permissions */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {PERMISSION_GROUPS.map((group) => {
                    const allSelected = group.permissions.every((p) => selectedPermissions.includes(p.id));
                    const someSelected = group.permissions.some((p) => selectedPermissions.includes(p.id));

                    return (
                      <div key={group.category} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{group.category}</span>
                            <p className="text-[11px] text-slate-500">{group.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(group.permissions)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            {allSelected ? 'Deselect Group' : 'Select Group'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">
                          {group.permissions.map((p) => {
                            const isChecked = selectedPermissions.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2 p-2 rounded-xl border transition cursor-pointer ${
                                  isChecked
                                    ? 'bg-blue-50/60 border-blue-200 text-slate-900'
                                    : 'bg-white border-slate-200 text-slate-600'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(p.id)}
                                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-xs">{p.label}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{p.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAddStep('details')}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Back to Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddStep('preview')}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Preview Access Summary</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Permission Preview (Section 5) */}
            {addStep === 'preview' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold">{newStaffName}</h4>
                      <p className="text-xs text-slate-400 font-mono">
                        {newStaffDeliveryMethod === 'whatsapp'
                          ? `WhatsApp: ${phoneValidation.formattedDisplay || newStaffPhone}`
                          : newStaffDeliveryMethod === 'email'
                          ? `Email: ${newStaffEmail}`
                          : 'Direct Link Delivery'}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                      {formatRoleName(newStaffRole)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    Assigned Store: <strong className="text-white">{currentStore?.name}</strong>
                  </div>
                </div>

                {/* Delivery Method Summary Banner */}
                {newStaffDeliveryMethod === 'whatsapp' && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <span className="font-bold text-emerald-900">Delivery: Send via WhatsApp</span>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Opens WhatsApp DM to <strong>{phoneValidation.formattedDisplay}</strong> with pre-filled invitation message
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 shrink-0">
                      WhatsApp
                    </span>
                  </div>
                )}

                {newStaffDeliveryMethod === 'email' && (
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-bold text-blue-900">Delivery: Send via Email</span>
                        <p className="text-[11px] text-blue-800 mt-0.5">
                          Sends invitation email directly to <strong>{newStaffEmail}</strong> via SendLib
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-200 text-blue-900 shrink-0">
                      Email
                    </span>
                  </div>
                )}

                {newStaffDeliveryMethod === 'copy_link' && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <LinkIcon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <span className="font-bold text-indigo-900">Delivery: Copy Invitation Link</span>
                        <p className="text-[11px] text-indigo-800 mt-0.5">
                          Secure token will be created and copied to clipboard to share anywhere
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-200 text-indigo-900 shrink-0">
                      Copy Link
                    </span>
                  </div>
                )}

                {/* Access vs Restricted Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Granted Access (✓) */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200 text-emerald-900 font-bold text-xs">
                      <span>Access Granted (✓)</span>
                      <span className="font-mono">{selectedPermissions.length}</span>
                    </div>
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                      {selectedPermissions.length === 0 ? (
                        <p className="text-slate-400 italic">No permissions selected</p>
                      ) : (
                        ALL_PERMISSIONS.filter((p) => selectedPermissions.includes(p.id)).map((p) => (
                          <div key={p.id} className="flex items-center gap-1.5 text-emerald-900 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{p.label}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Restricted Access (✕) */}
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200">
                    <div className="flex items-center justify-between pb-2 border-b border-red-200 text-red-900 font-bold text-xs">
                      <span>Restricted Features (✕)</span>
                      <span className="font-mono">{ALL_PERMISSIONS.length - selectedPermissions.length}</span>
                    </div>
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                      {ALL_PERMISSIONS.filter((p) => !selectedPermissions.includes(p.id)).map((p) => (
                        <div key={p.id} className="flex items-center gap-1.5 text-red-800">
                          <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="truncate">{p.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>{newStaffName}</strong> will only be able to access the features selected above.
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAddStep('permissions')}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Adjust Permissions
                  </button>

                  {/* Submit Button dynamically branded by Delivery Method */}
                  {newStaffDeliveryMethod === 'whatsapp' ? (
                    <button
                      type="button"
                      disabled={creatingLoading}
                      onClick={handleCreateStaffSubmit}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {creatingLoading ? (
                        <span>Preparing WhatsApp...</span>
                      ) : (
                        <>
                          <WhatsAppIcon className="w-4 h-4 text-white" />
                          <span>Send via WhatsApp</span>
                        </>
                      )}
                    </button>
                  ) : newStaffDeliveryMethod === 'email' ? (
                    <button
                      type="button"
                      disabled={creatingLoading}
                      onClick={handleCreateStaffSubmit}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl transition flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {creatingLoading ? (
                        <span>Dispatching Email...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send via Email</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={creatingLoading}
                      onClick={handleCreateStaffSubmit}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {creatingLoading ? (
                        <span>Generating Link...</span>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Invitation Link</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRMATION DIALOG (SECTION 21 & MULTI-CHANNEL DELIVERY) */}
      {/* ======================================================== */}
      {invitationSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-center animate-in zoom-in-95 duration-100 max-h-[92vh] overflow-y-auto">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
              invitationSuccess.deliveryMethod === 'whatsapp'
                ? 'bg-emerald-100 text-emerald-600'
                : invitationSuccess.deliveryMethod === 'email'
                ? invitationSuccess.emailSent ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                : 'bg-indigo-100 text-indigo-600'
            }`}>
              {invitationSuccess.deliveryMethod === 'whatsapp' ? (
                <WhatsAppIcon className="w-8 h-8 text-emerald-600" />
              ) : invitationSuccess.deliveryMethod === 'copy_link' ? (
                <LinkIcon className="w-8 h-8 text-indigo-600" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              {invitationSuccess.deliveryMethod === 'whatsapp'
                ? '✓ Staff Account Created & WhatsApp Ready'
                : invitationSuccess.deliveryMethod === 'email'
                ? invitationSuccess.emailSent ? '✓ Staff Invitation Dispatched' : '✓ Staff Account Created'
                : '✓ Staff Account Created & Link Copied'}
            </h3>
            <div className="text-base font-bold text-slate-900 mt-1">{invitationSuccess.member.user_name}</div>
            <div className="text-xs font-mono text-slate-500">
              {invitationSuccess.member.user_email || invitationSuccess.member.phone || 'Account Record'}
            </div>

            {/* Delivery Method Specific Status & Action Panel */}
            {invitationSuccess.deliveryMethod === 'whatsapp' && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">WhatsApp Invitation DM</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700">Pre-filled Message</span>
                </div>

                <p className="text-xs text-emerald-900/90 leading-relaxed">
                  The staff member&apos;s WhatsApp chat is ready with your pre-filled invitation. Tap below to open WhatsApp and press &quot;Send&quot;.
                </p>

                {/* Pre-filled Message Preview Box */}
                {invitationSuccess.whatsappMessage && (
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
                    {invitationSuccess.whatsappMessage}
                  </div>
                )}

                {/* WhatsApp Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (invitationSuccess.whatsappMessage && invitationSuccess.member.phone) {
                        const phoneVal = validateAndFormatWhatsAppPhone(invitationSuccess.member.phone);
                        openWhatsAppChat(phoneVal.cleanNumber, invitationSuccess.whatsappMessage);
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-white" />
                    <span>Open WhatsApp Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (invitationSuccess.whatsappMessage) {
                        handleCopyWhatsAppMessage(invitationSuccess.whatsappMessage);
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{copiedWhatsAppMsg ? 'Copied Message!' : 'Copy Message Text'}</span>
                  </button>
                </div>
              </div>
            )}

            {invitationSuccess.deliveryMethod === 'email' && (
              <div className="mt-4 p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-950">SendLib Delivery Status</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${invitationSuccess.emailSent ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {invitationSuccess.emailSent ? 'Delivered to SMTP' : 'Manual Link Ready'}
                  </span>
                </div>
                <p className="text-xs text-blue-900/90 leading-relaxed">
                  {invitationSuccess.emailSent
                    ? `${invitationSuccess.member.user_name} has received an invitation email sent via SendLib with instructions to join.`
                    : `Account created successfully! ${invitationSuccess.emailError ? `SendLib notice: ${invitationSuccess.emailError}. ` : ''}You can copy the invitation link below.`}
                </p>
              </div>
            )}

            {invitationSuccess.deliveryMethod === 'copy_link' && (
              <div className="mt-4 p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-950">Invitation Link Copied to Clipboard!</span>
                </div>
                <p className="text-xs text-indigo-900/90 leading-relaxed">
                  The secure invitation link has been automatically copied. You can paste and share it directly with {invitationSuccess.member.user_name} on any platform.
                </p>
              </div>
            )}

            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex justify-between">
              <span>Role: <strong className="capitalize">{formatRoleName(invitationSuccess.member.role)}</strong></span>
              <span>Store: <strong>{currentStore?.name}</strong></span>
            </div>

            {/* Quick Link Share & Copy */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-left space-y-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Invitation Web &amp; Android Deep Link:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${invitationSuccess.invitation.token}`}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(invitationSuccess.invitation.token)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* Android Deep Link notice */}
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-900 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Android App Deep Link Ready</span>
                </div>
                <span className="font-mono font-bold text-indigo-700">stockwise://invite/...</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewEmailInv(invitationSuccess.invitation)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Preview Email</span>
              </button>

              <button
                type="button"
                onClick={() => setInvitationSuccess(null)}
                className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RESEND INVITATION MODAL                                  */}
      {/* ======================================================== */}
      {resendingInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 text-slate-800 animate-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Resend Staff Invitation</h3>
                  <p className="text-xs text-slate-500">
                    Choose delivery channel to resend invitation link to {resendingInv.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResendingInv(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner if any */}
            {resendError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resendError}</span>
              </div>
            )}

            {/* Staff member summary */}
            <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm">{resendingInv.name}</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Role: <strong className="capitalize">{formatRoleName(resendingInv.role)}</strong></p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                Pending
              </span>
            </div>

            {/* Delivery Method Selector */}
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-bold text-slate-900 tracking-tight">
                How would you like to resend the invitation?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. WhatsApp */}
                <div
                  onClick={() => setResendDeliveryMethod('whatsapp')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${
                    resendDeliveryMethod === 'whatsapp'
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                    {resendDeliveryMethod === 'whatsapp' && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-slate-900 mt-2">WhatsApp</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Open chat with pre-filled message</div>
                </div>

                {/* 2. Email */}
                <div
                  onClick={() => setResendDeliveryMethod('email')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${
                    resendDeliveryMethod === 'email'
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Mail className="w-4 h-4 text-blue-600" />
                    {resendDeliveryMethod === 'email' && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-slate-900 mt-2">Email</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Send via SendLib</div>
                </div>

                {/* 3. Copy Link */}
                <div
                  onClick={() => setResendDeliveryMethod('copy_link')}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition text-left flex flex-col justify-between ${
                    resendDeliveryMethod === 'copy_link'
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <LinkIcon className="w-4 h-4 text-indigo-600" />
                    {resendDeliveryMethod === 'copy_link' && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-slate-900 mt-2">Copy Link</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Copy link to clipboard</div>
                </div>
              </div>
            </div>

            {/* Dynamic Inputs for Resending */}
            <div className="mt-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              {resendDeliveryMethod === 'whatsapp' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center justify-between">
                    <span>WhatsApp Phone Number *</span>
                    <span className="text-[11px] font-normal text-slate-500">Include country code</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="+234 800 000 0000 or +1 555 123 4567"
                      value={resendPhone}
                      onChange={(e) => setResendPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {resendPhone.trim() && (
                    <div className="mt-1 text-[11px]">
                      {resendPhoneValidation.valid ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>International: {resendPhoneValidation.formattedDisplay}</span>
                        </span>
                      ) : (
                        <span className="text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{resendPhoneValidation.error}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {resendDeliveryMethod === 'email' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Recipient Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="employee@company.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {resendDeliveryMethod === 'copy_link' && (
                <div className="text-xs text-indigo-900 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>The 7-day expiration timer will be renewed and the fresh invitation link will be copied directly to your clipboard.</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResendingInv(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              {resendDeliveryMethod === 'whatsapp' ? (
                <button
                  type="button"
                  disabled={resendingLoading || !resendPhone.trim() || !resendPhoneValidation.valid}
                  onClick={handleExecuteResend}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>{resendingLoading ? 'Opening...' : 'Resend via WhatsApp'}</span>
                </button>
              ) : resendDeliveryMethod === 'email' ? (
                <button
                  type="button"
                  disabled={resendingLoading || !resendEmail.trim() || !resendEmail.includes('@')}
                  onClick={handleExecuteResend}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{resendingLoading ? 'Dispatching...' : 'Resend via Email'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={resendingLoading}
                  onClick={handleExecuteResend}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{resendingLoading ? 'Copying...' : 'Copy Invitation Link'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* INVITATION EMAIL MOCKUP MODAL (SECTION 7)                 */}
      {/* ======================================================== */}
      {previewEmailInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Email Invitation Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEmailInv(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Envelope Container */}
            <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 text-xs">
              <div className="border-b border-slate-200 pb-3">
                <div className="text-slate-500">From: <strong>ALTECH StockWise &lt;notifications@stockwise.app&gt;</strong></div>
                <div className="text-slate-500 mt-1">To: <strong>{previewEmailInv.name} &lt;{previewEmailInv.email}&gt;</strong></div>
                <div className="font-bold text-slate-900 text-sm mt-2">
                  You&apos;ve been invited to join {previewEmailInv.store_name || currentStore?.name} on StockWise
                </div>
              </div>

              <div className="space-y-2 text-slate-700 leading-relaxed">
                <p>Hello {previewEmailInv.name},</p>
                <p>
                  You&apos;ve been appointed as a staff member at <strong>{previewEmailInv.store_name || currentStore?.name}</strong>.
                  Your store owner has invited you to use StockWise.
                </p>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 my-2">
                  <div><strong>Store:</strong> {previewEmailInv.store_name || currentStore?.name}</div>
                  <div><strong>Email:</strong> {previewEmailInv.email}</div>
                  <div><strong>Role:</strong> {formatRoleName(previewEmailInv.role)}</div>
                  <div><strong>Access:</strong> {previewEmailInv.permissions.slice(0, 4).map(p => p.split('.')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ')}...</div>
                </div>

                <p>Click below to accept your invitation and set up your StockWise account.</p>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const tok = previewEmailInv.token;
                    setPreviewEmailInv(null);
                    if (onOpenInvitationToken) {
                      onOpenInvitationToken(tok);
                    }
                  }}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Accept Invitation &amp; Open StockWise
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center pt-1">
                Link expires in 7 days &bull; Android App &amp; Web Compatible
              </p>
            </div>

            <div className="mt-4 pt-2 text-right">
              <button
                type="button"
                onClick={() => setPreviewEmailInv(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT PERMISSIONS & ROLE DRAWER / MODAL                   */}
      {/* ======================================================== */}
      {editingPermissionsMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-100 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Edit Staff Access: {editingPermissionsMember.user_name || editingPermissionsMember.user_email}
                </h3>
                <p className="text-xs text-slate-500">Adjust role templates and customize granular permissions</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPermissionsMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Role template select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change Role Template:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {Object.entries(ROLE_TEMPLATES).map(([key, tpl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setEditRole(key);
                        setEditPerms([...tpl.permissions]);
                      }}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition cursor-pointer ${
                        editRole === key
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grouped Permission Checkboxes */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {PERMISSION_GROUPS.map((group) => {
                  const allSelected = group.permissions.every((p) => editPerms.includes(p.id));
                  return (
                    <div key={group.category} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="font-bold text-slate-900">{group.category}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (allSelected) {
                              const ids = group.permissions.map((p) => p.id);
                              setEditPerms((prev) => prev.filter((id) => !ids.includes(id)));
                            } else {
                              const ids = group.permissions.map((p) => p.id);
                              setEditPerms((prev) => Array.from(new Set([...prev, ...ids])));
                            }
                          }}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {group.permissions.map((p) => {
                          const isChecked = editPerms.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                                isChecked
                                  ? 'bg-blue-50/60 border-blue-200 text-slate-900 font-medium'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setEditPerms((prev) =>
                                    prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                                  );
                                }}
                                className="mt-0.5 rounded text-blue-600"
                              />
                              <span className="truncate">{p.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500">
                  {editPerms.length} permissions enabled
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPermissionsMember(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={updatingPermsLoading}
                    onClick={handleSavePermissions}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50 cursor-pointer"
                  >
                    {updatingPermsLoading ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW MEMBER DETAILS MODAL                                */}
      {/* ======================================================== */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                  {(viewingMember.user_name || viewingMember.user_email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {viewingMember.user_name || 'Staff User'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{viewingMember.user_email}</p>
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

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Current Role:</span>
                <span className="font-bold capitalize text-slate-900">{formatRoleName(viewingMember.role)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                  viewingMember.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : viewingMember.status === 'suspended'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {viewingMember.status === 'pending' ? 'Pending Invitation' : viewingMember.status}
                </span>
              </div>
              {viewingMember.phone && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-semibold text-slate-800">{viewingMember.phone}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date Added:</span>
                <span className="font-semibold text-slate-800">{formatDate(viewingMember.created_at)}</span>
              </div>
              {viewingMember.notes && (
                <div className="py-1 border-b border-slate-100">
                  <span className="text-slate-500 block mb-0.5">Internal Notes:</span>
                  <p className="text-slate-700 italic">{viewingMember.notes}</p>
                </div>
              )}

              {/* Permissions list snapshot */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Assigned Capabilities ({viewingMember.permissions?.length || 0}):
                  </span>
                  {canChangePermissions && viewingMember.role !== 'owner' && (
                    <button
                      type="button"
                      onClick={() => {
                        const m = viewingMember;
                        setViewingMember(null);
                        handleOpenEditPermissions(m);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Modify
                    </button>
                  )}
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-36 overflow-y-auto space-y-1">
                  {(viewingMember.permissions || []).map((pid) => {
                    const p = ALL_PERMISSIONS.find((it) => it.id === pid);
                    return (
                      <div key={pid} className="flex items-center gap-1.5 text-slate-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{p?.label || pid}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              {canRemoveStaff && viewingMember.role !== 'owner' && viewingMember.user_id !== user?.id && (
                <button
                  type="button"
                  onClick={() => {
                    const m = viewingMember;
                    setViewingMember(null);
                    setRemovingMember(m);
                  }}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Remove Access
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUSPEND CONFIRMATION MODAL (SECTION 16)                  */}
      {/* ======================================================== */}
      {suspendingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-slate-800 animate-in zoom-in-95 duration-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Suspend {suspendingMember.user_name || suspendingMember.user_email}?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {suspendingMember.user_name || 'This staff member'} will no longer be able to access this store until you reactivate their account.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuspendingMember(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition cursor-pointer"
              >
                Suspend Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REMOVE CONFIRMATION MODAL (SECTION 17)                   */}
      {/* ======================================================== */}
      {removingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-slate-800 animate-in zoom-in-95 duration-100">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Remove {removingMember.user_name || removingMember.user_email}?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Removing {removingMember.user_name || 'this staff member'} revokes their store access.
            </p>
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              ✓ All historical transactions, POS sales, and inventory logs created by {removingMember.user_name || 'this user'} will remain permanently intact.
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemovingMember(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition cursor-pointer"
              >
                Remove Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
