import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

export default function AddItemModal({ prefill, open, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [duration, setDuration] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDate(prefill?.date || format(new Date(), 'yyyy-MM-dd'));
    setTime(prefill?.time || format(new Date(), 'HH:mm'));
    setDuration(prefill?.duration ?? 10);
  }, [open, prefill]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    const start = new Date(`${date}T${time}:00`);
    const dur = Number(duration) || 10;
    const end = new Date(start.getTime() + dur * 60000);
    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        date,
        duration_minutes: dur,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-title">Title</Label>
            <Input id="add-title" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs doing?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-date">Date</Label>
              <Input id="add-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-time">Start time</Label>
              <Input id="add-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-dur">Duration (minutes)</Label>
            <Input id="add-dur" type="number" min={5} step={5} value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}