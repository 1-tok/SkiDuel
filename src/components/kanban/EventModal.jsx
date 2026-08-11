import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Mail, Clock, Calendar, FileText, Trash2, Save, Paperclip, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { getEventColor } from '@/lib/scheduling';
import RichText from '@/components/RichText';

const statusLabels = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  needs_followup: { label: 'Needs Follow-up', className: 'bg-orange-100 text-orange-700' },
};
const columnLabels = { todo: 'To Do', doing: 'Doing', done: 'Done', past: 'Past' };
const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'needs_followup', label: 'Needs Follow-up' },
];
const columnOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
  { value: 'past', label: 'Past' },
];
const colorOptions = ['blue', 'green', 'purple', 'orange', 'pink'];

function toLocalInput(dateIso) {
  if (!dateIso) return { date: '', time: '' };
  const d = parseISO(dateIso);
  return { date: format(d, 'yyyy-MM-dd'), time: format(d, 'HH:mm') };
}

export default function EventModal({ event, open, onClose, onDelete, onUpdate }) {
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sourceEmail, setSourceEmail] = useState(null);
  const [emailBody, setEmailBody] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

  useEffect(() => {
    if (!open || !event) { setForm(null); return; }
    const s = toLocalInput(event.start_time);
    const e = toLocalInput(event.end_time);
    setForm({
      title: event.title || '',
      date: s.date || event.date || format(new Date(), 'yyyy-MM-dd'),
      startTime: s.time || '09:00',
      endTime: e.time || '09:30',
      description: event.description || '',
      status: event.status || 'scheduled',
      color: event.color || 'blue',
      kanban_column: event.kanban_column || 'doing',
      attachments: (event.attachments || []).map(a => ({ file_url: a.file_url, title: a.title })),
    });
  }, [open, event]);

  useEffect(() => {
    if (!open || !event?.source_email_id) { setSourceEmail(null); setEmailBody(''); return; }
    let active = true;
    (async () => {
      try {
        const email = await base44.entities.Email.get(event.source_email_id);
        if (!active) return;
        setSourceEmail(email);
        if (email.gmail_id) {
          setLoadingEmail(true);
          try {
            const res = await base44.functions.invoke('getGmailBody', { gmail_id: email.gmail_id, source_account: email.source_account });
            if (active) setEmailBody(res?.body || email.preview || '');
          } catch { if (active) setEmailBody(email.preview || ''); }
          finally { if (active) setLoadingEmail(false); }
        } else {
          setEmailBody(email.body || email.preview || '');
        }
      } catch { if (active) setSourceEmail(null); }
    })();
    return () => { active = false; };
  }, [open, event]);

  if (!event || !form) return null;

  const colors = getEventColor(event.color);
  const status = statusLabels[event.status] || statusLabels.scheduled;
  const canEdit = !event.is_shared_calendar && !!onUpdate;

  const buildIso = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr || '00:00'}:00`).toISOString();

  const handleSave = async () => {
    const start_time = buildIso(form.date, form.startTime);
    const end_time = buildIso(form.date, form.endTime);
    const duration_minutes = Math.max(1, Math.round((new Date(end_time) - new Date(start_time)) / 60000));
    const updates = {
      title: form.title,
      description: form.description,
      start_time,
      end_time,
      date: form.date,
      duration_minutes,
      status: form.status,
      color: form.color,
      kanban_column: form.kanban_column,
      attachments: form.attachments,
    };
    if (onUpdate) await onUpdate(event, updates);
    onClose?.();
  };

  const handleAddAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, attachments: [...(f.attachments || []), { file_url: res.file_url, title: file.name }] }));
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <div className={`w-3 h-3 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`} />
            {canEdit ? (
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} className="text-base font-semibold h-8" />
            ) : (
              <DialogTitle className="text-base leading-snug">{event.title}</DialogTitle>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-1 max-h-[68vh] overflow-y-auto pr-1">
          {/* Time / date */}
          {canEdit ? (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Date</label>
                <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Start</label>
                <Input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">End</label>
                <Input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          ) : (
            event.start_time && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>
                  {format(parseISO(event.start_time), 'EEEE, MMM d · h:mm a')}
                  {event.end_time ? ` – ${format(parseISO(event.end_time), 'h:mm a')}` : ''}
                </span>
              </div>
            )
          )}

          {/* Status / column / color */}
          {canEdit && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full h-8 text-xs border border-input rounded-md bg-background px-2">
                  {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Column</label>
                <select value={form.kanban_column} onChange={(e) => set('kanban_column', e.target.value)} className="w-full h-8 text-xs border border-input rounded-md bg-background px-2">
                  {columnOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Color</label>
                <select value={form.color} onChange={(e) => set('color', e.target.value)} className="w-full h-8 text-xs border border-input rounded-md bg-background px-2">
                  {colorOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Read-only badges (non-editable items) */}
          {!canEdit && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
              {event.kanban_column && (
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                  {columnLabels[event.kanban_column] || event.kanban_column}
                </span>
              )}
              {event.duration_minutes && (
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">{event.duration_minutes} min</span>
              )}
            </div>
          )}

          {/* Calendar name / source */}
          {event.calendar_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{event.calendar_name}{event.source_account ? ` · ${event.source_account}` : ''}</span>
            </div>
          )}

          {/* Source email (child) */}
          {sourceEmail ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs font-medium truncate">{sourceEmail.sender}</span>
                {sourceEmail.sender_email && <span className="text-[10px] text-muted-foreground truncate">&lt;{sourceEmail.sender_email}&gt;</span>}
              </div>
              <div className="text-xs font-semibold text-foreground truncate">{sourceEmail.subject}</div>
              <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground">
                {loadingEmail ? 'Loading email…' : <RichText content={emailBody || sourceEmail.preview || ''} className="text-xs text-muted-foreground" />}
              </div>
            </div>
          ) : event.source === 'gmail' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>From Gmail</span>
            </div>
          )}

          {/* Description */}
          {canEdit ? (
            <div>
              <label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3" /> Description
              </label>
              <Textarea rows={8} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Add notes…" />
            </div>
          ) : (
            event.description && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <RichText content={event.description} className="text-sm text-muted-foreground max-h-[40vh] overflow-y-auto w-full" />
              </div>
            )
          )}

          {/* Attachments — no label, just files + Add file link */}
          <div className="space-y-1">
            {(form.attachments || []).map((a, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <a href={a.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline truncate flex-1">
                  <FileText className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{a.title}</span>
                </a>
                {canEdit && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, attachments: f.attachments.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <label className="flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                <Paperclip className="w-3 h-3" />
                {uploading ? 'Uploading…' : 'Add file'}
                <input type="file" className="hidden" onChange={handleAddAttachment} disabled={uploading} />
              </label>
            )}
          </div>

          {/* Follow-up note */}
          {event.followup_note && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
              <p className="text-xs font-medium text-orange-700 mb-1">Follow-up note</p>
              <RichText content={event.followup_note} className="text-sm text-orange-800" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-3 border-t border-border mt-2">
          {canEdit && (
            <Button size="sm" className="gap-1.5" onClick={handleSave}><Save className="w-4 h-4" /> Save</Button>
          )}
          {onDelete && !event.is_shared_calendar && (
            <button
              onClick={() => { onDelete(event); onClose?.(); }}
              className="ml-auto flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Move to Past
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}