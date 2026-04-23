import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useProperty, PropertyConversation, PropertyMessage } from '@/context/PropertyContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, ArrowLeft } from 'lucide-react';

export default function PropertyMessages() {
  const { t } = useTranslation();
  const { conversations, getMessages, sendMessage } = useProperty();
  const { user } = useAuth();
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<PropertyMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [convDetails, setConvDetails] = useState<Record<string, { renter_name: string; asset_name: string }>>({});

  // Load conversation details (renter names, asset names)
  useEffect(() => {
    async function loadDetails() {
      const details: typeof convDetails = {};
      for (const conv of conversations) {
        let renter_name = 'Unknown';
        let asset_name = 'General';
        // Get renter profile
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', conv.renter_id).single();
        if (profile) renter_name = profile.full_name || 'Unknown';
        // Get asset name
        if (conv.asset_id) {
          const { data: asset } = await supabase.from('property_assets').select('name').eq('id', conv.asset_id).single();
          if (asset) asset_name = (asset as any).name || 'Asset';
        }
        details[conv.id] = { renter_name, asset_name };
      }
      setConvDetails(details);
    }
    if (conversations.length > 0) loadDetails();
  }, [conversations]);

  useEffect(() => {
    if (activeConv) {
      loadMessages();
      // Subscribe to new messages
      const channel = supabase
        .channel(`conv-${activeConv}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'property_messages', filter: `conversation_id=eq.${activeConv}` }, () => loadMessages())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    if (!activeConv) return;
    setLoading(true);
    const msgs = await getMessages(activeConv);
    setMessages(msgs);
    setLoading(false);
  }

  async function handleSend() {
    if (!newMsg.trim() || !activeConv) return;
    await sendMessage(activeConv, newMsg.trim());
    setNewMsg('');
    loadMessages();
  }

  if (activeConv) {
    const detail = convDetails[activeConv];
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex items-center gap-2 pb-3 border-b">
          <Button variant="ghost" size="sm" onClick={() => setActiveConv(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <p className="font-semibold text-sm">{detail?.renter_name || 'Renter'}</p>
            <p className="text-xs text-muted-foreground">{detail?.asset_name || 'General'}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p className="text-sm">{msg.message}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder={t('property.typeMessagePh')}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }} />
          <Button onClick={handleSend} size="icon"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5" /> {t('property.messages', 'Messages')}</h1>
      {conversations.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('property.noConversationsYet')}</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {conversations.map(c => {
            const detail = convDetails[c.id];
            return (
              <button key={c.id} onClick={() => setActiveConv(c.id)} className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{detail?.renter_name || 'Renter'}</p>
                    <p className="text-xs text-muted-foreground">{detail?.asset_name || 'General'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(c.last_message_at).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
