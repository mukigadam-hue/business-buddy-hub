import { useState, useEffect, useCallback } from 'react';
import { Video, VideoOff, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { toast } from 'sonner';
import ProofVideoRecorder from './ProofVideoRecorder';

interface TargetPerson {
  id: string;
  name: string;
  type: string; // 'team_member' | 'app_user'
  user_id?: string;
}

export default function ProofVideoButton() {
  const { user } = useAuth();
  const { currentBusiness, userRole } = useBusiness();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [alertPulse, setAlertPulse] = useState(false);
  const [targetPeople, setTargetPeople] = useState<TargetPerson[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');

  const businessId = currentBusiness?.id;
  const businessType = (currentBusiness as any)?.business_type || 'business';
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // Load potential targets (team members + app users)
  const loadTargets = useCallback(async () => {
    if (!businessId || !isOwnerOrAdmin) return;
    const people: TargetPerson[] = [];

    // Load app members (business_memberships)
    const { data: memberships } = await supabase
      .from('business_memberships')
      .select('user_id, role')
      .eq('business_id', businessId);

    if (memberships) {
      // Get profile names
      const userIds = memberships.filter(m => m.user_id !== user?.id).map(m => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
        if (profiles) {
          profiles.forEach(p => {
            const membership = memberships.find(m => m.user_id === p.id);
            people.push({
              id: `user_${p.id}`,
              name: p.full_name || p.email || 'Unknown',
              type: 'app_user',
              user_id: p.id,
            });
          });
        }
      }
    }

    // Load team members from the right table
    const teamTable = businessType === 'factory' ? 'factory_team_members' : 'business_team_members';
    const { data: teamMembers } = await supabase
      .from(teamTable)
      .select('id, full_name, rank, is_active')
      .eq('business_id', businessId)
      .eq('is_active', true) as any;

    if (teamMembers) {
      teamMembers.forEach((tm: any) => {
        // Avoid duplicates if already added as app user
        const alreadyAdded = people.some(p => p.name.toLowerCase() === tm.full_name.toLowerCase());
        if (!alreadyAdded) {
          people.push({
            id: `team_${tm.id}`,
            name: tm.full_name,
            type: 'team_member',
          });
        }
      });
    }

    setTargetPeople(people);
  }, [businessId, isOwnerOrAdmin, user?.id, businessType]);

  // Listen for pending video requests (for workers)
  const loadPendingRequest = useCallback(async () => {
    if (!businessId || !user) return;
    const { data } = await supabase
      .from('video_requests')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5) as any;

    if (data && data.length > 0) {
      // Find a request targeted at this user
      const myRequest = data.find((req: any) => {
        // If requested_from matches this user's ID
        if (req.requested_from === user.id) return true;
        // If no specific target set and user is not the requester
        if (!req.requested_from && req.requested_by !== user.id && !isOwnerOrAdmin) return true;
        return false;
      });

      if (myRequest) {
        setPendingRequest(myRequest);
        setAlertPulse(true);
      } else {
        setPendingRequest(null);
        setAlertPulse(false);
      }
    } else {
      setPendingRequest(null);
      setAlertPulse(false);
    }
  }, [businessId, user, isOwnerOrAdmin]);

  useEffect(() => {
    loadPendingRequest();
    if (isOwnerOrAdmin) loadTargets();
    if (!businessId) return;

    const channel = supabase
      .channel(`video-req-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'video_requests',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        loadPendingRequest();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessId, loadPendingRequest, isOwnerOrAdmin, loadTargets]);

  // Vibrate when new request comes in
  useEffect(() => {
    if (alertPulse && pendingRequest) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, [alertPulse, pendingRequest]);

  async function handleSendRequest() {
    if (!businessId || !user) return;
    if (!selectedTarget) {
      toast.error('Please select who should record the video');
      return;
    }
    setSending(true);

    // Determine the target user_id
    const target = targetPeople.find(p => p.id === selectedTarget);
    const requestedFrom = target?.user_id || null;

    const { error } = await supabase.from('video_requests').insert({
      business_id: businessId,
      requested_by: user.id,
      requested_from: requestedFrom,
      message: message || `Please record a proof video — ${target?.name || 'Worker'}`,
      status: 'pending',
      target_role: 'worker',
    } as any);
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Video request sent to ${target?.name || 'worker'}!`);
    setMessage('');
    setSelectedTarget('');
    setRequestDialogOpen(false);
  }

  async function handleStartRecording() {
    if (pendingRequest) {
      await supabase.from('video_requests').update({ status: 'recording', responded_at: new Date().toISOString() } as any).eq('id', pendingRequest.id);
    }
    setRecorderOpen(true);
    setAlertPulse(false);
  }

  async function handleRecordingComplete() {
    if (pendingRequest) {
      await supabase.from('video_requests').update({ status: 'completed' } as any).eq('id', pendingRequest.id);
      setPendingRequest(null);
    }
    toast.success('Proof video saved to your device!');
    loadPendingRequest();
  }

  if (!businessId) return null;

  // WORKER VIEW: Show alert when there's a pending request for them
  if (!isOwnerOrAdmin && pendingRequest) {
    return (
      <>
        <button
          onClick={handleStartRecording}
          className={`fixed bottom-36 right-4 md:bottom-6 md:right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all ${
            alertPulse
              ? 'bg-destructive text-destructive-foreground animate-bounce shadow-destructive/50'
              : 'bg-destructive text-destructive-foreground'
          }`}
        >
          <Bell className="h-5 w-5 animate-pulse" />
          <span className="text-sm font-bold">📹 Record Proof Video!</span>
        </button>

        <ProofVideoRecorder
          open={recorderOpen}
          onOpenChange={setRecorderOpen}
          onComplete={handleRecordingComplete}
          requestMessage={pendingRequest.message}
        />
      </>
    );
  }

  // OWNER/ADMIN VIEW: Show request button
  if (isOwnerOrAdmin) {
    return (
      <>
        <button
          onClick={() => { setRequestDialogOpen(true); loadTargets(); }}
          className="fixed bottom-36 right-4 md:bottom-6 md:right-6 z-[55] flex items-center gap-2 px-3 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
          title="Request proof video"
        >
          <Video className="h-5 w-5" />
          <span className="text-sm font-medium hidden sm:inline">Proof Video</span>
        </button>

        {/* Request Dialog */}
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Video className="h-4 w-4 text-primary" />
                📹 Request Proof Video
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Send a video request to a specific person. They will see an alert and can record directly. The video saves to their device.
            </p>

            <div>
              <Label className="text-xs font-medium">Send to *</Label>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a person..." />
                </SelectTrigger>
                <SelectContent>
                  {targetPeople.length === 0 ? (
                    <SelectItem value="__none" disabled>No team members found</SelectItem>
                  ) : (
                    targetPeople.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.type === 'app_user' ? '📱 ' : '👤 '}{p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder="What should the video show? (e.g., Show current stock, Show property condition...)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="text-sm"
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSendRequest} disabled={sending || !selectedTarget}>
                {sending ? 'Sending...' : '🔔 Send Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ProofVideoRecorder
          open={recorderOpen}
          onOpenChange={setRecorderOpen}
          onComplete={handleRecordingComplete}
        />
      </>
    );
  }

  return null;
}
