import { useState, useEffect, useCallback } from 'react';
import { useFactory } from '@/context/FactoryContext';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Users, UserPlus, Send, Calendar, Clock, User, Wallet, Shield, Crown, AlertTriangle, ArrowDownCircle } from 'lucide-react';
import WorkerPaymentManager from '@/components/factory/WorkerPaymentManager';
import AdSpace from '@/components/AdSpace';
import { toTitleCase } from '@/lib/utils';
import { toast } from 'sonner';

interface AppMember {
  user_id: string;
  role: string;
  email: string;
  full_name: string;
}

const RANKS = ['Supervisor', 'Inspector', 'Maintenance', 'Security', 'Worker', 'Operator', 'Quality Control', 'Driver'];

export default function FactoryTeam() {
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember } = useFactory();
  const { currentBusiness, userRole, memberships, generateInviteCode, redeemInviteCode, getMembers, removeMember, updateMemberRole } = useBusiness();
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const { maxWorkers } = usePremium();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', rank: 'Worker', salary: '', phone: '', hire_date: new Date().toISOString().slice(0, 10) });

  const [workerCode, setWorkerCode] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [appMembers, setAppMembers] = useState<AppMember[]>([]);
  const [workerBalances, setWorkerBalances] = useState<Record<string, { totalOwed: number; totalAdvances: number }>>({});

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
  const businessId = currentBusiness?.id;

  const activeMembers = teamMembers.filter(t => t.is_active);
  const inactiveMembers = teamMembers.filter(t => !t.is_active);
  const totalSalary = activeMembers.reduce((sum, t) => sum + Number(t.salary), 0);

  const loadAppMembers = useCallback(async () => {
    const data = await getMembers();
    setAppMembers(data);
  }, [getMembers]);

  const loadBalances = useCallback(async () => {
    if (!businessId) return;
    const [paymentsRes, advancesRes] = await Promise.all([
      supabase.from('factory_worker_payments').select('*').eq('business_id', businessId),
      supabase.from('factory_worker_advances').select('*').eq('business_id', businessId),
    ]);
    const payments = paymentsRes.data || [];
    const advances = advancesRes.data || [];
    const balances: Record<string, { totalOwed: number; totalAdvances: number }> = {};
    teamMembers.forEach(w => {
      const pendingPayments = payments.filter((p: any) => p.worker_id === w.id && p.status !== 'completed');
      const totalOwed = pendingPayments.reduce((sum: number, p: any) => sum + (p.amount_due - p.amount_paid), 0);
      const activeAdvances = advances.filter((a: any) => a.worker_id === w.id && a.status === 'active');
      const totalAdvances = activeAdvances.reduce((sum: number, a: any) => sum + a.remaining_balance, 0);
      balances[w.id] = { totalOwed, totalAdvances };
    });
    setWorkerBalances(balances);
  }, [businessId, teamMembers]);

  useEffect(() => {
    loadAppMembers();
    loadBalances();
  }, [loadAppMembers, loadBalances]);

  function getRoleIcon(role: string) {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-warning" />;
      case 'admin': return <Shield className="h-4 w-4 text-primary" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  }

  function resetForm() { setForm({ full_name: '', rank: 'Worker', salary: '', phone: '', hire_date: new Date().toISOString().slice(0, 10) }); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    await addTeamMember({
      full_name: toTitleCase(form.full_name.trim()),
      rank: form.rank,
      salary: parseFloat(form.salary) || 0,
      phone: form.phone.trim(),
      hire_date: form.hire_date,
      is_active: true,
      payment_frequency: 'monthly',
      next_payment_due: new Date().toISOString().slice(0, 10),
    });
    resetForm(); setShowAdd(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    await updateTeamMember(editId, {
      full_name: toTitleCase(form.full_name.trim()),
      rank: form.rank,
      salary: parseFloat(form.salary) || 0,
      phone: form.phone.trim(),
      hire_date: form.hire_date,
    });
    resetForm(); setEditId(null);
  }

  function openEdit(m: typeof activeMembers[0]) {
    setForm({ full_name: m.full_name, rank: m.rank, salary: String(m.salary), phone: m.phone, hire_date: m.hire_date });
    setEditId(m.id);
  }

  async function handleGenCode() {
    setLoading(true);
    const code = await generateInviteCode('worker');
    setWorkerCode(code);
    setLoading(false);
  }

  async function handleRedeem() {
    if (!redeemCode.trim()) return;
    setLoading(true);
    await redeemInviteCode(redeemCode.trim());
    setRedeemCode('');
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Factory Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeMembers.length} active members{isOwnerOrAdmin && ` · Monthly salary: ${fmt(totalSalary)}`}
          </p>
        </div>
        {isOwnerOrAdmin && <Button onClick={() => {
          const activeCount = teamMembers.filter(w => w.is_active).length;
          if (activeCount >= maxWorkers) {
            toast.info(`Free plan allows up to ${maxWorkers} workers. Upgrade to Premium ($52/year) for unlimited.`);
            return;
          }
          resetForm(); setShowAdd(true);
        }}><Plus className="h-4 w-4 mr-1" />Add Worker</Button>}
      </div>

      <AdSpace variant="banner" />

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="team" className="flex items-center gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6 mt-4">
          {/* Worker's own profile (when not owner/admin) */}
          {!isOwnerOrAdmin && (() => {
            const myMembership = memberships.find((m: any) => m.business_id === currentBusiness?.id && m.user_id === user?.id);
            const myTeamRecord = teamMembers.find(t => t.full_name.toLowerCase() === (user?.user_metadata?.full_name || '').toLowerCase());
            const joinDate = myMembership?.created_at;
            const tenure = joinDate ? Math.floor((Date.now() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
            const tenureLabel = tenure < 30 ? `${tenure} days` : tenure < 365 ? `${Math.floor(tenure / 30)} months` : `${Math.floor(tenure / 365)} yr ${Math.floor((tenure % 365) / 30)} mo`;
            return (
              <Card className="shadow-card border-primary/20">
                <CardContent className="p-4">
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-3"><User className="h-4 w-4" /> My Employment Details</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground">Role</p>
                      <p className="text-sm font-semibold capitalize">{myMembership?.role || 'worker'}</p>
                    </div>
                    {myTeamRecord && (
                      <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                        <p className="text-xs text-muted-foreground">Salary</p>
                        <p className="text-sm font-semibold text-success">{fmt(Number(myTeamRecord.salary))}/mo</p>
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Hired</p>
                      <p className="text-sm font-semibold">{myTeamRecord?.hire_date ? new Date(myTeamRecord.hire_date).toLocaleDateString() : joinDate ? new Date(joinDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Tenure</p>
                      <p className="text-sm font-semibold">{tenureLabel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Invite Section */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-card border-dashed">
              <CardContent className="p-4 space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Invite App Users</h2>
                {workerCode ? (
                  <div className="rounded-lg p-3 text-center bg-primary/5">
                    <span className="text-2xl font-mono font-bold tracking-widest">{workerCode}</span>
                    <p className="text-xs text-muted-foreground mt-1">🔐 Worker Code — Expires in 7 days</p>
                  </div>
                ) : (
                  <Button onClick={handleGenCode} disabled={loading} size="sm">Generate Invite Code</Button>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-card border-dashed">
              <CardContent className="p-4 space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Redeem Invite Code</h2>
                <div className="flex gap-2">
                  <Input placeholder="Enter code" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())} className="font-mono" maxLength={10} />
                  <Button onClick={handleRedeem} disabled={loading || !redeemCode.trim()} size="sm">Join</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Unified All Workers List */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" /> All Workers ({appMembers.filter(m => m.role !== 'owner').length + activeMembers.filter(w => !appMembers.some(m => m.full_name?.toLowerCase() === w.full_name.toLowerCase())).length})
              </h2>
              {appMembers.length === 0 && activeMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No workers yet. Add manually or invite via code.</p>
              ) : (
                <div className="space-y-2">
                  {/* App Users */}
                  {appMembers.map(member => {
                    const matchedWorker = activeMembers.find(w => w.full_name.toLowerCase() === (member.full_name || '').toLowerCase());
                    const bal = matchedWorker ? (workerBalances[matchedWorker.id] || { totalOwed: 0, totalAdvances: 0 }) : { totalOwed: 0, totalAdvances: 0 };
                    return (
                      <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.role)}
                            <p className="font-medium text-sm">{member.full_name || 'Unknown'}</p>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                              📱 App User
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            {member.email}{member.role !== 'owner' && ` · ${member.role}`}
                          </p>
                          {bal.totalOwed > 0 && (
                            <p className="text-xs text-destructive mt-0.5 ml-6">
                              <AlertTriangle className="inline h-3 w-3 mr-1" />Business owes: {fmt(bal.totalOwed)}
                            </p>
                          )}
                          {bal.totalAdvances > 0 && (
                            <p className="text-xs text-warning mt-0.5 ml-6">
                              <ArrowDownCircle className="inline h-3 w-3 mr-1" />Advance given: {fmt(bal.totalAdvances)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwnerOrAdmin && member.role !== 'owner' ? (
                            <>
                              <Select value={member.role} onValueChange={v => updateMemberRole(member.user_id, v).then(loadAppMembers)}>
                                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="worker">Worker</SelectItem>
                                </SelectContent>
                              </Select>
                              <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will remove this person and revoke their app access. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => removeMember(member.user_id).then(loadAppMembers)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                            </>
                          ) : (
                            member.role === 'owner' && <span className="text-xs font-medium capitalize px-2 py-1 rounded-full bg-muted">{member.role}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Manual Workers */}
                  {activeMembers.map(m => {
                    const bal = workerBalances[m.id] || { totalOwed: 0, totalAdvances: 0 };
                    const isAlsoAppUser = appMembers.some(am => am.full_name?.toLowerCase() === m.full_name.toLowerCase());
                    if (isAlsoAppUser) return null;
                    return (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">{m.full_name}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground">
                              📝 Manual
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            {m.rank}{m.phone && ` · 📞 ${m.phone}`} · Hired: {new Date(m.hire_date).toLocaleDateString()}
                          </p>
                          {bal.totalOwed > 0 && (
                            <p className="text-xs text-destructive mt-0.5 ml-6">
                              <AlertTriangle className="inline h-3 w-3 mr-1" />Business owes: {fmt(bal.totalOwed)}
                            </p>
                          )}
                          {bal.totalAdvances > 0 && (
                            <p className="text-xs text-warning mt-0.5 ml-6">
                              <ArrowDownCircle className="inline h-3 w-3 mr-1" />Advance given: {fmt(bal.totalAdvances)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwnerOrAdmin && <span className="text-sm font-semibold text-success tabular-nums">{fmt(Number(m.salary))}/mo</span>}
                          {isOwnerOrAdmin && <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Edit2 className="h-3.5 w-3.5" /></Button>}
                          {isOwnerOrAdmin && <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Deactivate {m.full_name}?</AlertDialogTitle><AlertDialogDescription>This will deactivate the worker. You can reactivate them later.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => updateTeamMember(m.id, { is_active: false })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {inactiveMembers.length > 0 && (
            <Card className="shadow-card border-destructive/20">
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold text-destructive mb-2">Inactive Members ({inactiveMembers.length})</h2>
                {inactiveMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded border mb-1">
                    <span className="text-sm text-muted-foreground">{m.full_name} — {m.rank}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateTeamMember(m.id, { is_active: true })}>Reactivate</Button>
                      <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="destructive">Remove</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently remove {m.full_name}?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this worker's record. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteTeamMember(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <WorkerPaymentManager isOwnerOrAdmin={isOwnerOrAdmin} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editId} onOpenChange={o => { if (!o) { setShowAdd(false); setEditId(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle></DialogHeader>
          <form onSubmit={editId ? handleEdit : handleAdd} className="space-y-3">
            <div><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} onBlur={e => setForm(f => ({ ...f, full_name: toTitleCase(e.target.value) }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rank</Label>
                <Select value={form.rank} onValueChange={v => setForm(f => ({ ...f, rank: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RANKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Monthly Salary</Label><Input type="number" min="0" step="0.01" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Hire Date</Label><Input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
            </div>
            <Button type="submit" className="w-full">{editId ? 'Save Changes' : 'Add Member'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
