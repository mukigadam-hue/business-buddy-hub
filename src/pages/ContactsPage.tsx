import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import { usePremium } from '@/hooks/usePremium';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Building2, Phone, Mail, MapPin, Trash2, Edit2, UserPlus, ExternalLink, HandMetal, Clock, ArrowUpDown, MessageSquare, Send, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AdSpace from '@/components/AdSpace';

interface BusinessContact {
  id: string;
  business_id: string;
  contact_business_id: string;
  nickname: string;
  notes: string;
  created_at: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  business_type: string;
  address: string;
  contact: string;
  email: string;
  logo_url: string | null;
}

interface EnrichedContact extends BusinessContact {
  profile?: BusinessProfile;
  lastInteraction?: string | null;
  orderCount?: number;
}

export default function ContactsPage() {
  const { currentBusiness, userRole } = useBusiness();
  const { maxContacts } = usePremium();
  const [contacts, setContacts] = useState<EnrichedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundBusiness, setFoundBusiness] = useState<BusinessProfile | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [viewProfile, setViewProfile] = useState<BusinessProfile | null>(null);
  const [pokingId, setPokingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [filterQuery, setFilterQuery] = useState('');
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<EnrichedContact | null>(null); // null = send to all
  const [customMessage, setCustomMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const businessId = currentBusiness?.id;

  useEffect(() => {
    if (businessId) loadContacts();
  }, [businessId]);

  async function loadContacts() {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('business_contacts')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load contacts');
      setLoading(false);
      return;
    }

    const contactIds = (data || []).map((c: any) => c.contact_business_id);
    
    let bizMap = new Map<string, BusinessProfile>();
    if (contactIds.length > 0) {
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id, name, business_type, address, contact, email, logo_url')
        .in('id', contactIds);
      bizMap = new Map((bizData || []).map(b => [b.id, b as BusinessProfile]));
    }

    // Fetch last interaction dates from shared_orders
    let interactionMap = new Map<string, { lastDate: string; count: number }>();
    if (contactIds.length > 0) {
      // Orders we sent to them
      const { data: sentOrders } = await supabase
        .from('shared_orders')
        .select('to_business_id, created_at')
        .eq('from_business_id', businessId)
        .in('to_business_id', contactIds)
        .order('created_at', { ascending: false });

      // Orders they sent to us
      const { data: receivedOrders } = await supabase
        .from('shared_orders')
        .select('from_business_id, created_at')
        .eq('to_business_id', businessId)
        .in('from_business_id', contactIds)
        .order('created_at', { ascending: false });

      // Merge both directions
      const allInteractions: { contactId: string; date: string }[] = [];
      (sentOrders || []).forEach(o => allInteractions.push({ contactId: o.to_business_id, date: o.created_at }));
      (receivedOrders || []).forEach(o => allInteractions.push({ contactId: o.from_business_id, date: o.created_at }));

      // Group by contact
      for (const item of allInteractions) {
        const existing = interactionMap.get(item.contactId);
        if (!existing) {
          interactionMap.set(item.contactId, { lastDate: item.date, count: 1 });
        } else {
          existing.count++;
          if (item.date > existing.lastDate) existing.lastDate = item.date;
        }
      }
    }

    const enriched: EnrichedContact[] = (data || []).map((c: any) => {
      const interaction = interactionMap.get(c.contact_business_id);
      return {
        ...c,
        profile: bizMap.get(c.contact_business_id) || undefined,
        lastInteraction: interaction?.lastDate || null,
        orderCount: interaction?.count || 0,
      };
    });

    setContacts(enriched);
    setLoading(false);
  }

  async function handleSearch() {
    if (!searchCode.trim() || searchCode.trim().length < 4) {
      toast.error('Enter a valid business code (at least 4 characters)');
      return;
    }
    setSearching(true);
    setFoundBusiness(null);

    const { data, error } = await supabase.rpc('lookup_business_by_code', {
      _code: searchCode.trim().toUpperCase(),
    });

    if (error || !data || data.length === 0) {
      toast.error('No business found with that code');
      setSearching(false);
      return;
    }

    const biz = data[0] as BusinessProfile;
    if (biz.id === businessId) {
      toast.error("That's your own business code!");
      setSearching(false);
      return;
    }

    setFoundBusiness(biz);
    setSearching(false);
  }

  async function handleAddContact() {
    if (!foundBusiness || !businessId) return;
    const existing = contacts.find(c => c.contact_business_id === foundBusiness.id);
    if (existing) {
      toast.error('This business is already in your contacts');
      return;
    }

    const { error } = await supabase.from('business_contacts').insert({
      business_id: businessId,
      contact_business_id: foundBusiness.id,
      nickname: nickname.trim(),
      notes: contactNotes.trim(),
    } as any);

    if (error) { toast.error('Failed to add contact: ' + error.message); return; }

    toast.success(`${foundBusiness.name} added to contacts!`);
    setFoundBusiness(null);
    setSearchCode('');
    setNickname('');
    setContactNotes('');
    setAddDialogOpen(false);
    loadContacts();
  }

  async function handleUpdateContact(contactId: string) {
    const { error } = await supabase
      .from('business_contacts')
      .update({ nickname: editNickname.trim(), notes: editNotes.trim() } as any)
      .eq('id', contactId);
    if (error) { toast.error('Failed to update'); return; }
    toast.success('Contact updated');
    setEditingContact(null);
    loadContacts();
  }

  async function handleDeleteContact(contactId: string) {
    const { error } = await supabase.from('business_contacts').delete().eq('id', contactId);
    if (error) { toast.error('Failed to remove contact'); return; }
    toast.success('Contact removed');
    loadContacts();
  }

  async function handlePoke(contact: EnrichedContact) {
    if (!currentBusiness || !contact.contact_business_id) return;
    setPokingId(contact.id);
    try {
      const res = await supabase.functions.invoke('poke-business', {
        body: {
          senderBusinessId: currentBusiness.id,
          recipientBusinessId: contact.contact_business_id,
          senderBusinessName: currentBusiness.name,
        },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message || 'Failed to send poke');
      } else {
        toast.success(`👋 Poke sent to ${contact.nickname || contact.profile?.name || 'business'}!`);
      }
    } catch (err: any) {
      toast.error('Failed to send poke');
    } finally {
      setPokingId(null);
    }
  }

  function getInteractionLabel(lastDate: string | null | undefined) {
    if (!lastDate) return { text: 'No interactions yet', color: 'text-muted-foreground', stale: true };
    const daysDiff = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 3) return { text: formatDistanceToNow(new Date(lastDate), { addSuffix: true }), color: 'text-success', stale: false };
    if (daysDiff <= 14) return { text: formatDistanceToNow(new Date(lastDate), { addSuffix: true }), color: 'text-warning', stale: false };
    return { text: formatDistanceToNow(new Date(lastDate), { addSuffix: true }), color: 'text-destructive', stale: true };
  }

  const sortedContacts = [...contacts].sort((a, b) => {
    if (sortBy === 'recent') {
      // Contacts with interactions first, sorted by most recent
      if (a.lastInteraction && !b.lastInteraction) return -1;
      if (!a.lastInteraction && b.lastInteraction) return 1;
      if (a.lastInteraction && b.lastInteraction) return b.lastInteraction.localeCompare(a.lastInteraction);
      return b.created_at.localeCompare(a.created_at);
    }
    const nameA = (a.nickname || a.profile?.name || '').toLowerCase();
    const nameB = (b.nickname || b.profile?.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const isProperty = (currentBusiness as any)?.business_type === 'property';
  const contactLabel = isProperty ? 'Partners & Contacts' : 'Business Contacts';
  const contactDesc = isProperty
    ? 'Connect with landlords, tenants, agents and service providers using their Code'
    : 'Connect with other businesses using their Business Code';
  const codeLabel = isProperty ? 'Your Property Code' : 'Your Business Code';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> {contactLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            {contactDesc}
          </p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) { setFoundBusiness(null); setSearchCode(''); setNickname(''); setContactNotes(''); }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={(e) => {
              if (contacts.length >= maxContacts) {
                e.preventDefault();
                toast.info(`Free plan allows up to ${maxContacts} contacts. Upgrade to Premium ($52/year) for unlimited.`);
              }
            }}><Plus className="h-4 w-4 mr-1" /> Add Contact</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Find & Add Business</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Business Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={searchCode} onChange={e => setSearchCode(e.target.value.toUpperCase())} placeholder="e.g. AB3XK9MN" className="font-mono tracking-widest text-center" maxLength={8} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                  <Button onClick={handleSearch} disabled={searching} size="sm"><Search className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Enter the 8-character code from another business's settings</p>
              </div>

              {foundBusiness && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {foundBusiness.logo_url ? (
                        <img src={foundBusiness.logo_url} alt="" className="h-12 w-12 rounded-full object-cover border" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-2xl">
                          {foundBusiness.business_type === 'factory' ? '🏭' : '🏪'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-lg">{foundBusiness.name}</p>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{foundBusiness.business_type === 'factory' ? 'Factory' : 'Business'}</span>
                      </div>
                    </div>
                    {foundBusiness.address && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {foundBusiness.address}</div>}
                    {foundBusiness.contact && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {foundBusiness.contact}</div>}
                    {foundBusiness.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {foundBusiness.email}</div>}
                    <Separator />
                    <div><Label className="text-xs">Nickname (optional)</Label><Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. My Supplier" className="mt-1" /></div>
                    <div><Label className="text-xs">Notes (optional)</Label><Input value={contactNotes} onChange={e => setContactNotes(e.target.value)} placeholder="e.g. Best prices on electronics" className="mt-1" /></div>
                    <Button onClick={handleAddContact} className="w-full"><UserPlus className="h-4 w-4 mr-2" /> Save to Contacts</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Your Business Code */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{codeLabel}</p>
            <p className="text-2xl font-mono font-bold tracking-[0.3em] text-primary">{(currentBusiness as any)?.business_code || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Share this code so others can find and connect with you</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            const code = (currentBusiness as any)?.business_code;
            if (code) { navigator.clipboard.writeText(code); toast.success('Code copied!'); }
          }}>Copy</Button>
        </CardContent>
      </Card>

      {/* Search & Sort */}
      {contacts.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Search contacts..."
              className="pl-9"
            />
          </div>
          {contacts.length > 1 && (
            <div className="flex gap-2">
              <Button size="sm" variant={sortBy === 'recent' ? 'default' : 'outline'} onClick={() => setSortBy('recent')}>
                <Clock className="h-3.5 w-3.5 mr-1" /> Recent Activity
              </Button>
              <Button size="sm" variant={sortBy === 'name' ? 'default' : 'outline'} onClick={() => setSortBy('name')}>
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" /> Name
              </Button>
            </div>
          )}
        </div>
      )}

      <AdSpace variant="banner" />

      {/* Contacts List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium text-muted-foreground">No contacts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add other businesses by entering their Business Code</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sortedContacts.filter(c => {
            const q = filterQuery.toLowerCase();
            if (!q) return true;
            return (c.nickname || '').toLowerCase().includes(q) || (c.profile?.name || '').toLowerCase().includes(q) || (c.profile?.contact || '').toLowerCase().includes(q);
          }).map(contact => {
            const interaction = getInteractionLabel(contact.lastInteraction);
            return (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {editingContact === contact.id ? (
                    <div className="space-y-2">
                      <Input value={editNickname} onChange={e => setEditNickname(e.target.value)} placeholder="Nickname" />
                      <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateContact(contact.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingContact(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {contact.profile?.logo_url ? (
                            <img src={contact.profile.logo_url} alt="" className="h-10 w-10 rounded-full object-cover border" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xl">
                              {contact.profile?.business_type === 'factory' ? '🏭' : contact.profile?.business_type === 'property' ? '🏠' : '🏪'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">{contact.nickname || contact.profile?.name || 'Unknown'}</p>
                            {contact.nickname && contact.profile?.name && (
                              <p className="text-xs text-muted-foreground">{contact.profile.name}</p>
                            )}
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                              {contact.profile?.business_type === 'factory' ? 'Factory' : contact.profile?.business_type === 'property' ? 'Property' : 'Business'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (contact.profile) setViewProfile(contact.profile); }}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingContact(contact.id); setEditNickname(contact.nickname); setEditNotes(contact.notes); }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {(userRole === 'owner' || userRole === 'admin') && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteContact(contact.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Interaction info */}
                      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className={interaction.color}>{interaction.text}</span>
                          {(contact.orderCount ?? 0) > 0 && (
                            <span className="text-muted-foreground">· {contact.orderCount} order{(contact.orderCount ?? 0) !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        {interaction.stale && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            disabled={pokingId === contact.id}
                            onClick={() => handlePoke(contact)}
                          >
                            <HandMetal className="h-3 w-3" />
                            {pokingId === contact.id ? 'Sending...' : 'Poke 👋'}
                          </Button>
                        )}
                      </div>

                      {contact.notes && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">{contact.notes}</p>
                      )}
                      {contact.profile?.contact && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                          <Phone className="h-3 w-3" /> {contact.profile.contact}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Profile Dialog */}
      <Dialog open={!!viewProfile} onOpenChange={(open) => !open && setViewProfile(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Business Profile</DialogTitle></DialogHeader>
          {viewProfile && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {viewProfile.logo_url ? (
                  <img src={viewProfile.logo_url} alt="" className="h-16 w-16 rounded-full object-cover border" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-3xl">
                    {viewProfile.business_type === 'factory' ? '🏭' : viewProfile.business_type === 'property' ? '🏠' : '🏪'}
                  </div>
                )}
                <div>
                  <p className="text-xl font-bold">{viewProfile.name}</p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{viewProfile.business_type === 'factory' ? 'Factory' : viewProfile.business_type === 'property' ? 'Property' : 'Business'}</span>
                </div>
              </div>
              <Separator />
              {viewProfile.address && <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /> {viewProfile.address}</div>}
              {viewProfile.contact && <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`tel:${viewProfile.contact}`} className="text-primary underline">{viewProfile.contact}</a></div>}
              {viewProfile.email && <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${viewProfile.email}`} className="text-primary underline">{viewProfile.email}</a></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
