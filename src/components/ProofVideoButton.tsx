import { useState, useEffect, useCallback } from 'react';
import { Video, VideoOff, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { toast } from 'sonner';
import ProofVideoRecorder from './ProofVideoRecorder';

export default function ProofVideoButton() {
  const { user } = useAuth();
  const { currentBusiness, userRole } = useBusiness();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [alertPulse, setAlertPulse] = useState(false);

  const businessId = currentBusiness?.id;
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

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
      .limit(1) as any;
    
    if (data && data.length > 0) {
      const req = data[0];
      // Workers see requests; owner/admin see their own only if they didn't create it
      if (!isOwnerOrAdmin || req.requested_by !== user.id) {
        setPendingRequest(req);
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
  }, [businessId, loadPendingRequest]);

  // Play alert sound when new request comes in
  useEffect(() => {
    if (alertPulse && pendingRequest) {
      // Vibrate if available
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, [alertPulse, pendingRequest]);

  async function handleSendRequest() {
    if (!businessId || !user) return;
    setSending(true);
    const { error } = await supabase.from('video_requests').insert({
      business_id: businessId,
      requested_by: user.id,
      message: message || 'Please record a proof video',
      status: 'pending',
      target_role: 'worker',
    } as any);
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Video request sent! Workers will be notified.');
    setMessage('');
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

  // WORKER VIEW: Show alert when there's a pending request
  if (!isOwnerOrAdmin && pendingRequest) {
    return (
      <>
        <button
          onClick={handleStartRecording}
          className={`fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all ${
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
          onClick={() => setRequestDialogOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] flex items-center gap-2 px-3 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
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
              Send a request to your workers/tenants to record a 2-minute proof video. They will see an alert and can record directly. The video saves to their device — no storage used in the app.
            </p>
            <Textarea
              placeholder="What should the video show? (e.g., Show current stock, Show property condition...)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="text-sm"
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSendRequest} disabled={sending}>
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
