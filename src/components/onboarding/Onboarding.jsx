import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import ConnectStep from './ConnectStep';
import { CONNECTABLE, COMING_SOON } from '@/lib/integrations';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0); // 0 = welcome; 1..n = connect steps; then coming soon; then done
  const [status, setStatus] = useState({});

  const n = CONNECTABLE.length;
  const comingSoonStep = 1 + n;
  const doneStep = 1 + n + 1;
  const TOTAL = doneStep + 1;

  const connectItem = step >= 1 && step <= n ? CONNECTABLE[step - 1] : null;

  const setStatusFor = (key, value) => setStatus((s) => ({ ...s, [key]: value }));

  // Rule 2 (app-user): invoking the sync function doubles as the connection check.
  const verify = async (item) => {
    try {
      await base44.functions.invoke(item.syncFn, {});
      setStatusFor(item.key, 'connected');
    } catch {
      setStatusFor(item.key, 'error');
    }
  };

  const connect = async (item) => {
    setStatusFor(item.key, 'connecting');
    try {
      if (item.connectorId) {
        // Rule 3 (app-user): open OAuth in a popup, then refresh when it closes.
        const url = await base44.connectors.connectAppUser(item.connectorId);
        const popup = window.open(url, '_blank');
        const timer = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(timer);
            verify(item);
          }
        }, 600);
      } else {
        // No per-user connector configured yet — verify the shared connection.
        await base44.functions.invoke(item.syncFn, {});
        setStatusFor(item.key, 'connected');
      }
    } catch {
      setStatusFor(item.key, 'error');
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
            <span className="text-sm font-semibold tracking-tight">Skiduel</span>
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
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">Welcome to Skiduel</h1>
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

          {connectItem && (
            <ConnectStep
              logo={connectItem.logo}
              title={`Connect your ${connectItem.label}`}
              body={connectItem.body}
              status={status[connectItem.key] || 'idle'}
              onConnect={() => connect(connectItem)}
              onContinue={next}
              onSkip={next}
              onBack={back}
            />
          )}

          {step === comingSoonStep && (
            <div>
              <h2 className="text-center text-2xl font-semibold tracking-tight">More integrations coming soon</h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                We're working on bringing even more of your tools into one place.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {COMING_SOON.map(({ logo, name, desc }) => (
                  <div key={name} className="relative rounded-xl border border-border bg-card p-4">
                    <span className="absolute right-3 top-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Coming soon
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <img src={logo} alt={name} className="h-5 w-5" />
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

          {step === doneStep && (
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
                Enter Skiduel <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}