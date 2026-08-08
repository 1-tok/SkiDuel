import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Mail, CalendarDays, CheckCircle2, MessageSquare, ExternalLink } from 'lucide-react';

function AccountsList({ accounts }) {
  if (accounts.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground/70 pl-1">
        No accounts synced yet. Click Sync to pull data.
      </p>
    );
  }
  return (
    <div className="space-y-1 pl-1">
      {accounts.map((acc) => (
        <div key={acc} className="flex items-center gap-2 text-xs text-foreground/80">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="truncate">{acc}</span>
        </div>
      ))}
    </div>
  );
}

export default function SyncIntegrationsModal({
  open,
  onClose,
  mailAccounts = [],
  calendarAccounts = [],
  slackConnected = false,
  slackChannelName,
  onConfigureSlack,
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sync integrations</DialogTitle>
          <DialogDescription>
            Connected services feeding your Mail inbox, Calendar, and Slack notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Mail / Gmail */}
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground flex-1">Mail</span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </span>
            </div>
            <AccountsList accounts={mailAccounts} />
          </div>

          {/* Google Calendar */}
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground flex-1">Google Calendar</span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </span>
            </div>
            <AccountsList accounts={calendarAccounts} />
          </div>

          {/* Slack */}
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground flex-1">Slack</span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </span>
            </div>
            {slackChannelName ? (
              <div className="flex items-center gap-2 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-foreground/80 truncate">#{slackChannelName}</span>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/70 pl-1">
                No channel selected. Pick one to receive daily summaries.
              </p>
            )}
            {onConfigureSlack && (
              <button
                onClick={onConfigureSlack}
                className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline pl-1"
              >
                Configure Slack <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}