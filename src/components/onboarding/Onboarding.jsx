import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Mail, CalendarDays, ArrowRight, ArrowLeft, Check, ListTodo, Columns, Hash, MessageCircle } from 'lucide-react';
import ConnectStep from './ConnectStep';

const comingSoon = [
  { icon: ListTodo, name: 'ClickUp', desc: 'Tasks & docs' },
  { icon: Columns, name: 'Trello', desc: 'Boards & cards' },
  { icon: Hash, name: 'Slack', desc: 'Channel messages' },
  { icon: MessageCircle, name: 'WhatsApp', desc: 'Chat & replies' },
];

const TOTAL = 5;

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [gmail, setGmail] = useState('idle');
  const [cal, setCal] = useState('idle');

  const connectGmail = async () => {
    setGmail('connecting');
    try {
      await base44.functions.invoke('syncGmail', {});
      setGmail('connected');
    } catch {
      setGmail('error');
    }
  };

  const connectCal = async () => {
    setCal('connecting');
    try {
      await base44.functions.invoke('syncGoogleCalendar', {});
      setCal('connected');
    } catch {
      setCal('error');
    }
  };

  const finish = async () => {
    try {
      await base44.auth.updateMe({ onboarded: true });
    } catch {}
    onComplete();
  };

  const next = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="px-6 pt-6">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight">Calkanban</span>
            <span className="text-xs text-muted-foreground">
              Step {Math.min(step + 1, TOTAL)} of {TOTAL}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-10">
        <div className="w-full max-w-lg">
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-8 w-8" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">Welcome to Calkanban</h1>
              <p className="mt-3 text-muted-foreground">
                Let's connect your accounts so your calendar can start working for you. It takes about a minute.
              </p>
              <button
                onClick={next}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <ConnectStep
              icon={Mail}
              accentClass="bg-primary/10 text-primary"
              title="Connect your Gmail"
              body="Pull your inbox into one stream you can drag straight onto your day."
              status={gmail}
              onConnect={connectGmail}
              onContinue={next}
              onSkip={next}
              onBack={back}
            />
          )}

          {step === 2 && (
            <ConnectStep
              icon={CalendarDays}
              accentClass="bg-accent/15 text-accent"
              title="Connect Google Calendar"
              body="See your real meetings so Calkanban can schedule around them — never double-booked."
              status={cal}
              onConnect={connectCal}
              onContinue={next}
              onSkip={next}
              onBack={back}
            />
          )}

          {step === 3 && (
            <div>
              <h2 className="text-center text-2xl font-semibold tracking-tight">More integrations coming soon</h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                We're working on bringing even more of your tools into one place.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {comingSoon.map(({ icon: Icon, name, desc }) => (
                  <div key={name} className="relative rounded-xl border border-border bg-card p-4">
                    <span className="absolute right-3 top-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Coming soon
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={back}
                  className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <Check className="h-8 w-8" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">You're all set</h1>
              <p className="mt-3 text-muted-foreground">
                Your calendar is ready to work for you. Let's get your day organized.
              </p>
              <button
                onClick={finish}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                Enter Calkanban <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}