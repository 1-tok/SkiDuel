import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Mail, Reply, ReplyAll, Forward, Send, Loader2, ArrowLeft, Check, ListTodo, Clock, Archive } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import RichText from '@/components/RichText';

export default function EmailModal({ email, eventId, open, onClose, onSetFate }) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('view');
  const [composeMode, setComposeMode] = useState(null);
  const [composeBody, setComposeBody] = useState('');
  const [composeTo, setComposeTo] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !email) return;
    let active = true;
    setBody(email.preview || '');
    setView('view');
    setComposeMode(null);
    setComposeBody('');
    setComposeTo('');
    if (email.gmail_id) {
      setLoading(true);
      base44.functions.invoke('getGmailBody', { gmail_id: email.gmail_id, source_account: email.source_account })
        .then(res => { if (active) { setBody(res?.body || email.preview || ''); setLoading(false); } })
        .catch(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [open, email]);

  if (!email) return null;

  const timeStr = email.timestamp ? format(parseISO(email.timestamp), 'MMM d, yyyy h:mm a') : '';

  const startCompose = (mode) => {
    setComposeMode(mode);
    if (mode === 'forward') {
      setComposeTo('');
      setComposeBody(`\n\n---------- Forwarded message ----------\nFrom: ${email.sender_email || email.sender}\nSubject: ${email.subject}\n\n${body}`);
    } else {
      setComposeBody('');
    }
    setView('compose');
  };

  const handleSend = async () => {
    if (composeMode === 'forward' && !composeTo.trim()) { toast.error('Add a recipient'); return; }
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendGmail', {
        gmail_id: email.gmail_id,
        source_account: email.source_account,
        action: composeMode,
        body: composeBody,
        to: composeTo,
      });
      if (res?.error) throw new Error(res.error);
      toast.success('Sent');
      setView('view');
      setComposeMode(null);
      setComposeBody('');
      setComposeTo('');
    } catch (e) {
      toast.error('Send failed: ' + (e.message || e));
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (o) => {
    if (o) return;
    if (view === 'view' && eventId) {
      setView('fate');
    } else {
      onClose();
    }
  };

  const applyFate = (fate) => {
    onSetFate?.(eventId, fate);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        {view === 'view' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{email.sender_email || email.sender}</span>
              </div>
              <DialogTitle className="text-base leading-snug">{email.subject}</DialogTitle>
              {timeStr && <p className="text-xs text-muted-foreground mt-1">{timeStr}</p>}
              {email.source_account && <p className="text-[10px] text-muted-foreground mt-0.5">via {email.source_account}</p>}
            </DialogHeader>

            <div className="mt-2 max-h-[55vh] overflow-y-auto rounded-md bg-muted/40 p-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading full message…
                </div>
              ) : (
                <RichText content={body || 'No content available.'} className="text-sm text-foreground/80" />
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => startCompose('reply')}><Reply className="w-4 h-4" /> Reply</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => startCompose('replyall')}><ReplyAll className="w-4 h-4" /> Reply All</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => startCompose('forward')}><Forward className="w-4 h-4" /> Forward</Button>
            </div>
          </>
        )}

        {view === 'compose' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView('view')}><ArrowLeft className="w-4 h-4" /></Button>
                <DialogTitle className="text-base">{composeMode === 'forward' ? 'Forward' : composeMode === 'replyall' ? 'Reply All' : 'Reply'}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {composeMode === 'forward' && (
                <Input placeholder="To (comma separated)" value={composeTo} onChange={e => setComposeTo(e.target.value)} />
              )}
              <div className="text-xs text-muted-foreground truncate">Re: {email.subject}</div>
              <Textarea rows={10} value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Write your message…" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setView('view')}>Cancel</Button>
                <Button size="sm" className="gap-1.5" onClick={handleSend} disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
                </Button>
              </div>
            </div>
          </>
        )}

        {view === 'fate' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">What's next for this email?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-1">It's currently a "Doing" task. Choose where it goes:</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button variant="outline" className="gap-2 justify-start h-auto py-3" onClick={() => applyFate('todo')}><ListTodo className="w-4 h-4" /> Back to To Do</Button>
              <Button variant="outline" className="gap-2 justify-start h-auto py-3" onClick={() => applyFate('doing')}><Clock className="w-4 h-4" /> Still Doing</Button>
              <Button className="gap-2 justify-start h-auto py-3 bg-emerald-600 hover:bg-emerald-600/90" onClick={() => applyFate('done')}><Check className="w-4 h-4" /> Done</Button>
              <Button variant="outline" className="gap-2 justify-start h-auto py-3" onClick={() => applyFate('past')}><Archive className="w-4 h-4" /> Retire to Past</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}