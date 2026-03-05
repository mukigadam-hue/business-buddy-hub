import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './BusinessContext';

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
  created_at: string;
}

interface FactoryContextType {
  rawMaterials: RawMaterial[];
  expenses: FactoryExpense[];
  teamMembers: FactoryTeamMember[];
  production: ProductionRecord[];
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
  refreshFactory: () => Promise<void>;
}

const FactoryContext = createContext<FactoryContextType | null>(null);

export function FactoryProvider({ children }: { children: React.ReactNode }) {
  const { currentBusiness } = useBusiness();
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [expenses, setExpenses] = useState<FactoryExpense[]>([]);
  const [teamMembers, setTeamMembers] = useState<FactoryTeamMember[]>([]);
  const [production, setProduction] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const businessId = currentBusiness?.id;

  const loadData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const [rmRes, expRes, teamRes, prodRes] = await Promise.all([
      supabase.from('factory_raw_materials').select('*').eq('business_id', businessId).order('name'),
      supabase.from('factory_expenses').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('factory_team_members').select('*').eq('business_id', businessId).order('full_name'),
      supabase.from('factory_production').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    ]);
    setRawMaterials((rmRes.data || []) as any[]);
    setExpenses((expRes.data || []) as any[]);
    setTeamMembers((teamRes.data || []) as any[]);
    setProduction((prodRes.data || []) as any[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      loadData();
      // Realtime
      let timer: ReturnType<typeof setTimeout> | null = null;
      const debounced = () => { if (timer) clearTimeout(timer); timer = setTimeout(loadData, 300); };
      const ch = supabase
        .channel(`factory-${businessId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_raw_materials', filter: `business_id=eq.${businessId}` }, debounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_expenses', filter: `business_id=eq.${businessId}` }, debounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_team_members', filter: `business_id=eq.${businessId}` }, debounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_production', filter: `business_id=eq.${businessId}` }, debounced)
        .subscribe();
      return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
    }
  }, [businessId, loadData]);

  const addRawMaterial = useCallback(async (item: Omit<RawMaterial, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
    if (!businessId) return;
    const { error } = await supabase.from('factory_raw_materials').insert({ ...item, business_id: businessId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Raw material added!');
  }, [businessId]);

  const updateRawMaterial = useCallback(async (id: string, updates: Partial<RawMaterial>) => {
    const { error } = await supabase.from('factory_raw_materials').update(updates as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setRawMaterials(prev => prev.map(r => r.id === id ? { ...r, ...updates } as RawMaterial : r));
    toast.success('Updated!');
  }, []);

  const deleteRawMaterial = useCallback(async (id: string) => {
    const { error } = await supabase.from('factory_raw_materials').update({ deleted_at: new Date().toISOString() } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Material removed');
  }, []);

  const addExpense = useCallback(async (expense: Omit<FactoryExpense, 'id' | 'business_id' | 'created_at'>) => {
    if (!businessId) return;
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
    setTeamMembers(prev => prev.map(t => t.id === id ? { ...t, ...updates } as FactoryTeamMember : t));
    toast.success('Updated!');
  }, []);

  const deleteTeamMember = useCallback(async (id: string) => {
    const { error } = await supabase.from('factory_team_members').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Member removed');
  }, []);

  const addProduction = useCallback(async (record: Omit<ProductionRecord, 'id' | 'business_id' | 'created_at'>) => {
    if (!businessId) return;
    const { error } = await supabase.from('factory_production').insert({ ...record, business_id: businessId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Production recorded!');
  }, [businessId]);

  return (
    <FactoryContext.Provider value={{
      rawMaterials, expenses, teamMembers, production, loading,
      addRawMaterial, updateRawMaterial, deleteRawMaterial,
      addExpense, deleteExpense,
      addTeamMember, updateTeamMember, deleteTeamMember,
      addProduction, refreshFactory: loadData,
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
