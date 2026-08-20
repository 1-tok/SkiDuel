import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import AppMockup from './AppMockup';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-accent/5 to-background" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> One workspace for your whole day
          </span>
          <h1 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            Don't work for your calendar.
            <br />
            <span className="text-primary">Let your calendar work for you.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground">
            Skiduel unifies your inbox, calendar, notes, and kanban into a single drag-and-drop
            workflow — so you stop juggling tabs and start finishing what matters.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Open the app <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-5 py-3 text-sm font-medium hover:bg-accent/10 transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>
        <div className="mt-12 sm:mt-16">
          <AppMockup />
        </div>
      </div>
    </section>
  );
}