import React from 'react';
import { Mail, CalendarDays, Columns, GripVertical, CheckCircle2 } from 'lucide-react';

const blocks = [
  { top: '6%', height: 28, cls: 'bg-[hsl(var(--event-blue))] border-[hsl(var(--event-blue-border))]', label: 'Design review' },
  { top: '28%', height: 44, cls: 'bg-[hsl(var(--event-purple))] border-[hsl(var(--event-purple-border))]', label: '1:1 with Alex' },
  { top: '58%', height: 32, cls: 'bg-[hsl(var(--event-green))] border-[hsl(var(--event-green-border))]', label: 'Deep work' },
  { top: '78%', height: 28, cls: 'bg-[hsl(var(--event-orange))] border-[hsl(var(--event-orange-border))]', label: 'Follow-up' },
];

const kanban = [
  { t: 'Send proposal', dot: 'bg-[hsl(var(--event-blue-border))]' },
  { t: 'Review PRs', dot: 'bg-[hsl(var(--event-purple-border))]' },
  { t: 'Plan sprint', dot: 'bg-[hsl(var(--event-green-border))]' },
];

const inbox = [
  ['Sarah Chen', '9:24', 'Re: Q3 roadmap review'],
  ['Notion', '8:50', 'Weekly digest ready'],
  ['Slack #design', '8:12', 'New mockups are up'],
  ['Alex Park', 'Mon', 'Lunch Thursday?'],
];

export default function AppMockup() {
  return (
    <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-muted-foreground">Calkanban — your day, unified</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-12">
        {/* Communications */}
        <div className="sm:col-span-4 border-b sm:border-b-0 sm:border-r border-border p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Mail className="h-3.5 w-3.5" /> Communications
          </div>
          <div className="space-y-2">
            {inbox.map(([who, when, subj], i) => (
              <div
                key={i}
                className="rounded-lg border border-border p-2 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-foreground">{who}</span>
                  <span className="text-[9px] text-muted-foreground">{when}</span>
                </div>
                <div className="text-[9px] text-muted-foreground truncate">{subj}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="sm:col-span-5 border-b sm:border-b-0 sm:border-r border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> Today
            </div>
            <span className="text-[9px] text-muted-foreground">Mon, Aug 9</span>
          </div>
          <div className="relative h-60 rounded-lg border border-border bg-muted/30 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-border/50" style={{ top: `${i * 20}%` }} />
            ))}
            {blocks.map((b, i) => (
              <div
                key={i}
                className={`absolute left-2 right-2 rounded-md border px-1.5 py-1 ${b.cls}`}
                style={{ top: b.top, height: b.height }}
              >
                <span className="text-[9px] font-medium text-foreground/80 truncate block">{b.label}</span>
              </div>
            ))}
            {/* a dragged email being dropped onto the calendar */}
            <div className="absolute left-10 top-[44%] -rotate-3 rounded-md border border-primary/60 bg-card shadow-lg px-2 py-1.5 flex items-center gap-1">
              <GripVertical className="h-3 w-3 text-primary/70" />
              <span className="text-[9px] font-medium">Re: roadmap</span>
            </div>
          </div>
        </div>

        {/* Kanban */}
        <div className="sm:col-span-3 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Columns className="h-3.5 w-3.5" /> Doing
          </div>
          <div className="space-y-2">
            {kanban.map((k, i) => (
              <div key={i} className="rounded-lg border border-border p-2">
                <div className="text-[10px] font-medium">{k.t}</div>
                <div className="mt-1 flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${k.dot}`} />
                  <span className="text-[8px] text-muted-foreground">2:00 pm</span>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-emerald-400/50 bg-emerald-500/5 p-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400">Inbox zero reached</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}