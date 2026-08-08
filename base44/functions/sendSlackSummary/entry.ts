import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { gatherSummaryData, buildSlackText } from '../../shared/slackSummary.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');

    // List the channels the bot can post to (for the picker UI).
    if (body.action === 'list') {
      const channels = [];
      let cursor;
      do {
        const url = new URL('https://slack.com/api/conversations.list');
        url.searchParams.set('types', 'public_channel,private_channel');
        url.searchParams.set('limit', '200');
        if (cursor) url.searchParams.set('cursor', cursor);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = await res.json();
        if (!data.ok) return Response.json({ error: 'Slack list failed', details: data.error }, { status: 502 });
        for (const c of (data.channels || [])) {
          if (!c.is_archived) channels.push({ id: c.id, name: c.name, is_private: !!c.is_private });
        }
        cursor = data.response_metadata?.next_cursor;
      } while (cursor);
      channels.sort((a, b) => a.name.localeCompare(b.name));
      return Response.json({ channels });
    }

    // Post the daily summary to a channel.
    const channelId = body.channel_id;
    if (!channelId) return Response.json({ error: 'channel_id required' }, { status: 400 });

    const data = await gatherSummaryData(base44, user);
    const text = buildSlackText(data);

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: channelId,
        text,
        username: 'Calkanban',
        icon_emoji: ':calendar:',
      }),
    });
    const result = await res.json();
    if (!result.ok) {
      const details = result.error;
      const hint = details === 'channel_not_found' || details === 'not_in_channel'
        ? 'Invite the bot to that channel first (/invite @Calkanban).'
        : details;
      return Response.json({ error: 'Slack post failed', details: hint }, { status: 502 });
    }
    return Response.json({ success: true, channel: channelId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}