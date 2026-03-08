import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Search, Plus, Building2, Phone, Mail, MapPin, Factory, Trash2, Edit2, UserPlus, ExternalLink } from 'lucide-react';

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

export default function ContactsPage() {
  const { currentBusiness, userRole } = useBusiness();
  const [contacts, setContacts] = useState<(BusinessContact & { profile?: BusinessProfile })[]>([]);
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

    // Fetch profiles for each contact
    const contactsWithProfiles = await Promise.all(
      (data || []).map(async (c: any) => {
        const { data: profile } = await supabase
          .rpc('lookup_business_by_code', { _code: '' })
          // We can't lookup by code here, so query businesses directly via the contact_business_id
          // But RLS might block this. Let's use a different approach - store info at add time
          // For now, let's try fetching from businesses table
        ;
        // Actually, let's query the business directly since we have the ID
        // The user might not have access via RLS. Let's use the lookup function differently.
        // We'll fetch all contact business details in one go
        return { ...c } as BusinessContact & { profile?: BusinessProfile };
      })
    );

    // Batch fetch contact business profiles using a workaround
    // Since we can't directly query businesses we're not members of,
    // we'll store the profile info in the contacts or use the lookup function
    // For now let's try a direct query (businesses table RLS requires membership)
    // Better approach: fetch via the lookup function using business_code
    
    // Let's get business codes for the contact businesses
    // Actually the cleanest way: create an edge function or just store profile data
    // For MVP: let's query what we can and handle gracefully
    
    const contactIds = (data || []).map((c: any) => c.contact_business_id);
    if (contactIds.length > 0) {
      // Try to get business info - this may fail for businesses we're not members of
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id, name, business_type, address, contact, email, logo_url')
        .in('id', contactIds);
      
      const bizMap = new Map((bizData || []).map(b => [b.id, b]));
      
      const enriched = (data || []).map((c: any) => ({
        ...c,
        profile: bizMap.get(c.contact_business_id) || undefined,
      }));
      
      setContacts(enriched);
    } else {
      setContacts(data || []);
    }
    
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
    
    // Don't allow adding yourself
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
    
    // Check if already a contact
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

    if (error) {
      toast.error('Failed to add contact: ' + error.message);
      return;
    }

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

    if (error) {
      toast.error('Failed to update');
      return;
    }
    toast.success('Contact updated');
    setEditingContact(null);
    loadContacts();
  }

  async function handleDeleteContact(contactId: string) {
    const { error } = await supabase
      .from('business_contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      toast.error('Failed to remove contact');
      return;
    }
    toast.success('Contact removed');
    loadContacts();
  }

  const isFactory = (currentBusiness as any)?.business_type === 'factory';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Business Contacts
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect with other businesses using their Business Code
          </p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setFoundBusiness(null);
            setSearchCode('');
            setNickname('');
            setContactNotes('');
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Contact</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Find & Add Business</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search by code */}
              <div>
                <Label>Business Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={searchCode}
                    onChange={e => setSearchCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AB3XK9MN"
                    className="font-mono tracking-widest text-center"
                    maxLength={8}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching} size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the 8-character code from another business's settings
                </p>
              </div>

              {/* Found business preview */}
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
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {foundBusiness.business_type === 'factory' ? 'Factory' : 'Business'}
                        </span>
                      </div>
                    </div>

                    {foundBusiness.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {foundBusiness.address}
                      </div>
                    )}
                    {foundBusiness.contact && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {foundBusiness.contact}
                      </div>
                    )}
                    {foundBusiness.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {foundBusiness.email}
                      </div>
                    )}

                    <Separator />

                    <div>
                      <Label className="text-xs">Nickname (optional)</Label>
                      <Input value={nickname} onChange={e => setNickname(e.target.value)}
                        placeholder="e.g. My Supplier" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Notes (optional)</Label>
                      <Input value={contactNotes} onChange={e => setContactNotes(e.target.value)}
                        placeholder="e.g. Best prices on electronics" className="mt-1" />
                    </div>

                    <Button onClick={handleAddContact} className="w-full">
                      <UserPlus className="h-4 w-4 mr-2" /> Save to Contacts
                    </Button>
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
            <p className="text-xs text-muted-foreground font-medium">Your Business Code</p>
            <p className="text-2xl font-mono font-bold tracking-[0.3em] text-primary">
              {(currentBusiness as any)?.business_code || '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Share this code so others can find and connect with you</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            const code = (currentBusiness as any)?.business_code;
            if (code) {
              navigator.clipboard.writeText(code);
              toast.success('Code copied!');
            }
          }}>
            Copy
          </Button>
        </CardContent>
      </Card>

      {/* Contacts List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium text-muted-foreground">No contacts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add other businesses by entering their Business Code
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map(contact => (
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
                            {contact.profile?.business_type === 'factory' ? '🏭' : '🏪'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">
                            {contact.nickname || contact.profile?.name || 'Unknown Business'}
                          </p>
                          {contact.nickname && contact.profile?.name && (
                            <p className="text-xs text-muted-foreground">{contact.profile.name}</p>
                          )}
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                            {contact.profile?.business_type === 'factory' ? 'Factory' : 'Business'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => {
                            if (contact.profile) setViewProfile(contact.profile);
                          }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => {
                            setEditingContact(contact.id);
                            setEditNickname(contact.nickname);
                            setEditNotes(contact.notes);
                          }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {(userRole === 'owner' || userRole === 'admin') && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteContact(contact.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
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
          ))}
        </div>
      )}

      {/* View Profile Dialog */}
      <Dialog open={!!viewProfile} onOpenChange={(open) => !open && setViewProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Business Profile</DialogTitle>
          </DialogHeader>
          {viewProfile && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {viewProfile.logo_url ? (
                  <img src={viewProfile.logo_url} alt="" className="h-16 w-16 rounded-full object-cover border" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-3xl">
                    {viewProfile.business_type === 'factory' ? '🏭' : '🏪'}
                  </div>
                )}
                <div>
                  <p className="text-xl font-bold">{viewProfile.name}</p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {viewProfile.business_type === 'factory' ? 'Factory' : 'Business'}
                  </span>
                </div>
              </div>
              <Separator />
              {viewProfile.address && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {viewProfile.address}
                </div>
              )}
              {viewProfile.contact && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${viewProfile.contact}`} className="text-primary underline">{viewProfile.contact}</a>
                </div>
              )}
              {viewProfile.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${viewProfile.email}`} className="text-primary underline">{viewProfile.email}</a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
