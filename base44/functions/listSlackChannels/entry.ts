import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Lists all channels the Slack bot can see (public + private).
// Used to resolve channel IDs for the Slack webhook automation trigger conditions.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');
    if (!accessToken) return Response.json({ error: 'Slack bot not connected' }, { status: 400 });

    const channels = [];
    let cursor;
    do {
      const params = new URLSearchParams({ limit: '200', types: 'public_channel,private_channel' });
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`https://slack.com/api/conversations.list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!json.ok) return Response.json({ error: json.error }, { status: 502 });
      for (const c of json.channels || []) {
        channels.push({ id: c.id, name: c.name, is_channel: c.is_channel });
      }
      cursor = json.response_metadata?.next_cursor;
    } while (cursor);

    return Response.json({ channels });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}