import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ConnectStep({ icon: Icon, accentClass, title, body, status, onConnect, onContinue, onSkip, onBack }) {
  return (
    <div>
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${accentClass}`}>
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-center text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">{body}</p>

      <div className="mt-7 flex flex-col items-center gap-3">
        {status === 'idle' && (
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Connect <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {status === 'connecting' && (
          <button
            disabled
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow opacity-80"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
          </button>
        )}
        {status === 'connected' && (
          <>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" /> Connected
            </div>
            <button
              onClick={onContinue}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-5 w-5" /> Couldn't connect
            </div>
            <button
              onClick={onConnect}
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-5 py-3 text-sm font-medium hover:bg-accent/10 transition-colors"
            >
              Try again
            </button>
          </>
        )}
        <button onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Skip for now
        </button>
      </div>

      {onBack && (
        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      )}
    </div>
  );
}