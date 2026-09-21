import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  Role
} from '../types';
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
  createStore as apiCreateStore,
  updateStore as apiUpdateStore,
  saveStoreSettings as apiSaveSettings
} from '../lib/db';
import { supabase } from '../lib/supabase';
import { getActiveDemoAccount } from '../lib/demoData';

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
  currentMemberRole: Role;
  setCurrentStore: (store: Store) => void;
  refreshStores: () => Promise<void>;
  refreshStoreData: () => Promise<void>;
  createNewStore: (name: string, currency?: string, details?: Partial<Store>) => Promise<Store>;
  updateCurrentStore: (updates: Partial<Store>) => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  isRealtimeConnected: boolean;
  isDemo: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isConfigured, isDemo } = useAuth();
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

  // Current user's role in the active store
  const currentMemberRole: Role = (() => {
    if (isDemo) {
      const demoAccount = getActiveDemoAccount();
      if (demoAccount) return demoAccount.role as Role;
    }
    if (!currentStore || !user) return 'cashier';
    if (currentStore.owner_id === user.id) return 'owner';
    const found = members.find((m) => m.user_id === user.id);
    return found?.role || 'cashier';
  })();

  // 1. Fetch user's stores
  const refreshStores = useCallback(async () => {
    if (!user || (!isConfigured && !isDemo)) {
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
  }, [user, isConfigured, isDemo]);

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
    if (!currentStore || (!isConfigured && !isDemo)) {
      setProducts([]);
      setInventoryMovements([]);
      setSales([]);
      setExpenses([]);
      setCustomers([]);
      setSuppliers([]);
      setCategories([]);
      setSettings(null);
      setMembers([]);
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
    } catch (err) {
      console.error('Error fetching store data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [currentStore, isConfigured, isDemo]);

  useEffect(() => {
    refreshStoreData();
  }, [refreshStoreData]);

  // 3. Supabase Real-time subscriptions for cross-device live sync
  useEffect(() => {
    if (!currentStore || !isConfigured || isDemo) {
      if (isDemo) {
        setIsRealtimeConnected(true);
      }
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
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [currentStore, isConfigured, isDemo]);

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
        currentMemberRole,
        setCurrentStore,
        refreshStores,
        refreshStoreData,
        createNewStore,
        updateCurrentStore,
        updateSettings,
        isRealtimeConnected,
        isDemo,
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
