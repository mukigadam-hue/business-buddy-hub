import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Shield, Crown, User, Users, MessageCircle, Share2, Send, Calendar, Clock, Wallet, Plus, Edit2, AlertTriangle, ArrowDownCircle } from 'lucide-react';
import { toast } from 'sonner';
import WorkerPaymentManager from '@/components/business/WorkerPaymentManager';
import AdSpace from '@/components/AdSpace';
import { toTitleCase, toSentenceCase } from '@/lib/utils';

interface Member {
  user_id: string;
  role: string;
  email: string;
  full_name: string;
}

interface TeamMember {
  id: string;
  business_id: string;
  full_name: string;
  phone: string;
  rank: string;
  salary: number;
  payment_frequency: string;
  hire_date: string;
  next_payment_due: string | null;
  is_active: boolean;
}

interface WorkerBalance {
  totalOwed: number;
  totalAdvances: number;
}

const RANKS = ['Supervisor', 'Manager', 'Cashier', 'Security', 'Worker', 'Driver', 'Cleaner'];

function ShareButtons({ code, type }: { code: string; type: 'worker' }) {
  const message = `Join our business as a Worker! Use this invite code: ${code}`;
  const encoded = encodeURIComponent(message);

  const platforms = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle className="h-4 w-4" />,
      url: `https://wa.me/?text=${encoded}`,
      bg: 'bg-green-600 hover:bg-green-700 text-white',
    },
    {
      name: 'X',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encoded}`,
      bg: 'bg-black hover:bg-gray-800 text-white',
    },
    {
      name: 'Copy',
      icon: <Share2 className="h-4 w-4" />,
      action: () => {
        navigator.clipboard.writeText(code);
        toast.success('Code copied to clipboard!');
      },
      bg: 'bg-muted hover:bg-muted/80 text-foreground',
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      <span className="text-xs text-muted-foreground">Share via:</span>
      {platforms.map((p) => (
        <button
          key={p.name}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${p.bg}`}
          onClick={() => {
            if ('action' in p && p.action) {
              p.action();
            } else if ('url' in p) {
              window.open(p.url, '_blank', 'noopener,noreferrer');
            }
          }}
        >
          {p.icon}
          {p.name}
        </button>
      ))}
    </div>
  );
}

function RedeemCodeSection({ onRedeemed }: { onRedeemed: () => void }) {
  const { redeemInviteCode } = useBusiness();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRedeem() {
    if (!code.trim()) {
      toast.error('Please enter an invite code');
      return;
    }
    setLoading(true);
    const success = await redeemInviteCode(code.trim());
    if (success) {
      setCode('');
      onRedeemed();
    }
    setLoading(false);
  }

  return (
    <Card className="shadow-card border-dashed border-primary/30">
      <CardContent className="p-4 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Send className="h-4 w-4" />
          Redeem Invite Code
        </h2>
        <p className="text-sm text-muted-foreground">
          Have an invite code? Enter it below to join a business.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter code (e.g. ABC123)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono tracking-wider uppercase"
            maxLength={10}
          />
          <Button onClick={handleRedeem} disabled={loading || !code.trim()}>
            {loading ? 'Joining...' : 'Join'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeamPage() {
  const { currentBusiness, userRole, generateInviteCode, getMembers, removeMember, updateMemberRole, memberships } = useBusiness();
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const { maxWorkers } = usePremium();
  const [members, setMembers] = useState<Member[]>([]);
  const [workerCode, setWorkerCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // Team members (business_team_members) for worker management
  const [teamWorkers, setTeamWorkers] = useState<TeamMember[]>([]);
  const [workerBalances, setWorkerBalances] = useState<Record<string, WorkerBalance>>({});
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);
  const [workerForm, setWorkerForm] = useState({ full_name: '', rank: 'Worker', salary: '', phone: '', hire_date: new Date().toISOString().slice(0, 10) });

  const businessId = currentBusiness?.id;

  const loadTeamWorkers = useCallback(async () => {
    if (!businessId) return;
    const [workersRes, paymentsRes, advancesRes] = await Promise.all([
      supabase.from('business_team_members').select('*').eq('business_id', businessId).order('full_name'),
      supabase.from('business_worker_payments').select('*').eq('business_id', businessId),
      supabase.from('business_worker_advances').select('*').eq('business_id', businessId),
    ]);
    const workers = (workersRes.data || []) as TeamMember[];
    setTeamWorkers(workers);

    // Calculate balances
    const payments = paymentsRes.data || [];
    const advances = advancesRes.data || [];
    const balances: Record<string, WorkerBalance> = {};
    workers.forEach(w => {
      const pendingPayments = payments.filter((p: any) => p.worker_id === w.id && p.status !== 'completed');
      const totalOwed = pendingPayments.reduce((sum: number, p: any) => sum + (p.amount_due - p.amount_paid), 0);
      const activeAdvances = advances.filter((a: any) => a.worker_id === w.id && a.status === 'active');
      const totalAdvances = activeAdvances.reduce((sum: number, a: any) => sum + a.remaining_balance, 0);
      balances[w.id] = { totalOwed, totalAdvances };
    });
    setWorkerBalances(balances);
  }, [businessId]);

  useEffect(() => {
    loadMembers();
    loadTeamWorkers();
  }, [currentBusiness, loadTeamWorkers]);

  async function loadMembers() {
    const data = await getMembers();
    setMembers(data);
  }

  async function handleGenerateCode() {
    setLoading(true);
    const code = await generateInviteCode('worker');
    setWorkerCode(code);
    setLoading(false);
  }

  async function handleRemove(userId: string) {
    await removeMember(userId);
    loadMembers();
    loadTeamWorkers();
  }

  async function handleRoleChange(userId: string, role: string) {
    await updateMemberRole(userId, role);
    loadMembers();
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-warning" />;
      case 'admin': return <Shield className="h-4 w-4 text-primary" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  }

  function resetWorkerForm() {
    setWorkerForm({ full_name: '', rank: 'Worker', salary: '', phone: '', hire_date: new Date().toISOString().slice(0, 10) });
  }

  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId || !workerForm.full_name.trim()) return;
    const { error } = await supabase.from('business_team_members').insert({
      business_id: businessId,
      full_name: toTitleCase(workerForm.full_name.trim()),
      rank: workerForm.rank,
      salary: parseFloat(workerForm.salary) || 0,
      phone: workerForm.phone.trim(),
      hire_date: workerForm.hire_date,
      is_active: true,
      payment_frequency: 'monthly',
      next_payment_due: new Date().toISOString().slice(0, 10),
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Worker added!');
    resetWorkerForm();
    setShowAddWorker(false);
    loadTeamWorkers();
  }

  async function handleEditWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!editWorkerId) return;
    const { error } = await supabase.from('business_team_members').update({
      full_name: toTitleCase(workerForm.full_name.trim()),
      rank: workerForm.rank,
      salary: parseFloat(workerForm.salary) || 0,
      phone: workerForm.phone.trim(),
      hire_date: workerForm.hire_date,
    }).eq('id', editWorkerId);
    if (error) { toast.error(error.message); return; }
    toast.success('Worker updated!');
    resetWorkerForm();
    setEditWorkerId(null);
    loadTeamWorkers();
  }

  function openEditWorker(w: TeamMember) {
    setWorkerForm({ full_name: w.full_name, rank: w.rank, salary: String(w.salary), phone: w.phone, hire_date: w.hire_date });
    setEditWorkerId(w.id);
  }

  async function deactivateWorker(id: string) {
    const worker = activeWorkers.find(w => w.id === id);
    await supabase.from('business_team_members').update({ is_active: false }).eq('id', id);
    // Also remove matching membership by name
    if (worker && businessId) {
      const matchedMember = members.find(m => m.full_name?.toLowerCase() === worker.full_name.toLowerCase());
      if (matchedMember) {
        await supabase.from('business_memberships').delete()
          .eq('user_id', matchedMember.user_id).eq('business_id', businessId);
      }
    }
    toast.success('Worker deactivated');
    loadTeamWorkers();
    loadMembers();
  }

  async function reactivateWorker(id: string) {
    await supabase.from('business_team_members').update({ is_active: true }).eq('id', id);
    loadTeamWorkers();
  }

  async function deleteWorker(id: string) {
    const worker = [...activeWorkers, ...inactiveWorkers].find(w => w.id === id);
    await supabase.from('business_team_members').delete().eq('id', id);
    // Also remove matching membership by name
    if (worker && businessId) {
      const matchedMember = members.find(m => m.full_name?.toLowerCase() === worker.full_name.toLowerCase());
      if (matchedMember) {
        await supabase.from('business_memberships').delete()
          .eq('user_id', matchedMember.user_id).eq('business_id', businessId);
      }
    }
    toast.success('Worker permanently removed');
    loadTeamWorkers();
    loadMembers();
  }

  function ConfirmDeleteButton({ onConfirm, label = 'Remove' }: { onConfirm: () => void; label?: string }) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this person. They will lose access to this business if they are an app user. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{label}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const activeWorkers = teamWorkers.filter(w => w.is_active);
  const inactiveWorkers = teamWorkers.filter(w => !w.is_active);
  const totalSalary = activeWorkers.reduce((sum, w) => sum + Number(w.salary), 0);

  // Current user info
  const myMembership = members.find(m => m.user_id === user?.id);
  const myJoinDate = memberships.find(m => m.business_id === currentBusiness?.id && m.user_id === user?.id)?.created_at;
  const tenure = myJoinDate ? Math.floor((Date.now() - new Date(myJoinDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const tenureLabel = tenure < 30 ? `${tenure} days` : tenure < 365 ? `${Math.floor(tenure / 30)} months` : `${Math.floor(tenure / 365)} yr ${Math.floor((tenure % 365) / 30)} mo`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeWorkers.length} workers{isOwnerOrAdmin && ` · Monthly salary: ${fmt(totalSalary)}`}
          </p>
        </div>
        {isOwnerOrAdmin && (
          <Button onClick={() => {
            if (activeWorkers.length >= maxWorkers) {
              toast.info(`Free plan allows up to ${maxWorkers} workers. Upgrade to Premium ($52/year) for unlimited.`);
              return;
            }
            resetWorkerForm(); setShowAddWorker(true);
          }}>
            <Plus className="h-4 w-4 mr-1" />Add Worker
          </Button>
        )}
      </div>

      {/* Worker's own profile card (when not owner) */}
      {!isOwnerOrAdmin && myMembership && (
        <Card className="shadow-card border-primary/20">
          <CardContent className="p-4">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
              <User className="h-4 w-4" /> My Employment Details
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-semibold">{myMembership.full_name}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-semibold capitalize">{myMembership.role}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined</p>
                <p className="text-sm font-semibold">{myJoinDate ? new Date(myJoinDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Tenure</p>
                <p className="text-sm font-semibold">{tenureLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <RedeemCodeSection onRedeemed={() => { loadMembers(); loadTeamWorkers(); }} />

      <AdSpace variant="banner" />

      <Tabs defaultValue="workers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workers" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Workers
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Payments
          </TabsTrigger>
        </TabsList>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-4 mt-4">
          {isOwnerOrAdmin && (
            <Card className="shadow-card border-dashed">
              <CardContent className="p-4 space-y-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Invite App Users
                </h2>
                <p className="text-sm text-muted-foreground">
                  Generate a code to add team members who can manage stock, sales & orders.
                </p>
                {workerCode ? (
                  <div className="space-y-2">
                    <div className="rounded-lg p-3 text-center bg-primary/5">
                      <span className="text-2xl font-mono font-bold tracking-widest">{workerCode}</span>
                      <p className="text-xs text-muted-foreground mt-1">🔐 Worker Code — Expires in 7 days</p>
                    </div>
                    <ShareButtons code={workerCode} type="worker" />
                  </div>
                ) : (
                  <Button onClick={handleGenerateCode} disabled={loading}>
                    <UserPlus className="h-4 w-4 mr-2" /> Generate Worker Code
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Unified All Workers List */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" /> All Workers ({members.filter(m => m.role !== 'owner').length + activeWorkers.length})
              </h2>
              {members.filter(m => m.role !== 'owner').length === 0 && activeWorkers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No workers yet. Add manually or invite via code.</p>
              ) : (
                <div className="space-y-2">
                  {/* App Users (from business_memberships) */}
                  {members.map(member => {
                    // Find matching team record for balance info
                    const matchedWorker = activeWorkers.find(w => w.full_name.toLowerCase() === (member.full_name || '').toLowerCase());
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
                              <AlertTriangle className="inline h-3 w-3 mr-1" />
                              Business owes: {fmt(bal.totalOwed)}
                            </p>
                          )}
                          {bal.totalAdvances > 0 && (
                            <p className="text-xs text-warning mt-0.5 ml-6">
                              <ArrowDownCircle className="inline h-3 w-3 mr-1" />
                              Advance given: {fmt(bal.totalAdvances)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwnerOrAdmin && member.role !== 'owner' ? (
                            <>
                              <Select value={member.role} onValueChange={v => handleRoleChange(member.user_id, v)}>
                                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="worker">Worker</SelectItem>
                                </SelectContent>
                              </Select>
                              <ConfirmDeleteButton onConfirm={() => handleRemove(member.user_id)} />
                            </>
                          ) : (
                            member.role === 'owner' && <span className="text-xs font-medium capitalize px-2 py-1 rounded-full bg-muted">{member.role}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Manual Workers (from business_team_members) */}
                  {activeWorkers.map(w => {
                    const bal = workerBalances[w.id] || { totalOwed: 0, totalAdvances: 0 };
                    // Check if this worker is also an app user (matched by name)
                    const isAlsoAppUser = members.some(m => m.full_name?.toLowerCase() === w.full_name.toLowerCase());
                    if (isAlsoAppUser) return null; // Already shown above
                    return (
                      <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">{w.full_name}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground">
                              📝 Manual
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            {w.rank}{w.phone && ` · 📞 ${w.phone}`} · Hired: {new Date(w.hire_date).toLocaleDateString()}
                          </p>
                          {bal.totalOwed > 0 && (
                            <p className="text-xs text-destructive mt-0.5 ml-6">
                              <AlertTriangle className="inline h-3 w-3 mr-1" />
                              Business owes: {fmt(bal.totalOwed)}
                            </p>
                          )}
                          {bal.totalAdvances > 0 && (
                            <p className="text-xs text-warning mt-0.5 ml-6">
                              <ArrowDownCircle className="inline h-3 w-3 mr-1" />
                              Advance given: {fmt(bal.totalAdvances)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwnerOrAdmin && <span className="text-sm font-semibold text-success tabular-nums">{fmt(Number(w.salary))}/mo</span>}
                          {isOwnerOrAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openEditWorker(w)}><Edit2 className="h-3.5 w-3.5" /></Button>
                              <ConfirmDeleteButton onConfirm={() => deactivateWorker(w.id)} label="Deactivate" />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inactive Workers */}
          {inactiveWorkers.length > 0 && (
            <Card className="shadow-card border-destructive/20">
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold text-destructive mb-2">Inactive Workers ({inactiveWorkers.length})</h2>
                {inactiveWorkers.map(w => (
                  <div key={w.id} className="flex items-center justify-between p-2 rounded border mb-1">
                    <span className="text-sm text-muted-foreground">{w.full_name} — {w.rank}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => reactivateWorker(w.id)}>Reactivate</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="sm" variant="destructive">Remove</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Permanently remove {w.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete this worker's record. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteWorker(w.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <WorkerPaymentManager isOwnerOrAdmin={isOwnerOrAdmin} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Worker Dialog */}
      <Dialog open={showAddWorker || !!editWorkerId} onOpenChange={o => { if (!o) { setShowAddWorker(false); setEditWorkerId(null); resetWorkerForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editWorkerId ? 'Edit Worker' : 'Add Worker'}</DialogTitle></DialogHeader>
          <form onSubmit={editWorkerId ? handleEditWorker : handleAddWorker} className="space-y-3">
            <div><Label>Full Name *</Label><Input value={workerForm.full_name} onChange={e => setWorkerForm(f => ({ ...f, full_name: e.target.value }))} onBlur={e => setWorkerForm(f => ({ ...f, full_name: toTitleCase(e.target.value) }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rank</Label>
                <Select value={workerForm.rank} onValueChange={v => setWorkerForm(f => ({ ...f, rank: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RANKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Monthly Salary</Label><Input type="number" min="0" step="0.01" value={workerForm.salary} onChange={e => setWorkerForm(f => ({ ...f, salary: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={workerForm.phone} onChange={e => setWorkerForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Hire Date</Label><Input type="date" value={workerForm.hire_date} onChange={e => setWorkerForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
            </div>
            <Button type="submit" className="w-full">{editWorkerId ? 'Save Changes' : 'Add Worker'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}