import { useState, useEffect } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Trash2, Shield, Crown, User, Users, ShoppingBag, MessageCircle, Share2, Send, Calendar, Clock, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import WorkerPaymentManager from '@/components/business/WorkerPaymentManager';
import AdSpace from '@/components/AdSpace';

interface Member {
  user_id: string;
  role: string;
  email: string;
  full_name: string;
}

interface Customer {
  id: string;
  user_id: string;
  customer_name: string;
  phone: string;
  created_at: string;
}

function ShareButtons({ code, type }: { code: string; type: 'worker' | 'customer' }) {
  const label = type === 'worker' ? 'Worker' : 'Customer';
  const message = `Join our business as a ${label}! Use this invite code: ${code}`;
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
      name: 'Facebook',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?quote=${encoded}`,
      bg: 'bg-blue-600 hover:bg-blue-700 text-white',
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
          Have an invite code? Enter it below to join a business as a worker or customer.
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
  const { currentBusiness, userRole, generateInviteCode, getMembers, removeMember, updateMemberRole, getCustomers, removeCustomer, memberships } = useBusiness();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workerCode, setWorkerCode] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    loadMembers();
    loadCustomers();
  }, [currentBusiness]);

  async function loadMembers() {
    const data = await getMembers();
    setMembers(data);
  }

  async function loadCustomers() {
    const data = await getCustomers();
    setCustomers(data);
  }

  async function handleGenerateCode(type: 'worker' | 'customer') {
    setLoading(true);
    const code = await generateInviteCode(type);
    if (type === 'worker') setWorkerCode(code);
    else setCustomerCode(code);
    setLoading(false);
  }

  async function handleRemove(userId: string) {
    await removeMember(userId);
    loadMembers();
  }

  async function handleRemoveCustomer(id: string) {
    await removeCustomer(id);
    loadCustomers();
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

  function InviteSection({ type, code, onGenerate }: { type: 'worker' | 'customer'; code: string | null; onGenerate: () => void }) {
    const isWorker = type === 'worker';
    return (
      <Card className="shadow-card border-dashed">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            {isWorker ? 'Invite Workers' : 'Invite Customers'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isWorker
              ? 'Generate a code to add team members who can manage stock, sales & orders.'
              : 'Generate a code for customers so they can place orders through the app.'}
          </p>
          {code ? (
            <div className="space-y-2">
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: isWorker ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--accent) / 0.3)' }}>
                <span className="text-2xl font-mono font-bold tracking-widest">{code}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {isWorker ? '🔐 Worker Code — Expires in 7 days' : '🛒 Customer Code — Expires in 7 days'}
                </p>
              </div>
              <ShareButtons code={code} type={type} />
            </div>
          ) : (
            <Button onClick={onGenerate} disabled={loading} variant={isWorker ? 'default' : 'secondary'}>
              <UserPlus className="h-4 w-4 mr-2" />
              Generate {isWorker ? 'Worker' : 'Customer'} Code
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Find current user's membership info
  const myMembership = members.find(m => m.user_id === user?.id);
  const myJoinDate = memberships.find(m => m.business_id === currentBusiness?.id && m.user_id === user?.id)?.created_at;
  const tenure = myJoinDate ? Math.floor((Date.now() - new Date(myJoinDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const tenureLabel = tenure < 30 ? `${tenure} days` : tenure < 365 ? `${Math.floor(tenure / 30)} months` : `${Math.floor(tenure / 365)} yr ${Math.floor((tenure % 365) / 30)} mo`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team & Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {currentBusiness?.name} — Manage your workers and customers
        </p>
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

      {/* Redeem Code Section — always visible */}
      <RedeemCodeSection onRedeemed={() => { loadMembers(); loadCustomers(); }} />

      <AdSpace variant="banner" />

      <Tabs defaultValue="workers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Workers
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Customers
          </TabsTrigger>
        </TabsList>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-4 mt-4">
          {isOwnerOrAdmin && (
            <InviteSection type="worker" code={workerCode} onGenerate={() => handleGenerateCode('worker')} />
          )}

          <Card className="shadow-card">
            <CardContent className="p-4">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" /> Team Members
              </h2>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No team members yet. Generate an invite code to add workers.</p>
              ) : (
                <div className="space-y-3">
                  {members.map(member => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {getRoleIcon(member.role)}
                        <div>
                          <p className="font-medium text-sm">{member.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOwnerOrAdmin && member.role !== 'owner' ? (
                          <>
                            <Select value={member.role} onValueChange={v => handleRoleChange(member.user_id, v)}>
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="worker">Worker</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => handleRemove(member.user_id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs font-medium capitalize px-2 py-1 rounded-full bg-muted">
                            {member.role}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <WorkerPaymentManager isOwnerOrAdmin={isOwnerOrAdmin} />
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4 mt-4">
          {isOwnerOrAdmin && (
            <InviteSection type="customer" code={customerCode} onGenerate={() => handleGenerateCode('customer')} />
          )}

          <Card className="shadow-card">
            <CardContent className="p-4">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" /> Customer List
              </h2>
              {customers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No customers yet. Generate an invite code to add customers.</p>
              ) : (
                <div className="space-y-3">
                  {customers.map(customer => (
                    <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{customer.customer_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{customer.phone || 'No phone'}</p>
                        </div>
                      </div>
                      {isOwnerOrAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveCustomer(customer.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
