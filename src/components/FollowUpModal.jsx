import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, ArrowRight, CalendarClock } from 'lucide-react';

export default function FollowUpModal({ event, open, onClose, onAction }) {
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpText, setFollowUpText] = useState('');

  const handleAction = (action) => {
    if (action === 'needs_followup') {
      setShowFollowUp(true);
      return;
    }
    onAction(event, action);
    handleClose();
  };

  const handleSubmitFollowUp = () => {
    onAction(event, 'needs_followup', followUpText);
    handleClose();
  };

  const handleClose = () => {
    setShowFollowUp(false);
    setFollowUpText('');
    onClose();
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">How did it go?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {event.title}
          </DialogDescription>
        </DialogHeader>

        {!showFollowUp ? (
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleAction('completed')}
              className="justify-start gap-3 h-11 text-sm hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
            >
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Mark as done
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('extend')}
              className="justify-start gap-3 h-11 text-sm hover:bg-primary/5 hover:text-primary hover:border-primary/20"
            >
              <CalendarClock className="w-4 h-4 text-primary" />
              Extend to another slot
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('cancelled')}
              className="justify-start gap-3 h-11 text-sm hover:bg-slate-50 hover:text-slate-700"
            >
              <XCircle className="w-4 h-4 text-slate-400" />
              Cancelled
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('needs_followup')}
              className="justify-start gap-3 h-11 text-sm hover:bg-primary/5 hover:text-primary hover:border-primary/20"
            >
              <ArrowRight className="w-4 h-4 text-primary" />
              Needs follow-up
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <Textarea
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              placeholder="What needs to happen next?"
              className="min-h-[80px] text-sm"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowFollowUp(false)}>
                Back
              </Button>
              <Button size="sm" onClick={handleSubmitFollowUp} disabled={!followUpText.trim()}>
                Create Task
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}