import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Mail, Reply, ReplyAll, Forward, Send, Loader2, ArrowLeft, Check, ListTodo, Clock, Archive, Paperclip, Download, Link2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getEventColor } from '@/lib/scheduling';

function b64toBlob(b64, mime) {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  const byteChars = atob(normalized);
  const len = byteChars.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const DOT = { blue: 'bg-blue-500', green: 'bg-emerald-500', purple: 'bg-purple-500', orange: 'bg-amber-500', pink: 'bg-pink-500' };

export default function EmailModal({ email, eventId, open, onClose, onSetFate, assignableEvents = [], onAssignToItem }) {
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(400);
  const [view, setView] = useState('view');
  const [composeMode, setComposeMode] = useState(null);
  const [composeBody, setComposeBody] = useState('');
  const [composeTo, setComposeTo] = useState('');
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');
  const [downloadingAtt, setDownloadingAtt] = useState(null);

  useEffect(() => {
    if (!open || !email) return;
    let active = true;
    setHtml('');
    setText(email.body || email.preview || '');
    setAttachments([]);
    setIframeHeight(400);
    setView('view');
    setComposeMode(null);
    setComposeBody('');
    setComposeTo('');
    setQuery('');
    if (email.gmail_id) {
      setLoading(true);
      base44.functions.invoke('getGmailFull', { gmail_id: email.gmail_id, source_account: email.source_account })
        .then(res => {
          if (!active) return;
          if (res?.error) { setText(email.preview || ''); setLoading(false); return; }
          setHtml(res.html || '');
          setText(res.text || email.preview || '');
          setAttachments(res.attachments || []);
          setLoading(false);
        })
        .catch(() => { if (active) { setText(email.preview || ''); setLoading(false); } });
    }
    return () => { active = false; };
  }, [open, email]);

  if (!email) return null;

  const timeStr = email.timestamp ? format(parseISO(email.timestamp), 'MMM d, yyyy h:mm a') : '';

  const startCompose = (mode) => {
    setComposeMode(mode);
    if (mode === 'forward') {
      setComposeTo('');
      setComposeBody(`\n\n---------- Forwarded message ----------\nFrom: ${email.sender_email || email.sender}\nSubject: ${email.subject}\n\n${text || html}`);
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

  const handleDownloadAttachment = async (att) => {
    setDownloadingAtt(att.attachmentId);
    try {
      const res = await base44.functions.invoke('getGmailAttachment', {
        gmail_id: email.gmail_id,
        attachment_id: att.attachmentId,
        source_account: email.source_account,
        filename: att.filename,
        mimeType: att.mimeType,
      });
      if (res?.error) throw new Error(res.error);
      const blob = b64toBlob(res.data, res.mimeType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || att.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      toast.error('Download failed: ' + (e?.message || e));
    } finally {
      setDownloadingAtt(null);
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

  const handleAssign = (item) => {
    onAssignToItem?.(email, item);
    onClose();
  };

  const assignable = assignableEvents
    .filter(e => !e.is_shared_calendar && e.status !== 'cancelled' && e.kanban_column !== 'past' && e.id !== eventId)
    .filter(e => (e.title || '').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 50);

  const srcDoc = html
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font-family:Inter,system-ui,sans-serif;font-size:14px;color:#1a1a1a;padding:12px;line-height:1.55;margin:0}img{max-width:100%;height:auto}a{color:#2563eb}table{max-width:100%}</style></head><body>${html}</body></html>`
    : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Inter,system-ui,sans-serif;font-size:14px;color:#1a1a1a;padding:12px;line-height:1.55;margin:0;white-space:pre-wrap}</style></head><body>${(text || 'No content available.').replace(/</g, '&lt;')}</body></html>`;

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

            <div className="mt-2 rounded-md overflow-hidden bg-white">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading full message…
                </div>
              ) : (
                <iframe
                  title="Email body"
                  sandbox="allow-same-origin allow-popups"
                  srcDoc={srcDoc}
                  className="w-full bg-white"
                  style={{ height: iframeHeight, border: '1px solid hsl(var(--border))' }}
                  onLoad={(e) => {
                    try {
                      const doc = e.target.contentDocument;
                      if (doc && doc.body) setIframeHeight(Math.min(doc.body.scrollHeight + 4, 520));
                    } catch {}
                  }}
                />
              )}
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map(att => (
                  <button
                    key={att.attachmentId}
                    onClick={() => handleDownloadAttachment(att)}
                    disabled={downloadingAtt === att.attachmentId}
                    className="flex items-center gap-2 text-xs rounded-md border border-border bg-card px-2.5 py-1.5 hover:bg-muted transition-colors disabled:opacity-60"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">{att.filename}</span>
                    {att.size ? <span className="text-muted-foreground">{att.size > 1024 * 1024 ? `${(att.size / 1024 / 1024).toFixed(1)}MB` : `${Math.round(att.size / 1024)}KB`}</span> : null}
                    {downloadingAtt === att.attachmentId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => startCompose('reply')}><Reply className="w-4 h-4" /> Reply</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => startCompose('replyall')}><ReplyAll className="w-4 h-4" /> Reply All</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => startCompose('forward')}><Forward className="w-4 h-4" /> Forward</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView('assign')}><Link2 className="w-4 h-4" /> Assign to item</Button>
            </div>
          </>
        )}

        {view === 'assign' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView('view')}><ArrowLeft className="w-4 h-4" /></Button>
                <DialogTitle className="text-base">Assign to an existing item</DialogTitle>
              </div>
            </DialogHeader>
            <Input placeholder="Search items…" value={query} onChange={e => setQuery(e.target.value)} className="mt-2" />
            <div className="mt-2 max-h-[50vh] overflow-y-auto space-y-1">
              {assignable.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No items found</p>}
              {assignable.map(item => {
                const c = getEventColor(item.color);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleAssign(item)}
                    className="w-full flex items-center gap-2 text-left rounded-md border border-border px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${c.dot || 'bg-primary'} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.start_time ? format(parseISO(item.start_time), 'EEE MMM d · h:mm a') : ''}
                        {item.calendar_name ? ` · ${item.calendar_name}` : ''}
                      </div>
                    </div>
                    <ListTodo className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
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