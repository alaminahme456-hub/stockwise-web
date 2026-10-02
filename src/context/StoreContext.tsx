import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { 
  Store, 
  Product, 
  InventoryMovement, 
  Sale, 
  Expense, 
  Customer, 
  Supplier, 
  Category, 
  StoreSettings, 
  StoreMember, 
  Role,
  CustomerPayment,
  StaffInvitation,
  StaffActivity,
  InvitationDeliveryMethod
} from '../types';
import { 
  validateAndFormatWhatsAppPhone, 
  buildWhatsAppInviteMessage, 
  buildWhatsAppLinks, 
  openWhatsAppChat 
} from '../lib/whatsapp';
import { buildStaffInvitationUrl } from '../config/appConfig';
import { 
  fetchUserStores, 
  fetchProducts, 
  fetchInventoryMovements, 
  fetchSales, 
  fetchExpenses, 
  fetchCustomers, 
  fetchSuppliers, 
  fetchCategories, 
  fetchStoreSettings,
  fetchStoreMembers,
  fetchStoreInvitations,
  fetchStaffActivity,
  createStaffInvitation as apiCreateStaffInvitation,
  resendStaffInvitation as apiResendStaffInvitation,
  cancelStaffInvitation as apiCancelStaffInvitation,
  updateStoreMemberPermissions as apiUpdatePermissions,
  suspendStoreMember as apiSuspendMember,
  reactivateStoreMember as apiReactivateMember,
  removeStoreMember as apiRemoveMember,
  acceptStaffInvitation as apiAcceptInvitation,
  fetchCustomerPayments,
  createCustomerPayment,
  deleteCustomerPayment as apiDeleteCustomerPayment,
  createStore as apiCreateStore,
  updateStore as apiUpdateStore,
  saveStoreSettings as apiSaveSettings
} from '../lib/db';
import { supabase } from '../lib/supabase';

interface StoreContextType {
  currentStore: Store | null;
  stores: Store[];
  loading: boolean;
  loadingStores: boolean;
  loadingData: boolean;
  products: Product[];
  inventoryMovements: InventoryMovement[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
  categories: Category[];
  settings: StoreSettings | null;
  members: StoreMember[];
  staffInvitations: StaffInvitation[];
  staffActivity: StaffActivity[];
  customerPayments: CustomerPayment[];
  currentMemberRole: Role;
  currentMember: StoreMember | null;
  isStoreOwner: boolean;
  hasPermission: (permission: string) => boolean;
  setCurrentStore: (store: Store) => void;
  refreshStores: () => Promise<void>;
  refreshStoreData: () => Promise<void>;
  createNewStore: (name: string, currency?: string, details?: Partial<Store>) => Promise<Store>;
  updateCurrentStore: (updates: Partial<Store>) => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  recordCustomerPayment: (payment: Omit<CustomerPayment, 'id' | 'created_at'>) => Promise<CustomerPayment>;
  deleteCustomerPayment: (paymentId: string) => Promise<void>;
  // Staff Invitation & Permission Actions
  inviteStaff: (params: {
    name: string;
    email?: string;
    phone?: string;
    role: string;
    permissions: string[];
    notes?: string;
    deliveryMethod?: InvitationDeliveryMethod;
  }) => Promise<{
    member: StoreMember;
    invitation: StaffInvitation;
    accountCreated: boolean;
    deliveryMethod: InvitationDeliveryMethod;
    inviteUrl: string;
    emailSent?: boolean;
    emailError?: string;
    whatsappUrl?: string;
    whatsappMessage?: string;
    whatsappOpened?: boolean;
  }>;
  resendInvite: (
    invitationId: string,
    options?: {
      deliveryMethod?: InvitationDeliveryMethod;
      email?: string;
      phone?: string;
    }
  ) => Promise<
    StaffInvitation & {
      deliveryMethod: InvitationDeliveryMethod;
      inviteUrl: string;
      emailSent?: boolean;
      emailError?: string;
      whatsappUrl?: string;
      whatsappMessage?: string;
      whatsappOpened?: boolean;
    }
  >;
  cancelInvite: (invitationId: string) => Promise<void>;
  updateStaffPermissions: (memberId: string, role: string, permissions: string[]) => Promise<StoreMember>;
  suspendStaff: (memberId: string) => Promise<StoreMember>;
  reactivateStaff: (memberId: string) => Promise<StoreMember>;
  removeStaff: (memberId: string) => Promise<void>;
  acceptInvite: (token: string, userName?: string) => Promise<{ store: Store; member: StoreMember }>;
  isRealtimeConnected: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isConfigured } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Store data entities
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [staffInvitations, setStaffInvitations] = useState<StaffInvitation[]>([]);
  const [staffActivity, setStaffActivity] = useState<StaffActivity[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);

  // Check if current user is owner of the active store
  const isStoreOwner = Boolean(currentStore && user && currentStore.owner_id === user.id);

  // Current user's membership in the active store (if not the direct owner)
  const currentMember: StoreMember | null = useMemo(() => {
    if (!currentStore || !user) return null;
    if (isStoreOwner) return null;
    return (
      members.find(
        (m) =>
          m.user_id === user.id ||
          (user.email && m.user_email?.toLowerCase() === user.email.toLowerCase())
      ) || null
    );
  }, [currentStore, user, isStoreOwner, members]);

  // Current user's role in the active store
  const currentMemberRole: Role = useMemo(() => {
    if (!currentStore || !user) return 'owner';
    if (isStoreOwner) return 'owner';
    return (currentMember?.role as Role) || 'cashier';
  }, [currentStore, user, isStoreOwner, currentMember]);

  // Granular Permission Checker (backend-enforced in code)
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!currentStore || !user) return false;
      // Store Owner has unrestricted access to all store operations
      if (isStoreOwner) return true;
      if (!currentMember) return false;
      // Suspended or removed staff members are blocked from all features
      if (currentMember.status === 'suspended' || currentMember.status === 'removed') {
        return false;
      }
      // Check assigned granular permissions array
      if (Array.isArray(currentMember.permissions) && currentMember.permissions.includes(permission)) {
        return true;
      }
      // Admin role default access for standard business operations
      if (currentMember.role === 'admin' && !permission.startsWith('settings.edit')) {
        return true;
      }
      return false;
    },
    [currentStore, user, isStoreOwner, currentMember]
  );

  // 1. Fetch user's stores
  const refreshStores = useCallback(async () => {
    if (!user || !isConfigured) {
      setStores([]);
      setCurrentStoreState(null);
      setLoadingStores(false);
      return;
    }

    try {
      setLoadingStores(true);
      const userStores = await fetchUserStores(user.id);
      setStores(userStores);

      // Restore previously selected active store or select the first store
      const savedStoreId = localStorage.getItem(`stockwise_active_store_${user.id}`);
      const found = userStores.find((s) => s.id === savedStoreId);
      if (found) {
        setCurrentStoreState(found);
      } else if (userStores.length > 0) {
        setCurrentStoreState(userStores[0]);
        localStorage.setItem(`stockwise_active_store_${user.id}`, userStores[0].id);
      } else {
        setCurrentStoreState(null);
      }
    } catch (err) {
      console.error('Failed to load stores:', err);
    } finally {
      setLoadingStores(false);
    }
  }, [user, isConfigured]);

  useEffect(() => {
    refreshStores();
  }, [refreshStores]);

  // Set active store & remember choice
  const setCurrentStore = (store: Store) => {
    setCurrentStoreState(store);
    if (user) {
      localStorage.setItem(`stockwise_active_store_${user.id}`, store.id);
    }
  };

  // 2. Fetch all data for the currently selected store
  const refreshStoreData = useCallback(async () => {
    if (!currentStore || !isConfigured) {
      setProducts([]);
      setInventoryMovements([]);
      setSales([]);
      setExpenses([]);
      setCustomers([]);
      setSuppliers([]);
      setCategories([]);
      setSettings(null);
      setMembers([]);
      setStaffInvitations([]);
      setStaffActivity([]);
      setCustomerPayments([]);
      return;
    }

    setLoadingData(true);
    try {
      const [
        prods,
        movements,
        salesList,
        expList,
        custList,
        suppList,
        catList,
        storeSettings,
        storeMembers,
        invitationsList,
        activityList,
        paymentsList,
      ] = await Promise.all([
        fetchProducts(currentStore.id),
        fetchInventoryMovements(currentStore.id),
        fetchSales(currentStore.id),
        fetchExpenses(currentStore.id),
        fetchCustomers(currentStore.id),
        fetchSuppliers(currentStore.id),
        fetchCategories(currentStore.id),
        fetchStoreSettings(currentStore.id),
        fetchStoreMembers(currentStore.id),
        fetchStoreInvitations(currentStore.id),
        fetchStaffActivity(currentStore.id),
        fetchCustomerPayments(currentStore.id),
      ]);

      setProducts(prods);
      setInventoryMovements(movements);
      setSales(salesList);
      setExpenses(expList);
      setCustomers(custList);
      setSuppliers(suppList);
      setCategories(catList);
      setSettings(storeSettings);
      setMembers(storeMembers);
      setStaffInvitations(invitationsList);
      setStaffActivity(activityList);
      setCustomerPayments(paymentsList);
    } catch (err) {
      console.error('Error fetching store data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [currentStore, isConfigured]);

  useEffect(() => {
    refreshStoreData();
  }, [refreshStoreData]);

  // 3. Supabase Real-time subscriptions for cross-device live sync
  useEffect(() => {
    if (!currentStore || !isConfigured) {
      return;
    }

    const channelName = `store_realtime_${currentStore.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `store_id=eq.${currentStore.id}` },
        () => {
          fetchProducts(currentStore.id).then(setProducts).catch(console.error);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_movements', filter: `store_id=eq.${currentStore.id}` },
        () => {
          fetchInventoryMovements(currentStore.id).then(setInventoryMovements).catch(console.error);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales', filter: `store_id=eq.${currentStore.id}` },
        () => {
          fetchSales(currentStore.id).then(setSales).catch(console.error);
          fetchProducts(currentStore.id).then(setProducts).catch(console.error);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `store_id=eq.${currentStore.id}` },
        () => {
          fetchExpenses(currentStore.id).then(setExpenses).catch(console.error);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `store_id=eq.${currentStore.id}` },
        () => {
          fetchCustomers(currentStore.id).then(setCustomers).catch(console.error);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suppliers', filter: `store_id=eq.${currentStore.id}` },
        () => {
          fetchSuppliers(currentStore.id).then(setSuppliers).catch(console.error);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `store_id=eq.${currentStore.id}` },
        () => {
          fetchCategories(currentStore.id).then(setCategories).catch(console.error);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_payments', filter: `store_id=eq.${currentStore.id}` },
        () => {
          fetchCustomerPayments(currentStore.id).then(setCustomerPayments).catch(console.error);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_members', filter: `store_id=eq.${currentStore.id}` },
        () => {
          fetchStoreMembers(currentStore.id).then(setMembers).catch(console.error);
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [currentStore, isConfigured]);

  const createNewStore = async (name: string, currency: string = 'USD', details?: Partial<Store>): Promise<Store> => {
    if (!user) throw new Error('Not authenticated');
    const newStore = await apiCreateStore(user.id, name, currency, details);
    await refreshStores();
    setCurrentStore(newStore);
    return newStore;
  };

  const updateCurrentStore = async (updates: Partial<Store>) => {
    if (!currentStore) return;
    const updated = await apiUpdateStore(currentStore.id, updates);
    setCurrentStoreState(updated);
    setStores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    if (!currentStore) return;
    const updated = await apiSaveSettings(currentStore.id, newSettings);
    setSettings(updated);
  };

  const recordCustomerPayment = async (
    payment: Omit<CustomerPayment, 'id' | 'created_at'>
  ): Promise<CustomerPayment> => {
    if (!currentStore) throw new Error('No store selected');
    const created = await createCustomerPayment(currentStore.id, payment);
    setCustomerPayments((prev) => [created, ...prev]);
    return created;
  };

  const deleteCustomerPayment = async (paymentId: string): Promise<void> => {
    if (!currentStore) throw new Error('No store selected');
    await apiDeleteCustomerPayment(currentStore.id, paymentId);
    setCustomerPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  // Helper to dispatch SendLib staff invitation email with automatic retry
  const dispatchStaffInviteEmail = async (payload: {
    to: string;
    staffName: string;
    storeName: string;
    role: string;
    invitedByName: string;
    inviteUrl: string;
    expiresAt?: string;
    permissionsCount?: number;
  }): Promise<{ emailSent: boolean; emailError?: string }> => {
    const fetchUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/staff-invite-email`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };

    try {
      let response = await fetch(fetchUrl, options);

      // If server is in a transient reload or warmup state, retry once after a short delay
      if (response.status === 404 || response.status === 502 || response.status === 503) {
        await new Promise((r) => setTimeout(r, 1200));
        response = await fetch(fetchUrl, options);
      }

      const emailData = await response.json().catch(() => ({}));
      if (response.ok && emailData.success) {
        return { emailSent: true };
      }

      return {
        emailSent: false,
        emailError: emailData.error || `SendLib dispatch returned status ${response.status}`,
      };
    } catch (err: any) {
      return {
        emailSent: false,
        emailError: err?.message || 'Failed to dispatch staff invitation email.',
      };
    }
  };

  // Staff Management Implementations
  const inviteStaff = async (params: {
    name: string;
    email?: string;
    phone?: string;
    role: string;
    permissions: string[];
    notes?: string;
    deliveryMethod?: InvitationDeliveryMethod;
  }) => {
    if (!currentStore) throw new Error('No store selected');
    if (!user) throw new Error('Not authenticated');

    const deliveryMethod: InvitationDeliveryMethod = 
      params.deliveryMethod || (params.phone ? 'whatsapp' : 'email');

    // 1. Save staff account first (Principle: Account created independently from delivery method)
    const result = await apiCreateStaffInvitation({
      storeId: currentStore.id,
      storeName: currentStore.name,
      invitedBy: user.id,
      invitedByName: user.user_metadata?.full_name || user.email || 'Store Owner',
      name: params.name,
      email: params.email,
      phone: params.phone,
      role: params.role,
      permissions: params.permissions,
      notes: params.notes,
      deliveryMethod,
    });

    setMembers((prev) => [result.member, ...prev]);
    setStaffInvitations((prev) => [result.invitation, ...prev]);
    fetchStaffActivity(currentStore.id).then(setStaffActivity).catch(console.warn);

    const inviteUrl = buildStaffInvitationUrl(result.invitation.token);

    let emailSent: boolean | undefined = undefined;
    let emailError: string | undefined = undefined;
    let whatsappUrl: string | undefined = undefined;
    let whatsappMessage: string | undefined = undefined;
    let whatsappOpened = false;

    // 2. Dispatch based on delivery method
    if (deliveryMethod === 'whatsapp') {
      const phoneValidation = validateAndFormatWhatsAppPhone(params.phone || '');
      whatsappMessage = buildWhatsAppInviteMessage({
        staffName: params.name,
        storeName: currentStore.name,
        role: params.role,
        inviteUrl,
      });

      if (phoneValidation.valid) {
        const links = buildWhatsAppLinks(phoneValidation.cleanNumber, whatsappMessage);
        whatsappUrl = links.waMeUrl;
        whatsappOpened = openWhatsAppChat(phoneValidation.cleanNumber, whatsappMessage);
      }
    } else if (deliveryMethod === 'email') {
      const emailResult = await dispatchStaffInviteEmail({
        to: (params.email || '').trim(),
        staffName: params.name.trim(),
        storeName: currentStore.name,
        role: params.role,
        invitedByName: user.user_metadata?.full_name || user.email || 'Store Owner',
        inviteUrl,
        expiresAt: result.invitation.expires_at,
        permissionsCount: params.permissions.length,
      });
      emailSent = emailResult.emailSent;
      emailError = emailResult.emailError;
    } else if (deliveryMethod === 'copy_link') {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(inviteUrl).catch(() => {});
      }
    }

    return {
      member: result.member,
      invitation: result.invitation,
      accountCreated: true,
      deliveryMethod,
      inviteUrl,
      emailSent,
      emailError,
      whatsappUrl,
      whatsappMessage,
      whatsappOpened,
    };
  };

  const resendInvite = async (
    invitationId: string,
    options?: {
      deliveryMethod?: InvitationDeliveryMethod;
      email?: string;
      phone?: string;
    }
  ) => {
    if (!currentStore) throw new Error('No store selected');
    const performer = user?.user_metadata?.full_name || user?.email || 'Store Owner';
    const updated = await apiResendStaffInvitation(currentStore.id, invitationId, performer, options);
    setStaffInvitations((prev) => prev.map((i) => (i.id === invitationId ? updated : i)));
    fetchStaffActivity(currentStore.id).then(setStaffActivity).catch(console.warn);

    const deliveryMethod: InvitationDeliveryMethod = 
      options?.deliveryMethod || updated.delivery_method || (updated.phone ? 'whatsapp' : 'email');

    const inviteUrl = buildStaffInvitationUrl(updated.token);

    let emailSent: boolean | undefined = undefined;
    let emailError: string | undefined = undefined;
    let whatsappUrl: string | undefined = undefined;
    let whatsappMessage: string | undefined = undefined;
    let whatsappOpened = false;

    if (deliveryMethod === 'whatsapp') {
      const targetPhone = options?.phone || updated.phone || '';
      const phoneValidation = validateAndFormatWhatsAppPhone(targetPhone);
      whatsappMessage = buildWhatsAppInviteMessage({
        staffName: updated.name,
        storeName: currentStore.name,
        role: updated.role,
        inviteUrl,
      });

      if (phoneValidation.valid) {
        const links = buildWhatsAppLinks(phoneValidation.cleanNumber, whatsappMessage);
        whatsappUrl = links.waMeUrl;
        whatsappOpened = openWhatsAppChat(phoneValidation.cleanNumber, whatsappMessage);
      }
    } else if (deliveryMethod === 'email') {
      const recipientEmail = (options?.email || updated.email || (updated as any).user_email || '').trim();
      const staffName = (updated.name || (updated as any).user_name || 'Team Member').trim();

      const emailResult = await dispatchStaffInviteEmail({
        to: recipientEmail,
        staffName,
        storeName: currentStore.name || updated.store_name || 'StockWise Store',
        role: updated.role || 'cashier',
        invitedByName: performer,
        inviteUrl,
        expiresAt: updated.expires_at,
        permissionsCount: updated.permissions?.length || 0,
      });
      emailSent = emailResult.emailSent;
      emailError = emailResult.emailError;
    } else if (deliveryMethod === 'copy_link') {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(inviteUrl).catch(() => {});
      }
    }

    return Object.assign(updated, {
      deliveryMethod,
      inviteUrl,
      emailSent,
      emailError,
      whatsappUrl,
      whatsappMessage,
      whatsappOpened,
    });
  };

  const cancelInvite = async (invitationId: string) => {
    if (!currentStore) throw new Error('No store selected');
    const performer = user?.user_metadata?.full_name || user?.email || 'Store Owner';
    await apiCancelStaffInvitation(currentStore.id, invitationId, performer);
    setStaffInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    setMembers((prev) => prev.filter((m) => !m.invitation_token || !invitationId.includes(m.invitation_token)));
    fetchStaffActivity(currentStore.id).then(setStaffActivity).catch(console.warn);
  };

  const updateStaffPermissions = async (memberId: string, role: string, permissions: string[]) => {
    if (!currentStore) throw new Error('No store selected');
    const performer = user?.user_metadata?.full_name || user?.email || 'Store Owner';
    const updated = await apiUpdatePermissions(currentStore.id, memberId, role, permissions, performer);
    setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    fetchStaffActivity(currentStore.id).then(setStaffActivity).catch(console.warn);
    return updated;
  };

  const suspendStaff = async (memberId: string) => {
    if (!currentStore) throw new Error('No store selected');
    const performer = user?.user_metadata?.full_name || user?.email || 'Store Owner';
    const updated = await apiSuspendMember(currentStore.id, memberId, performer);
    setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    fetchStaffActivity(currentStore.id).then(setStaffActivity).catch(console.warn);
    return updated;
  };

  const reactivateStaff = async (memberId: string) => {
    if (!currentStore) throw new Error('No store selected');
    const performer = user?.user_metadata?.full_name || user?.email || 'Store Owner';
    const updated = await apiReactivateMember(currentStore.id, memberId, performer);
    setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    fetchStaffActivity(currentStore.id).then(setStaffActivity).catch(console.warn);
    return updated;
  };

  const removeStaff = async (memberId: string) => {
    if (!currentStore) throw new Error('No store selected');
    const performer = user?.user_metadata?.full_name || user?.email || 'Store Owner';
    await apiRemoveMember(memberId, currentStore.id, performer);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    fetchStaffActivity(currentStore.id).then(setStaffActivity).catch(console.warn);
  };

  const acceptInvite = async (token: string, userName?: string) => {
    if (!user) throw new Error('Authentication required to accept invitation.');
    const result = await apiAcceptInvitation(token, user.id, user.email || '', userName);
    await refreshStores();
    setCurrentStore(result.store);
    return result;
  };

  return (
    <StoreContext.Provider
      value={{
        currentStore,
        stores,
        loading: loadingStores || loadingData,
        loadingStores,
        loadingData,
        products,
        inventoryMovements,
        sales,
        expenses,
        customers,
        suppliers,
        categories,
        settings,
        members,
        staffInvitations,
        staffActivity,
        customerPayments,
        currentMemberRole,
        currentMember,
        isStoreOwner,
        hasPermission,
        setCurrentStore,
        refreshStores,
        refreshStoreData,
        createNewStore,
        updateCurrentStore,
        updateSettings,
        recordCustomerPayment,
        deleteCustomerPayment,
        inviteStaff,
        resendInvite,
        cancelInvite,
        updateStaffPermissions,
        suspendStaff,
        reactivateStaff,
        removeStaff,
        acceptInvite,
        isRealtimeConnected,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
