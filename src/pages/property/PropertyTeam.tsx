import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useProperty } from '@/context/PropertyContext';
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
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Trash2, Shield, Crown, User, Users, MessageCircle, Share2, Send, Calendar, Clock, Wallet, Plus, Edit2, Home, CheckCircle, Building, Key, Eye, Car, Ship, AlertTriangle, ThumbsUp, ThumbsDown, CreditCard, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import AdSpace from '@/components/AdSpace';
import { toTitleCase } from '@/lib/utils';
import ImageUpload from '@/components/ImageUpload';

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
  gender?: string;
  age?: number;
  occupation?: string;
  rental_purpose?: string;
  rental_end_date?: string;
  agreed_amount?: number;
}

interface Member {
  user_id: string;
  role: string;
  email: string;
  full_name: string;
}

const STAFF_RANKS = ['Property Manager', 'Caretaker', 'Agent', 'Maintenance', 'Security', 'Cleaner'];
const TENANT_RANK = 'Tenant';
const LANDLORD_RANK = 'Asset Owner';
const MAX_STAFF = 3;
const GENDERS = ['Male', 'Female', 'Other'];
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'mobile_money', label: 'Mobile Money', icon: '📱' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
];

function ShareButtons({ code }: { code: string }) {
  const message = `Join our property team! Use this invite code: ${code}`;
  const encoded = encodeURIComponent(message);
  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      <span className="text-xs text-muted-foreground">Share via:</span>
      <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white"
        onClick={() => window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer')}>
        <MessageCircle className="h-4 w-4" />WhatsApp
      </button>
      <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 text-foreground"
        onClick={() => { navigator.clipboard.writeText(code); toast.success('Code copied!'); }}>
        <Share2 className="h-4 w-4" />Copy
      </button>
    </div>
  );
}

function WorkerJoinSection({ onJoined }: { onJoined: () => void }) {
  const { redeemInviteCode } = useBusiness();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRedeem() {
    if (!code.trim()) { toast.error('Please enter an invite code'); return; }
    setLoading(true);
    const success = await redeemInviteCode(code.trim());
    if (success) { setCode(''); onJoined(); }
    setLoading(false);
  }

  return (
    <Card className="shadow-card border-dashed border-primary/30">
      <CardContent className="p-4 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Join via Invite Code</h2>
        <p className="text-sm text-muted-foreground">Got an invite code from an asset owner or property manager? Enter it to request access.</p>
        <div className="flex gap-2">
          <Input placeholder="Enter invite code (e.g. ABC123)" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            className="font-mono tracking-wider uppercase" maxLength={10} />
          <Button onClick={handleRedeem} disabled={loading || !code.trim()}>{loading ? 'Requesting...' : 'Request to Join'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Payment behavior scoring
function getPayerScore(bookings: any[]): { score: string; label: string; color: string; icon: any; onTimeCount: number; lateCount: number } {
  if (bookings.length === 0) return { score: 'N/A', label: 'No payments yet', color: 'text-muted-foreground', icon: Clock, onTimeCount: 0, lateCount: 0 };
  
  let onTime = 0, late = 0;
  bookings.forEach(b => {
    if (b.last_payment_date && b.expected_payment_date) {
      const paid = new Date(b.last_payment_date);
      const expected = new Date(b.expected_payment_date);
      if (paid <= expected) onTime++;
      else late++;
    } else if (b.payment_status === 'paid') {
      onTime++;
    }
  });
  
  const total = onTime + late;
  if (total === 0) return { score: 'N/A', label: 'No payments yet', color: 'text-muted-foreground', icon: Clock, onTimeCount: 0, lateCount: 0 };
  
  const ratio = onTime / total;
  if (ratio >= 0.8) return { score: '⭐ Good', label: `${onTime}/${total} on time`, color: 'text-green-600', icon: ThumbsUp, onTimeCount: onTime, lateCount: late };
  if (ratio >= 0.5) return { score: '⚠️ Fair', label: `${onTime}/${total} on time`, color: 'text-amber-600', icon: AlertTriangle, onTimeCount: onTime, lateCount: late };
  return { score: '❌ Poor', label: `${late}/${total} late`, color: 'text-destructive', icon: ThumbsDown, onTimeCount: onTime, lateCount: late };
}

function RentalPaymentsSection({ bookings, assets, isOwnerOrAdmin }: { bookings: any[]; assets: any[]; isOwnerOrAdmin: boolean }) {
  const { fmt } = useCurrency();
  const [paymentDialog, setPaymentDialog] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [proofUrl, setProofUrl] = useState('');

  const assetMap = new Map(assets.map((a: any) => [a.id, a]));
  const activeBookings = bookings
    .filter(b => ['active', 'confirmed', 'pending'].includes(b.status))
    .map(b => {
      const asset = assetMap.get(b.asset_id);
      const outstanding = Number(b.agreed_amount || b.total_price) - Number(b.amount_paid);
      const endDate = new Date(b.end_date);
      const now = new Date();
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const expectedPayment = b.expected_payment_date ? new Date(b.expected_payment_date) : null;
      const paymentDaysLeft = expectedPayment ? Math.ceil((expectedPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      return { ...b, asset, outstanding, daysLeft, paymentDaysLeft, isOverdue: daysLeft < 0 && outstanding > 0, isUrgent: daysLeft <= 3 && daysLeft >= 0 && outstanding > 0, isPaymentDue: paymentDaysLeft !== null && paymentDaysLeft <= 3 && outstanding > 0 };
    }).sort((a, b) => a.daysLeft - b.daysLeft);

  const totalOutstanding = activeBookings.reduce((s, b) => s + b.outstanding, 0);
  const totalCollected = bookings.reduce((s, b) => s + Number(b.amount_paid), 0);

  // Group by renter for behavior scoring
  const renterMap = new Map<string, any[]>();
  bookings.forEach(b => {
    const name = b.renter_name || 'Unknown';
    if (!renterMap.has(name)) renterMap.set(name, []);
    renterMap.get(name)!.push(b);
  });

  async function handleRecordPayment() {
    if (!paymentDialog || !paymentAmount) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
    const total = Number(paymentDialog.agreed_amount || paymentDialog.total_price);
    const newPaid = Number(paymentDialog.amount_paid) + amt;
    const newStatus = newPaid >= total ? 'paid' : 'partial';
    const { error } = await supabase.from('property_bookings').update({
      amount_paid: newPaid,
      payment_status: newStatus,
      payment_method: paymentMethod,
      last_payment_date: new Date().toISOString(),
    } as any).eq('id', paymentDialog.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payment of ${fmt(amt)} recorded!`);
    setPaymentDialog(null); setPaymentAmount(''); setPaymentMethod('cash'); setProofUrl('');
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card"><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Collected</p>
          <p className="text-lg font-bold text-success tabular-nums">{fmt(totalCollected)}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-lg font-bold text-warning tabular-nums">{fmt(totalOutstanding)}</p>
        </CardContent></Card>
      </div>

      {/* Payer Behavior Section */}
      {isOwnerOrAdmin && renterMap.size > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-3 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1">📊 Payer Behavior</h3>
            <div className="space-y-1.5">
              {Array.from(renterMap.entries()).map(([name, rBookings]) => {
                const score = getPayerScore(rBookings);
                return (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${score.color}`}>{score.score}</span>
                      <span className="text-[10px] text-muted-foreground">{score.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {activeBookings.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Home className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No active rental payments.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {activeBookings.map(b => (
            <Card key={b.id} className={`shadow-card ${b.isOverdue ? 'border-destructive/40' : b.isUrgent || b.isPaymentDue ? 'border-warning/40' : ''}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{b.renter_name || 'Tenant'}</p>
                    <p className="text-xs text-muted-foreground">{b.asset?.name || 'Asset'} · {b.duration_type}</p>
                    {b.gender && <p className="text-[10px] text-muted-foreground">{b.gender}{b.age ? `, ${b.age} yrs` : ''}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={b.isOverdue ? 'destructive' : b.isUrgent ? 'secondary' : 'outline'} className="text-[10px]">
                      {b.isOverdue ? `⚠️ Overdue ${Math.abs(b.daysLeft)}d` : b.daysLeft === 0 ? '⏰ Due today' : `${b.daysLeft}d left`}
                    </Badge>
                    {b.isPaymentDue && b.paymentDaysLeft !== null && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-700">
                        💰 Payment {b.paymentDaysLeft <= 0 ? 'overdue' : `in ${b.paymentDaysLeft}d`}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Agreed</p><p className="font-semibold tabular-nums">{fmt(Number(b.agreed_amount || b.total_price))}</p></div>
                  <div><p className="text-muted-foreground">Paid</p><p className="font-semibold text-success tabular-nums">{fmt(Number(b.amount_paid))}</p></div>
                  <div><p className="text-muted-foreground">Balance</p><p className={`font-semibold tabular-nums ${b.outstanding > 0 ? 'text-warning' : 'text-success'}`}>{fmt(b.outstanding)}</p></div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span><Calendar className="inline h-3 w-3 mr-1" />{new Date(b.start_date).toLocaleDateString()} → {new Date(b.end_date).toLocaleDateString()}</span>
                  {b.last_payment_date && <span className="text-[10px]">Last paid: {new Date(b.last_payment_date).toLocaleDateString()}</span>}
                </div>
                {b.outstanding > 0 && (
                  <Button size="sm" className="w-full h-7 text-xs" onClick={() => { setPaymentDialog(b); setPaymentAmount(String(b.outstanding)); }}>
                    <Wallet className="h-3 w-3 mr-1" /> Record Payment
                  </Button>
                )}
                {b.outstanding <= 0 && <div className="flex items-center gap-1 text-xs text-success"><CheckCircle className="h-3 w-3" /> Fully paid</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Dialog with Method Selection */}
      <Dialog open={!!paymentDialog} onOpenChange={o => { if (!o) { setPaymentDialog(null); setProofUrl(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment — {paymentDialog?.renter_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p>Agreed: <strong>{fmt(Number(paymentDialog?.agreed_amount || paymentDialog?.total_price || 0))}</strong></p>
              <p>Paid so far: <strong className="text-success">{fmt(Number(paymentDialog?.amount_paid || 0))}</strong></p>
              <p>Outstanding: <strong className="text-warning">{fmt(paymentDialog?.outstanding || 0)}</strong></p>
            </div>
            <div><Label>Payment Amount</Label><Input type="number" min="0" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></div>
            
            {/* Payment Method */}
            <div>
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                    className={`p-2 rounded-lg border text-xs text-left flex items-center gap-2 transition-all ${paymentMethod === m.value ? 'border-primary bg-primary/5 font-semibold' : 'border-border hover:border-primary/30'}`}>
                    <span>{m.icon}</span> {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Proof upload for mobile money */}
            {paymentMethod === 'mobile_money' && (
              <div>
                <Label>Payment Proof (screenshot)</Label>
                <ImageUpload bucket="payment-proofs" path="rental" currentUrl={proofUrl} size="md"
                  onUploaded={url => setProofUrl(url)} onRemoved={() => setProofUrl('')} label="Upload proof" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setPaymentAmount(String(Number(paymentDialog?.outstanding || 0) / 2)); }}>
                Half Payment
              </Button>
              <Button variant="outline" onClick={() => { setPaymentAmount(String(paymentDialog?.outstanding || 0)); }}>
                Full Payment
              </Button>
            </div>

            <Button onClick={handleRecordPayment} className="w-full"><Wallet className="h-4 w-4 mr-2" /> Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PropertyTeam() {
  const { currentBusiness, userRole, generateInviteCode, getMembers, removeMember, updateMemberRole, memberships } = useBusiness();
  const { bookings, assets } = useProperty();
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const { maxWorkers } = usePremium();
  const [members, setMembers] = useState<Member[]>([]);
  const [workerCode, setWorkerCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  const [viewMode, setViewMode] = useState<'tenant' | 'owner'>('owner');
  const [teamWorkers, setTeamWorkers] = useState<TeamMember[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);
  const [addType, setAddType] = useState<'staff' | 'tenant' | 'owner'>('tenant');
  const [workerForm, setWorkerForm] = useState({
    full_name: '', rank: 'Tenant', salary: '', phone: '', hire_date: new Date().toISOString().slice(0, 10),
    occupation: '', rental_purpose: '', gender: '', age: '', rental_end_date: '', agreed_amount: '',
  });

  const businessId = currentBusiness?.id;

  const loadTeamWorkers = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase.from('business_team_members').select('*').eq('business_id', businessId).order('full_name');
    setTeamWorkers((data || []) as TeamMember[]);
  }, [businessId]);

  useEffect(() => { loadMembers(); loadTeamWorkers(); }, [currentBusiness, loadTeamWorkers]);

  async function loadMembers() { const data = await getMembers(); setMembers(data); }

  async function handleGenerateCode() {
    setLoading(true);
    const code = await generateInviteCode('worker');
    setWorkerCode(code);
    setLoading(false);
  }

  async function handleRemove(userId: string) { await removeMember(userId); loadMembers(); loadTeamWorkers(); }
  async function handleRoleChange(userId: string, role: string) { await updateMemberRole(userId, role); loadMembers(); }

  function getRoleIcon(role: string) {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-warning" />;
      case 'admin': return <Shield className="h-4 w-4 text-primary" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  }

  function resetForm() {
    setWorkerForm({
      full_name: '', rank: addType === 'staff' ? 'Caretaker' : addType === 'owner' ? 'Asset Owner' : 'Tenant',
      salary: '', phone: '', hire_date: new Date().toISOString().slice(0, 10),
      occupation: '', rental_purpose: '', gender: '', age: '', rental_end_date: '', agreed_amount: '',
    });
  }

  async function handleSubmitMember(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId || !workerForm.full_name.trim()) return;

    const insertData: any = {
      business_id: businessId,
      full_name: toTitleCase(workerForm.full_name.trim()),
      rank: workerForm.rank,
      salary: parseFloat(workerForm.salary) || 0,
      phone: workerForm.phone.trim(),
      hire_date: workerForm.hire_date,
      is_active: true,
      payment_frequency: 'monthly',
      next_payment_due: workerForm.rental_end_date || new Date().toISOString().slice(0, 10),
      gender: workerForm.gender,
      age: workerForm.age ? parseInt(workerForm.age) : null,
      occupation: workerForm.occupation.trim(),
      rental_purpose: workerForm.rental_purpose.trim(),
      rental_end_date: workerForm.rental_end_date || null,
      agreed_amount: parseFloat(workerForm.agreed_amount) || 0,
    };

    const { error } = await supabase.from('business_team_members').insert(insertData);
    if (error) { toast.error(error.message); return; }
    toast.success(`${workerForm.rank} added!`);
    resetForm();
    setShowAddDialog(false);
    loadTeamWorkers();
  }

  async function handleEditMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editWorkerId) return;
    const { error } = await supabase.from('business_team_members').update({
      full_name: toTitleCase(workerForm.full_name.trim()),
      rank: workerForm.rank,
      salary: parseFloat(workerForm.salary) || 0,
      phone: workerForm.phone.trim(),
      hire_date: workerForm.hire_date,
      gender: workerForm.gender,
      age: workerForm.age ? parseInt(workerForm.age) : null,
      occupation: workerForm.occupation.trim(),
      rental_purpose: workerForm.rental_purpose.trim(),
      rental_end_date: workerForm.rental_end_date || null,
      agreed_amount: parseFloat(workerForm.agreed_amount) || 0,
    } as any).eq('id', editWorkerId);
    if (error) { toast.error(error.message); return; }
    toast.success('Updated!');
    resetForm(); setEditWorkerId(null);
    loadTeamWorkers();
  }

  function openEdit(w: TeamMember) {
    setWorkerForm({
      full_name: w.full_name, rank: w.rank, salary: String(w.salary), phone: w.phone,
      hire_date: w.hire_date, occupation: w.occupation || '', rental_purpose: w.rental_purpose || '',
      gender: w.gender || '', age: w.age ? String(w.age) : '', rental_end_date: w.rental_end_date || '',
      agreed_amount: w.agreed_amount ? String(w.agreed_amount) : '',
    });
    setAddType(w.rank === TENANT_RANK ? 'tenant' : (w.rank === LANDLORD_RANK || w.rank === 'Landlord') ? 'owner' : 'staff');
    setEditWorkerId(w.id);
  }

  async function deleteWorker(id: string) {
    const worker = teamWorkers.find(w => w.id === id);
    await supabase.from('business_team_members').delete().eq('id', id);
    // Also remove matching membership by name
    if (worker && businessId) {
      const matchedMember = members.find(m => m.full_name?.toLowerCase() === worker.full_name.toLowerCase());
      if (matchedMember) {
        await supabase.from('business_memberships').delete()
          .eq('user_id', matchedMember.user_id).eq('business_id', businessId);
      }
    }
    toast.success('Removed');
    loadTeamWorkers();
    loadMembers();
  }

  function ConfirmDeleteButton({ onConfirm, label = 'Remove', name = '' }: { onConfirm: () => void; label?: string; name?: string }) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {name || 'this person'}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. They will lose access if they are an app user.</AlertDialogDescription>
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
  const tenants = activeWorkers.filter(w => w.rank === TENANT_RANK);
  const landlords = activeWorkers.filter(w => w.rank === LANDLORD_RANK || w.rank === 'Landlord');
  const staff = activeWorkers.filter(w => w.rank !== TENANT_RANK && w.rank !== LANDLORD_RANK && w.rank !== 'Landlord');

  const myMembership = members.find(m => m.user_id === user?.id);
  const myJoinDate = memberships.find(m => m.business_id === currentBusiness?.id && m.user_id === user?.id)?.created_at;
  const tenure = myJoinDate ? Math.floor((Date.now() - new Date(myJoinDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const tenureLabel = tenure < 30 ? `${tenure} days` : tenure < 365 ? `${Math.floor(tenure / 30)} months` : `${Math.floor(tenure / 365)} yr`;

  function getRanksForType() {
    if (addType === 'tenant') return [TENANT_RANK];
    if (addType === 'owner') return [LANDLORD_RANK];
    return STAFF_RANKS;
  }

  function openAddDialog(type: 'staff' | 'tenant' | 'owner') {
    setAddType(type);
    setWorkerForm({
      full_name: '', rank: type === 'staff' ? 'Caretaker' : type === 'owner' ? 'Asset Owner' : 'Tenant',
      salary: '', phone: '', hire_date: new Date().toISOString().slice(0, 10),
      occupation: '', rental_purpose: '', gender: '', age: '', rental_end_date: '', agreed_amount: '',
    });
    setShowAddDialog(true);
  }

  // Tenant/Landlord card with full details
  function PersonCard({ person, showDelete }: { person: TeamMember; showDelete: boolean }) {
    const isTenant = person.rank === TENANT_RANK;
    const renterBookings = bookings.filter(b => b.renter_name?.toLowerCase() === person.full_name.toLowerCase());
    const payerBehavior = getPayerScore(renterBookings);
    const endDate = person.rental_end_date ? new Date(person.rental_end_date) : null;
    const daysToEnd = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    const isExpiringSoon = daysToEnd !== null && daysToEnd <= 7 && daysToEnd >= 0;
    const isExpired = daysToEnd !== null && daysToEnd < 0;

    return (
      <Card className={`shadow-card ${isExpired ? 'border-destructive/40' : isExpiringSoon ? 'border-warning/40' : ''}`}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm ${isTenant ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                {isTenant ? '🏠' : '🔑'}
              </div>
              <div>
                <p className="text-sm font-semibold">{person.full_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {person.gender && `${person.gender}`}{person.age ? `, ${person.age} yrs` : ''}
                  {person.phone && ` · 📞 ${person.phone}`}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {daysToEnd !== null && (
                <Badge variant={isExpired ? 'destructive' : isExpiringSoon ? 'secondary' : 'outline'} className="text-[10px]">
                  {isExpired ? `⚠️ Expired ${Math.abs(daysToEnd)}d ago` : isExpiringSoon ? `⏰ ${daysToEnd}d left` : `${daysToEnd}d left`}
                </Badge>
              )}
              {isTenant && renterBookings.length > 0 && (
                <span className={`text-[10px] font-semibold ${payerBehavior.color}`}>{payerBehavior.score}</span>
              )}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {person.occupation && (
              <div className="p-1.5 rounded bg-muted/40"><span className="text-muted-foreground">Work:</span> <span className="font-medium">{person.occupation}</span></div>
            )}
            {person.rental_purpose && (
              <div className="p-1.5 rounded bg-muted/40"><span className="text-muted-foreground">Purpose:</span> <span className="font-medium">{person.rental_purpose}</span></div>
            )}
            <div className="p-1.5 rounded bg-muted/40"><span className="text-muted-foreground">Start:</span> <span className="font-medium">{new Date(person.hire_date).toLocaleDateString()}</span></div>
            {person.rental_end_date && (
              <div className="p-1.5 rounded bg-muted/40"><span className="text-muted-foreground">End:</span> <span className="font-medium">{new Date(person.rental_end_date).toLocaleDateString()}</span></div>
            )}
            {(person.agreed_amount || 0) > 0 && (
              <div className="p-1.5 rounded bg-primary/5 col-span-2"><span className="text-muted-foreground">Agreed Amount:</span> <span className="font-semibold text-primary">{fmt(Number(person.agreed_amount))}</span></div>
            )}
          </div>

          {showDelete && (
            <div className="flex gap-1 pt-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => openEdit(person)}><Edit2 className="h-3 w-3 mr-1" /> Edit</Button>
              <ConfirmDeleteButton onConfirm={() => deleteWorker(person.id)} name={person.full_name} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Property Team</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your property relationships — tenants, asset owners & staff</p>
      </div>

      {/* VIEW MODE SELECTOR */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setViewMode('tenant')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${viewMode === 'tenant' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏠</span>
            <span className="font-semibold text-sm">I'm a Tenant</span>
          </div>
          <p className="text-[11px] text-muted-foreground">I rent properties, vehicles, or vessels from others</p>
        </button>
        <button onClick={() => setViewMode('owner')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${viewMode === 'owner' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔑</span>
            <span className="font-semibold text-sm">I'm an Asset Owner</span>
          </div>
          <p className="text-[11px] text-muted-foreground">I own properties, vehicles, or vessels and rent them out</p>
        </button>
      </div>

      {/* Own profile for non-owners */}
      {!isOwnerOrAdmin && myMembership && (
        <Card className="shadow-card border-primary/20">
          <CardContent className="p-4">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-3"><User className="h-4 w-4" /> My Details</h2>
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

      {/* Workers/non-owners see join section, owners don't need it */}
      {!isOwnerOrAdmin && <WorkerJoinSection onJoined={() => { loadMembers(); loadTeamWorkers(); }} />}
      <AdSpace variant="banner" />

      {/* ========= TENANT VIEW ========= */}
      {viewMode === 'tenant' && (
        <div className="space-y-4">
          <Tabs defaultValue="my-landlords" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-landlords" className="text-xs">🔑 My Asset Owners</TabsTrigger>
              <TabsTrigger value="my-payments" className="text-xs">💰 My Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="my-landlords" className="space-y-4 mt-4">
              <Card className="shadow-card border-dashed border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <h2 className="text-base font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> Add My Asset Owner</h2>
                  <p className="text-sm text-muted-foreground">
                    If the asset owner uses this app, ask them for their invite code and enter it above.
                    Otherwise, add them manually below.
                  </p>
                  <Button onClick={() => openAddDialog('owner')} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> Add Asset Owner Manually
                  </Button>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold">My Asset Owners</h3>
                <Badge variant="secondary" className="text-[10px]">{landlords.length}</Badge>
              </div>

              {landlords.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
                  <Key className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  No asset owners added yet. Use an invite code or add manually.
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {landlords.map(l => <PersonCard key={l.id} person={l} showDelete={true} />)}
                </div>
              )}

              {/* Tenant: Generate code so the asset owner can add me */}
              <Card className="shadow-card border-dashed">
                <CardContent className="p-4 space-y-3">
                  <h2 className="text-base font-semibold flex items-center gap-2"><Share2 className="h-4 w-4" /> Share My Code with Asset Owner</h2>
                  <p className="text-sm text-muted-foreground">Generate a code and give it to the asset owner so they can add you as a tenant on their app.</p>
                  {workerCode ? (
                    <div className="space-y-2">
                      <div className="rounded-lg p-3 text-center bg-primary/5">
                        <span className="text-2xl font-mono font-bold tracking-widest">{workerCode}</span>
                        <p className="text-xs text-muted-foreground mt-1">🔐 Give this code to your asset owner — Expires in 7 days</p>
                      </div>
                      <ShareButtons code={workerCode} />
                    </div>
                  ) : (
                    <Button onClick={handleGenerateCode} disabled={loading}><UserPlus className="h-4 w-4 mr-2" /> Generate My Code</Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="my-payments" className="mt-4 space-y-4">
              <RentalPaymentsSection bookings={bookings} assets={assets} isOwnerOrAdmin={false} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ========= ASSET OWNER VIEW ========= */}
      {viewMode === 'owner' && (
        <div className="space-y-4">
          <Tabs defaultValue="tenants" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tenants" className="text-xs">🏠 My Tenants</TabsTrigger>
              <TabsTrigger value="staff" className="text-xs">👷 Staff ({staff.length}/{MAX_STAFF})</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs">💰 Payments</TabsTrigger>
            </TabsList>

            {/* TENANTS TAB */}
            <TabsContent value="tenants" className="space-y-4 mt-4">
              <Card className="shadow-card border-dashed border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <h2 className="text-base font-semibold flex items-center gap-2"><Home className="h-4 w-4" /> Add a Tenant / Renter</h2>
                  <p className="text-sm text-muted-foreground">
                    Add renters for your properties, vehicles <Car className="inline h-3 w-3" />, or vessels <Ship className="inline h-3 w-3" />. 
                    Use their invite code if they have the app, or add manually.
                  </p>
                  <Button onClick={() => openAddDialog('tenant')} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Tenant Manually</Button>
                </CardContent>
              </Card>

              {/* Owner: Generate invite code for tenant to join the app */}
              {isOwnerOrAdmin && (
                <Card className="shadow-card border-dashed">
                  <CardContent className="p-4 space-y-3">
                    <h2 className="text-base font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Invite Tenant to App</h2>
                    <p className="text-sm text-muted-foreground">Generate a code and share it with a tenant who uses this app, so they can access your property profile.</p>
                    {workerCode ? (
                      <div className="space-y-2">
                        <div className="rounded-lg p-3 text-center bg-primary/5">
                          <span className="text-2xl font-mono font-bold tracking-widest">{workerCode}</span>
                          <p className="text-xs text-muted-foreground mt-1">🔐 Share this code with your tenant — Expires in 7 days</p>
                        </div>
                        <ShareButtons code={workerCode} />
                      </div>
                    ) : (
                      <Button onClick={handleGenerateCode} disabled={loading}><UserPlus className="h-4 w-4 mr-2" /> Generate Tenant Invite Code</Button>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold">Tenants / Renters</h3>
                <Badge variant="secondary" className="text-[10px]">{tenants.length}</Badge>
              </div>

              {tenants.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
                  <Home className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  No tenants registered yet
                </CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {tenants.map(t => <PersonCard key={t.id} person={t} showDelete={isOwnerOrAdmin} />)}
                </div>
              )}
            </TabsContent>

            {/* STAFF TAB */}
            <TabsContent value="staff" className="space-y-4 mt-4">
              {isOwnerOrAdmin && (
                <>
                  <Button onClick={() => {
                    if (staff.length >= MAX_STAFF) { toast.info(`You can add up to ${MAX_STAFF} staff members.`); return; }
                    openAddDialog('staff');
                  }} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Staff ({staff.length}/{MAX_STAFF})</Button>

                  <Card className="shadow-card border-dashed">
                    <CardContent className="p-4 space-y-3">
                      <h2 className="text-base font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Invite Staff via Code</h2>
                      {workerCode ? (
                        <div className="space-y-2">
                          <div className="rounded-lg p-3 text-center bg-primary/5">
                            <span className="text-2xl font-mono font-bold tracking-widest">{workerCode}</span>
                            <p className="text-xs text-muted-foreground mt-1">🔐 Expires in 7 days</p>
                          </div>
                          <ShareButtons code={workerCode} />
                        </div>
                      ) : (
                        <Button onClick={handleGenerateCode} disabled={loading}><UserPlus className="h-4 w-4 mr-2" /> Generate Staff Code</Button>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* App users (members) */}
              {members.filter(m => m.role !== 'owner').length > 0 && (
                <div className="space-y-2">
                  {members.filter(m => m.role !== 'owner').map(member => (
                    <Card key={member.user_id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          <div>
                            <p className="text-sm font-medium">{member.full_name || 'Unknown'}</p>
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">📱 App User</Badge>
                              <span className="text-xs text-muted-foreground">{member.role}</span>
                            </div>
                          </div>
                        </div>
                        {isOwnerOrAdmin && member.role !== 'owner' && (
                          <div className="flex items-center gap-2">
                            <Select value={member.role} onValueChange={v => handleRoleChange(member.user_id, v)}>
                              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="worker">Worker</SelectItem>
                              </SelectContent>
                            </Select>
                            <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {member.full_name}?</AlertDialogTitle><AlertDialogDescription>This will revoke their app access. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemove(member.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {staff.length === 0 && members.filter(m => m.role !== 'owner').length === 0 ? (
                <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No staff members yet.</CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {staff.map(s => (
                    <Card key={s.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm">👷</div>
                          <div>
                            <p className="text-sm font-medium">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.rank}{s.phone && ` · 📞 ${s.phone}`}</p>
                            {isOwnerOrAdmin && s.salary > 0 && <p className="text-xs text-success">{fmt(Number(s.salary))}/mo</p>}
                          </div>
                        </div>
                        {isOwnerOrAdmin && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <ConfirmDeleteButton onConfirm={() => deleteWorker(s.id)} name={s.full_name} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PAYMENTS TAB */}
            <TabsContent value="payments" className="mt-4 space-y-4">
              <RentalPaymentsSection bookings={bookings} assets={assets} isOwnerOrAdmin={isOwnerOrAdmin} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Add/Edit Dialog — Full tenant/landlord form */}
      <Dialog open={showAddDialog || !!editWorkerId} onOpenChange={o => { if (!o) { setShowAddDialog(false); setEditWorkerId(null); resetForm(); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editWorkerId ? 'Edit Member' : `Add ${addType === 'tenant' ? 'Tenant / Renter' : addType === 'owner' ? 'Asset Owner' : 'Staff Member'}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editWorkerId ? handleEditMember : handleSubmitMember} className="space-y-3">
            <div><Label>Full Name *</Label><Input value={workerForm.full_name} onChange={e => setWorkerForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={workerForm.rank} onValueChange={v => setWorkerForm(f => ({ ...f, rank: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{getRanksForType().map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Phone</Label><Input value={workerForm.phone} onChange={e => setWorkerForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>

            {/* Gender & Age — for tenant and landlord */}
            {(addType === 'tenant' || addType === 'owner') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={workerForm.gender} onValueChange={v => setWorkerForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Age</Label><Input type="number" min="0" max="150" value={workerForm.age} onChange={e => setWorkerForm(f => ({ ...f, age: e.target.value }))} placeholder="e.g. 30" /></div>
              </div>
            )}

            {/* Occupation & Purpose — for tenants */}
            {addType === 'tenant' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Occupation</Label><Input value={workerForm.occupation} onChange={e => setWorkerForm(f => ({ ...f, occupation: e.target.value }))} placeholder="e.g. Farmer, Teacher" /></div>
                <div><Label>Purpose of Renting</Label><Input value={workerForm.rental_purpose} onChange={e => setWorkerForm(f => ({ ...f, rental_purpose: e.target.value }))} placeholder="e.g. Farming, Storage" /></div>
              </div>
            )}

            {/* Start & End dates — for tenant and landlord */}
            {(addType === 'tenant' || addType === 'owner') && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date *</Label><Input type="date" value={workerForm.hire_date} onChange={e => setWorkerForm(f => ({ ...f, hire_date: e.target.value }))} required /></div>
                <div><Label>End / Expiry Date</Label><Input type="date" value={workerForm.rental_end_date} onChange={e => setWorkerForm(f => ({ ...f, rental_end_date: e.target.value }))} /></div>
              </div>
            )}

            {/* Agreed amount — for tenant and landlord */}
            {(addType === 'tenant' || addType === 'owner') && (
              <div><Label>Agreed Amount (per period)</Label><Input type="number" min="0" step="0.01" value={workerForm.agreed_amount} onChange={e => setWorkerForm(f => ({ ...f, agreed_amount: e.target.value }))} placeholder="Rental amount agreed upon" /></div>
            )}

            {/* Salary — for staff */}
            {addType === 'staff' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Monthly Salary</Label><Input type="number" min="0" step="0.01" value={workerForm.salary} onChange={e => setWorkerForm(f => ({ ...f, salary: e.target.value }))} /></div>
                <div><Label>Start Date</Label><Input type="date" value={workerForm.hire_date} onChange={e => setWorkerForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
              </div>
            )}

            <Button type="submit" className="w-full">{editWorkerId ? 'Save Changes' : `Add ${addType === 'tenant' ? 'Tenant' : addType === 'owner' ? 'Asset Owner' : 'Staff'}`}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
