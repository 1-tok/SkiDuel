import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { MessageSquare, RefreshCw, Send, Lock } from 'lucide-react';

export default function SlackSettings({ open, onClose, settings, onSaved }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [channelId, setChannelId] = useState(settings?.slack_channel_id || '');

  useEffect(() => {
    setChannelId(settings?.slack_channel_id || '');
  }, [settings?.slack_channel_id, open]);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('sendSlackSummary', { action: 'list' });
      setChannels(res?.channels || []);
    } catch (e) {
      toast.error('Could not load Slack channels: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchChannels();
  }, [open, fetchChannels]);

  const handleSave = async () => {
    const ch = channels.find(c => c.id === channelId);
    const settingsList = await base44.entities.UserSettings.list('-created_date', 1);
    const existing = settingsList[0];
    const payload = {
      slack_channel_id: channelId || '',
      slack_channel_name: ch?.name || '',
    };
    try {
      if (existing) {
        await base44.entities.UserSettings.update(existing.id, payload);
      } else {
        await base44.entities.UserSettings.create(payload);
      }
      toast.success(channelId ? `Slack channel set to #${ch?.name || channelId}` : 'Slack channel cleared');
      onSaved?.();
    } catch (e) {
      toast.error('Could not save: ' + (e?.message || e));
    }
  };

  const handleSendNow = async () => {
    if (!channelId || sending) return;
    setSending(true);
    try {
      await base44.functions.invoke('sendSlackSummary', { action: 'send', channel_id: channelId });
      toast.success('Summary sent to Slack');
    } catch (e) {
      toast.error('Slack send failed: ' + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#4A154B]" />
            Slack notifications
          </DialogTitle>
          <DialogDescription>
            Choose the team channel where Calkanban posts your daily summary and automated notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex items-center gap-2">
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              disabled={loading || channels.length === 0}
              className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">{loading ? 'Loading channels…' : channels.length === 0 ? 'No channels found' : 'Select a channel…'}</option>
              {channels.map(c => (
                <option key={c.id} value={c.id}>
                  #{c.name}{c.is_private ? ' (private)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={fetchChannels}
              title="Refresh channels"
              className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {channelId && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" />
              For private channels, invite the bot first: <code className="font-mono">/invite @Calkanban</code>
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleSendNow} disabled={!channelId || sending} className="gap-1.5">
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Sending…' : 'Send summary now'}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}