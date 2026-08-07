import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PartyPopper } from 'lucide-react';

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2 text-center">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default function CelebrationOverlay({ open, stats, onClose }) {
  useEffect(() => {
    if (!open) return;
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6'];
    confetti({ particleCount: 120, spread: 100, origin: { y: 0.2 }, colors });
    const end = Date.now() + 1200;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0, y: 0.8 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1, y: 0.8 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm text-center">
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <PartyPopper className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Congratulations!</h2>
          <p className="text-sm text-muted-foreground">You finished a task. Here's your progress:</p>
          <div className="grid grid-cols-3 gap-2 w-full mt-1">
            <Stat label="Done today" value={stats?.doneToday ?? 0} />
            <Stat label="Done this week" value={stats?.doneThisWeek ?? 0} />
            <Stat label="Left today" value={stats?.leftToday ?? 0} />
          </div>
          <Button onClick={onClose} className="mt-2 w-full">Keep going</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}