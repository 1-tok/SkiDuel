import React from 'react';
import { Link } from 'react-router-dom';
import { Plug, MousePointerClick, PartyPopper } from 'lucide-react';

const steps = [
  { icon: Plug, title: 'Connect', body: 'Link Gmail and Google Calendar in one click. Your inbox and meetings flow in automatically.' },
  { icon: MousePointerClick, title: 'Drag', body: 'Pull any email or task onto your day. Skiduel finds the right slot and squeezes around fixed meetings.' },
  { icon: PartyPopper, title: 'Done', body: 'Work the list. We nudge you when a slot ends, reschedule what slips, and celebrate what you finish.' },
];

export default function HowItWorks() {
  return (
    <section id="how" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">From five tabs to one in minutes</h2>
          <p className="mt-3 text-muted-foreground">No migration, no setup marathon. Connect and start dragging.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="relative rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-3xl font-semibold text-muted-foreground/30">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Try it now
          </Link>
        </div>
      </div>
    </section>
  );
}