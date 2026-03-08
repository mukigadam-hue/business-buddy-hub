import { useState } from 'react';
import { useFactory } from '@/context/FactoryContext';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Users, UserPlus, Send, Calendar, Clock, User, Wallet } from 'lucide-react';
import WorkerPaymentManager from '@/components/factory/WorkerPaymentManager';

function toSentenceCase(str: string) { return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str; }

const RANKS = ['Supervisor', 'Inspector', 'Maintenance', 'Security', 'Worker', 'Operator', 'Quality Control', 'Driver'];

export default function FactoryTeam() {
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember } = useFactory();
  const { currentBusiness, userRole, memberships, generateInviteCode, redeemInviteCode } = useBusiness();
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', rank: 'Worker', salary: '', phone: '', hire_date: new Date().toISOString().slice(0, 10) });

  const [workerCode, setWorkerCode] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [loading, setLoading] = useState(false);

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  const activeMembers = teamMembers.filter(t => t.is_active);
  const inactiveMembers = teamMembers.filter(t => !t.is_active);
  const totalSalary = activeMembers.reduce((sum, t) => sum + Number(t.salary), 0);

  // Group by rank
  const rankGroups: Record<string, typeof activeMembers> = {};
  activeMembers.forEach(m => {
    const rank = m.rank || 'Worker';
    if (!rankGroups[rank]) rankGroups[rank] = [];
    rankGroups[rank].push(m);
  });

  function resetForm() { setForm({ full_name: '', rank: 'Worker', salary: '', phone: '', hire_date: new Date().toISOString().slice(0, 10) }); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    await addTeamMember({
      full_name: toSentenceCase(form.full_name.trim()),
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
      full_name: toSentenceCase(form.full_name.trim()),
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
        {isOwnerOrAdmin && <Button onClick={() => { resetForm(); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" />Add Worker</Button>}
      </div>

      {/* Main Tabs: Team / Payments */}
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

          {/* Team by Rank */}
          {Object.keys(rankGroups).length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-4 text-center py-8">
                <p className="text-sm text-muted-foreground">No team members yet. Add your first worker above.</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(rankGroups).sort(([a], [b]) => a.localeCompare(b)).map(([rank, members]) => (
              <Card key={rank} className="shadow-card">
                <CardContent className="p-4">
                  <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                    {rank === 'Supervisor' && '👔'} {rank === 'Inspector' && '🔍'} {rank === 'Maintenance' && '🔧'}
                    {rank === 'Security' && '🛡️'} {rank === 'Worker' && '👷'} {rank}
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{members.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.phone && `📞 ${m.phone} · `}
                            Hired: {new Date(m.hire_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwnerOrAdmin && <span className="text-sm font-semibold text-success tabular-nums">{fmt(Number(m.salary))}/mo</span>}
                          {isOwnerOrAdmin && <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Edit2 className="h-3.5 w-3.5" /></Button>}
                          {isOwnerOrAdmin && <Button variant="ghost" size="icon" onClick={() => updateTeamMember(m.id, { is_active: false })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {inactiveMembers.length > 0 && (
            <Card className="shadow-card border-destructive/20">
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold text-destructive mb-2">Inactive Members ({inactiveMembers.length})</h2>
                {inactiveMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded border mb-1">
                    <span className="text-sm text-muted-foreground">{m.full_name} — {m.rank}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateTeamMember(m.id, { is_active: true })}>Reactivate</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteTeamMember(m.id)}>Remove</Button>
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
            <div><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
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
