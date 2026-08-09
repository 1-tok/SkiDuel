import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const LOGO = 'https://media.base44.com/images/public/6a0383b6225245c6dd116653/1946bb15d_ChatGPTImageAug6202612_27_39PM.png';

export default function CTASection() {
  return (
    <>
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent px-6 py-16 text-center shadow-xl">
            <div className="absolute inset-0 -z-10 opacity-20 [background:radial-gradient(circle_at_top_right,white,transparent_60%)]" />
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-primary-foreground">
              Stop managing your tools.
              <br />
              Start running your day.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              One workspace for your inbox, calendar, notes, and board. Your calendar finally works for you.
            </p>
            <Link
              to="/app"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-background px-6 py-3 text-sm font-semibold text-foreground shadow hover:bg-background/90 transition-colors"
            >
              Open the app <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO} alt="Calkanban" className="h-6 w-6 rounded-md object-cover" />
            <span className="text-sm font-medium">Calkanban</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Don't work for your calendar. Let your calendar work for you.
          </p>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Calkanban</p>
        </div>
      </footer>
    </>
  );
}