import React from 'react';
import { Inbox, CalendarDays, Columns, Zap, BarChart3, Bell, Mail, StickyNote, ListTodo, ArrowRight } from 'lucide-react';

const replaced = [
  { icon: Mail, label: 'Email' },
  { icon: CalendarDays, label: 'Calendar' },
  { icon: StickyNote, label: 'Notes' },
  { icon: Columns, label: 'Kanban' },
  { icon: ListTodo, label: 'To-do' },
];

const features = [
  { icon: Inbox, title: 'Unified inbox', body: 'Gmail, Slack, and more land in one stream. Drag any message straight onto your day — no copying, no context switching.' },
  { icon: CalendarDays, title: 'Drag-and-drop scheduling', body: 'Drop a task or email onto your calendar and Calkanban snaps it to the right time, in 15-minute increments.' },
  { icon: Columns, title: 'Kanban that knows your calendar', body: 'To-do, doing, done — organized around your real meetings, so nothing gets double-booked.' },
  { icon: Zap, title: 'Smart scheduling', body: 'Add a task and Calkanban squeezes it around your fixed meetings automatically. Your calendar reshuffles itself.' },
  { icon: BarChart3, title: 'Insights', body: 'See what you finished, what slipped, and where your time actually goes — across days and weeks.' },
  { icon: Bell, title: 'Daily summary', body: "A calm end-of-day rundown — in-app and on Slack — of what's done and what's coming next." },
];

export default function Features() {
  return (
    <section id="features" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div id="why" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Your day lives in five tabs.</h2>
          <p className="mt-3 text-muted-foreground">
            Email here, calendar there, notes somewhere else, a kanban board you forgot about, and a
            to-do list that never ends. Calkanban puts them back together.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {replaced.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground line-through decoration-muted-foreground/50"
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </span>
            ))}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm">
              <CalendarDays className="h-3.5 w-3.5" /> Calkanban
            </span>
          </div>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}