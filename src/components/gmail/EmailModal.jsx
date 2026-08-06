import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Calendar, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function EmailModal({ email, open, onClose, onMarkRead, onSchedule }) {
  if (!email) return null;

  const timeStr = email.timestamp
    ? format(parseISO(email.timestamp), 'MMM d, yyyy h:mm a')
    : '';

  const handleMarkRead = () => {
    onMarkRead(email);
    onClose();
  };

  const handleSchedule = () => {
    onSchedule(email);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">{email.sender_email || email.sender}</span>
          </div>
          <DialogTitle className="text-base leading-snug">{email.subject}</DialogTitle>
          {timeStr && <p className="text-xs text-muted-foreground mt-1">{timeStr}</p>}
          {email.source_account && (
            <p className="text-[10px] text-muted-foreground mt-0.5">via {email.source_account}</p>
          )}
        </DialogHeader>

        <div className="mt-2 min-h-[80px] max-h-[300px] overflow-y-auto rounded-md bg-muted/40 p-3">
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {email.preview || 'No preview available.'}
          </p>
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleMarkRead}>
            <Check className="w-4 h-4 text-emerald-500" />
            Mark Done
          </Button>
          <Button className="flex-1 gap-2" onClick={handleSchedule}>
            <Calendar className="w-4 h-4" />
            Schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}