import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './BusinessContext';
import { CACHE_KEYS, cachePersist, readJsonSync } from '@/lib/offlineStore';
import { addToOfflineQueue } from '@/lib/offlineStore';

export interface RawMaterial {
  id: string;
  business_id: string;
  name: string;
  category: string;
  unit_type: string;
  quantity: number;
  unit_cost: number;
  min_stock_level: number;
  supplier: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FactoryExpense {
  id: string;
  business_id: string;
  category: string;
  description: string;
  amount: number;
  recorded_by: string;
  expense_date: string;
  created_at: string;
}

export interface FactoryTeamMember {
  id: string;
  business_id: string;
  full_name: string;
  rank: string;
  salary: number;
  phone: string;
  hire_date: string;
  is_active: boolean;
  payment_frequency: 'daily' | 'weekly' | 'monthly';
  next_payment_due: string;
  created_at: string;
}

export interface ProductionRecord {
  id: string;
  business_id: string;
  product_name: string;
  product_stock_id: string | null;
  quantity_produced: number;
  materials_used: any[];
  waste_quantity: number;
  waste_unit: string;
  production_date: string;
  expiry_date: string | null;
  recorded_by: string;
  notes: string;
  batch_number: string;
  created_at: string;
}

export interface WorkerPayment {
  id: string;
  business_id: string;
  worker_id: string;
  period_start: string;
  period_end: string;
  amount_due: number;
  amount_paid: number;
  advance_deducted: number;
  status: 'pending' | 'partial' | 'completed';
  paid_at: string | null;
  notes: string;
  created_at: string;
}

export interface WorkerAdvance {
  id: string;
  business_id: string;
  worker_id: string;
  amount: number;
  remaining_balance: number;
  date_given: string;
  reason: string;
  status: 'active' | 'fully_deducted';
  created_at: string;
}

interface FactoryContextType {
  rawMaterials: RawMaterial[];
  expenses: FactoryExpense[];
  teamMembers: FactoryTeamMember[];
  production: ProductionRecord[];
  workerPayments: WorkerPayment[];
  workerAdvances: WorkerAdvance[];
  loading: boolean;
  addRawMaterial: (item: Omit<RawMaterial, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<void>;
  updateRawMaterial: (id: string, updates: Partial<RawMaterial>) => Promise<void>;
  deleteRawMaterial: (id: string) => Promise<void>;
  addExpense: (expense: Omit<FactoryExpense, 'id' | 'business_id' | 'created_at'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addTeamMember: (member: Omit<FactoryTeamMember, 'id' | 'business_id' | 'created_at'>) => Promise<void>;
  updateTeamMember: (id: string, updates: Partial<FactoryTeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  addProduction: (record: Omit<ProductionRecord, 'id' | 'business_id' | 'created_at'>) => Promise<void>;
  addWorkerPayment: (payment: Omit<WorkerPayment, 'id' | 'business_id' | 'created_at'>) => Promise<void>;
  updateWorkerPayment: (id: string, updates: Partial<WorkerPayment>) => Promise<void>;
  deleteWorkerPayment: (id: string) => Promise<void>;
  addWorkerAdvance: (advance: Omit<WorkerAdvance, 'id' | 'business_id' | 'created_at'>) => Promise<void>;
  updateWorkerAdvance: (id: string, updates: Partial<WorkerAdvance>) => Promise<void>;
  deleteWorkerAdvance: (id: string) => Promise<void>;
  getWorkerBalance: (workerId: string) => { totalAdvances: number; totalOwed: number; pendingPayments: WorkerPayment[]; activeAdvances: WorkerAdvance[] };
  getDuePayments: () => { overdue: FactoryTeamMember[]; dueToday: FactoryTeamMember[]; dueSoon: FactoryTeamMember[] };
  refreshFactory: () => Promise<void>;
}

const FactoryContext = createContext<FactoryContextType | null>(null);

export function FactoryProvider({ children }: { children: React.ReactNode }) {
  const { currentBusiness } = useBusiness();
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(() => readJsonSync(CACHE_KEYS.rawMaterials, []));
  const [expenses, setExpenses] = useState<FactoryExpense[]>(() => readJsonSync(CACHE_KEYS.factoryExpenses, []));
  const [teamMembers, setTeamMembers] = useState<FactoryTeamMember[]>(() => readJsonSync(CACHE_KEYS.factoryTeam, []));
  const [production, setProduction] = useState<ProductionRecord[]>(() => readJsonSync(CACHE_KEYS.factoryProduction, []));
  const [workerPayments, setWorkerPayments] = useState<WorkerPayment[]>(() => readJsonSync(CACHE_KEYS.factoryWorkerPayments, []));
  const [workerAdvances, setWorkerAdvances] = useState<WorkerAdvance[]>(() => readJsonSync(CACHE_KEYS.factoryWorkerAdvances, []));
  const [loading, setLoading] = useState(() => readJsonSync<RawMaterial[]>(CACHE_KEYS.rawMaterials, []).length === 0 && navigator.onLine);

  const businessId = currentBusiness?.id;

  // Persist to IndexedDB + localStorage
  useEffect(() => { cachePersist(CACHE_KEYS.rawMaterials, rawMaterials); }, [rawMaterials]);
  useEffect(() => { cachePersist(CACHE_KEYS.factoryExpenses, expenses); }, [expenses]);
  useEffect(() => { cachePersist(CACHE_KEYS.factoryTeam, teamMembers); }, [teamMembers]);
  useEffect(() => { cachePersist(CACHE_KEYS.factoryProduction, production); }, [production]);
  useEffect(() => { cachePersist(CACHE_KEYS.factoryWorkerPayments, workerPayments); }, [workerPayments]);
  useEffect(() => { cachePersist(CACHE_KEYS.factoryWorkerAdvances, workerAdvances); }, [workerAdvances]);

  const loadData = useCallback(async () => {
    if (!businessId) return;
    if (rawMaterials.length === 0) setLoading(true);
    try {
      const [rmRes, expRes, teamRes, prodRes, payRes, advRes] = await Promise.all([
        supabase.from('factory_raw_materials').select('*').eq('business_id', businessId).order('name'),
        supabase.from('factory_expenses').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('factory_team_members').select('*').eq('business_id', businessId).order('full_name'),
        supabase.from('factory_production').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('factory_worker_payments').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('factory_worker_advances').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      ]);
      setRawMaterials((rmRes.data || []) as any[]);
      setExpenses((expRes.data || []) as any[]);
      setTeamMembers((teamRes.data || []) as any[]);
      setProduction((prodRes.data || []) as any[]);
      setWorkerPayments((payRes.data || []) as any[]);
      setWorkerAdvances((advRes.data || []) as any[]);
    } catch (err) {
      console.warn('Failed to load factory data (offline?):', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      loadData();
      let timer: ReturnType<typeof setTimeout> | null = null;
      const debounced = () => { if (timer) clearTimeout(timer); timer = setTimeout(loadData, 300); };
      const ch = supabase
        .channel(`factory-${businessId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_raw_materials', filter: `business_id=eq.${businessId}` }, debounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_expenses', filter: `business_id=eq.${businessId}` }, debounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_team_members', filter: `business_id=eq.${businessId}` }, debounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_production', filter: `business_id=eq.${businessId}` }, debounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_worker_payments', filter: `business_id=eq.${businessId}` }, debounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_worker_advances', filter: `business_id=eq.${businessId}` }, debounced)
        .subscribe();
      return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
    }
  }, [businessId, loadData]);

  const addRawMaterial = useCallback(async (item: Omit<RawMaterial, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
    if (!businessId) return;
    if (!navigator.onLine) {
      const tempId = crypto.randomUUID();
      const optimistic = { ...item, id: tempId, business_id: businessId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null } as RawMaterial;
      setRawMaterials(prev => [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name)));
      await addToOfflineQueue({ action: 'create_raw_material' as any, payload: { item: { ...item, business_id: businessId } }, optimisticIds: [tempId] });
      toast.success('Raw material saved offline — will sync when online');
      return;
    }
    const tempId = crypto.randomUUID();
    const optimistic = { ...item, id: tempId, business_id: businessId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null } as RawMaterial;
    setRawMaterials(prev => [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name)));
    toast.success('Raw material added!');
    const { error } = await supabase.from('factory_raw_materials').insert({ ...item, business_id: businessId } as any);
    if (error) { toast.error('Save failed: ' + error.message); setRawMaterials(prev => prev.filter(r => r.id !== tempId)); }
  }, [businessId]);

  const updateRawMaterial = useCallback(async (id: string, updates: Partial<RawMaterial>) => {
    setRawMaterials(prev => prev.map(r => r.id === id ? { ...r, ...updates } as RawMaterial : r));
    toast.success('Updated!');
    const { error } = await supabase.from('factory_raw_materials').update(updates as any).eq('id', id);
    if (error) { toast.error('Save failed: ' + error.message); }
  }, []);

  const deleteRawMaterial = useCallback(async (id: string) => {
    const { error } = await supabase.from('factory_raw_materials').update({ deleted_at: new Date().toISOString() } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Material removed');
  }, []);

  const addExpense = useCallback(async (expense: Omit<FactoryExpense, 'id' | 'business_id' | 'created_at'>) => {
    if (!businessId) return;
    if (!navigator.onLine) {
      const tempId = crypto.randomUUID();
      const optimistic = { ...expense, id: tempId, business_id: businessId, created_at: new Date().toISOString() } as FactoryExpense;
      setExpenses(prev => [optimistic, ...prev]);
      await addToOfflineQueue({ action: 'create_factory_expense' as any, payload: { expense: { ...expense, business_id: businessId } }, optimisticIds: [tempId] });
      toast.success('Expense saved offline — will sync when online');
      return;
    }
    const { error } = await supabase.from('factory_expenses').insert({ ...expense, business_id: businessId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Expense recorded!');
  }, [businessId]);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('factory_expenses').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Expense deleted');
  }, []);

  const addTeamMember = useCallback(async (member: Omit<FactoryTeamMember, 'id' | 'business_id' | 'created_at'>) => {
    if (!businessId) return;
    const { error } = await supabase.from('factory_team_members').insert({ ...member, business_id: businessId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Team member added!');
  }, [businessId]);

  const updateTeamMember = useCallback(async (id: string, updates: Partial<FactoryTeamMember>) => {
    const { error } = await supabase.from('factory_team_members').update(updates as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    if (updates.is_active === false) {
      const { data: member } = await supabase.from('factory_team_members').select('full_name, business_id').eq('id', id).single();
      if (member) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').ilike('full_name', member.full_name);
        if (profiles) {
          for (const p of profiles) {
            await supabase.from('business_memberships').delete()
              .eq('user_id', p.id).eq('business_id', member.business_id);
          }
        }
      }
    }
    setTeamMembers(prev => prev.map(t => t.id === id ? { ...t, ...updates } as FactoryTeamMember : t));
    toast.success('Updated!');
  }, []);

  const deleteTeamMember = useCallback(async (id: string) => {
    const { data: member } = await supabase.from('factory_team_members').select('full_name, business_id').eq('id', id).single();
    const { error } = await supabase.from('factory_team_members').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    if (member) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').ilike('full_name', member.full_name);
      if (profiles) {
        for (const p of profiles) {
          await supabase.from('business_memberships').delete()
            .eq('user_id', p.id).eq('business_id', member.business_id);
        }
      }
    }
    toast.success('Member removed');
  }, []);

  const addProduction = useCallback(async (record: Omit<ProductionRecord, 'id' | 'business_id' | 'created_at'>) => {
    if (!businessId) return;
    if (!navigator.onLine) {
      const tempId = crypto.randomUUID();
      const optimistic = { ...record, id: tempId, business_id: businessId, created_at: new Date().toISOString() } as ProductionRecord;
      setProduction(prev => [optimistic, ...prev]);
      await addToOfflineQueue({ action: 'create_production' as any, payload: { record: { ...record, business_id: businessId } }, optimisticIds: [tempId] });
      toast.success('Production saved offline — will sync when online');
      return;
    }
    const { error } = await supabase.from('factory_production').insert({ ...record, business_id: businessId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Production recorded!');
  }, [businessId]);

  const addWorkerPayment = useCallback(async (payment: Omit<WorkerPayment, 'id' | 'business_id' | 'created_at'>) => {
    if (!businessId) return;
    const { error } = await supabase.from('factory_worker_payments').insert({ ...payment, business_id: businessId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Payment recorded!');
  }, [businessId]);

  const updateWorkerPayment = useCallback(async (id: string, updates: Partial<WorkerPayment>) => {
    const { error } = await supabase.from('factory_worker_payments').update(updates as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setWorkerPayments(prev => prev.map(p => p.id === id ? { ...p, ...updates } as WorkerPayment : p));
    toast.success('Payment updated!');
  }, []);

  const deleteWorkerPayment = useCallback(async (id: string) => {
    const { error } = await supabase.from('factory_worker_payments').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Payment deleted');
  }, []);

  const addWorkerAdvance = useCallback(async (advance: Omit<WorkerAdvance, 'id' | 'business_id' | 'created_at'>) => {
    if (!businessId) return;
    const { error } = await supabase.from('factory_worker_advances').insert({ ...advance, business_id: businessId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Advance recorded!');
  }, [businessId]);

  const updateWorkerAdvance = useCallback(async (id: string, updates: Partial<WorkerAdvance>) => {
    const { error } = await supabase.from('factory_worker_advances').update(updates as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setWorkerAdvances(prev => prev.map(a => a.id === id ? { ...a, ...updates } as WorkerAdvance : a));
    toast.success('Advance updated!');
  }, []);

  const deleteWorkerAdvance = useCallback(async (id: string) => {
    const { error } = await supabase.from('factory_worker_advances').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Advance deleted');
  }, []);

  const getWorkerBalance = useCallback((workerId: string) => {
    const activeAdvances = workerAdvances.filter(a => a.worker_id === workerId && a.status === 'active');
    const totalAdvances = activeAdvances.reduce((sum, a) => sum + a.remaining_balance, 0);
    const pendingPayments = workerPayments.filter(p => p.worker_id === workerId && p.status !== 'completed');
    const totalOwed = pendingPayments.reduce((sum, p) => sum + (p.amount_due - p.amount_paid), 0);
    return { totalAdvances, totalOwed, pendingPayments, activeAdvances };
  }, [workerAdvances, workerPayments]);

  const getDuePayments = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysStr = threeDaysFromNow.toISOString().slice(0, 10);
    const activeMembers = teamMembers.filter(m => m.is_active);
    const overdue = activeMembers.filter(m => m.next_payment_due && m.next_payment_due < todayStr);
    const dueToday = activeMembers.filter(m => m.next_payment_due === todayStr);
    const dueSoon = activeMembers.filter(m => m.next_payment_due && m.next_payment_due > todayStr && m.next_payment_due <= threeDaysStr);
    return { overdue, dueToday, dueSoon };
  }, [teamMembers]);

  return (
    <FactoryContext.Provider value={{
      rawMaterials, expenses, teamMembers, production, workerPayments, workerAdvances, loading,
      addRawMaterial, updateRawMaterial, deleteRawMaterial,
      addExpense, deleteExpense,
      addTeamMember, updateTeamMember, deleteTeamMember,
      addProduction,
      addWorkerPayment, updateWorkerPayment, deleteWorkerPayment,
      addWorkerAdvance, updateWorkerAdvance, deleteWorkerAdvance,
      getWorkerBalance, getDuePayments,
      refreshFactory: loadData,
    }}>
      {children}
    </FactoryContext.Provider>
  );
}

export function useFactory() {
  const ctx = useContext(FactoryContext);
  if (!ctx) throw new Error('useFactory must be used within FactoryProvider');
  return ctx;
}
