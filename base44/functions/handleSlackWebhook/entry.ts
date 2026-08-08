import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Ingests incoming Slack messages (delivered via a slackbot connector automation)
// and stores them as Email records so they surface in the Communications feed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const event = body?.data?.event;
    if (!event || event.type !== 'message') {
      return Response.json({ ok: true, skipped: true });
    }
    // Skip bot/system messages to avoid loops and noise.
    if (event.bot_id || event.subtype || event.bot_profile) {
      return Response.json({ ok: true, skipped: true });
    }

    const channel = event.channel;
    const user = event.user;
    const text = event.text || '';
    const ts = event.ts;

    // Dedupe by the Slack message timestamp (unique per message, retried by Slack).
    const externalId = ts ? `slack:${ts}` : `slack:${channel}:${user}:${text.slice(0, 40)}`;
    const existing = await base44.asServiceRole.entities.Email.filter({ external_id: externalId });
    if (existing && existing.length > 0) {
      return Response.json({ ok: true, duplicate: true });
    }

    // Resolve human-readable channel + user names via the bot token.
    let channelName = channel;
    let userName = user || 'Slack user';
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');
      if (accessToken) {
        const chRes = await fetch(`https://slack.com/api/conversations.info?channel=${encodeURIComponent(channel)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const chJson = await chRes.json();
        if (chJson?.ok && chJson.channel?.name) channelName = chJson.channel.name;
        if (user) {
          try {
            const uRes = await fetch(`https://slack.com/api/users.info?user=${encodeURIComponent(user)}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const uJson = await uRes.json();
            if (uJson?.ok && uJson.user) {
              userName = uJson.user.real_name || uJson.user.profile?.display_name || uJson.user.name || user;
            }
          } catch {}
        }
      }
    } catch {}

    // Convert Slack ts ("seconds.microseconds") to an ISO timestamp.
    let timestamp = new Date().toISOString();
    if (ts) {
      const seconds = parseFloat(ts);
      if (!isNaN(seconds)) timestamp = new Date(seconds * 1000).toISOString();
    }

    await base44.asServiceRole.entities.Email.create({
      sender: userName,
      sender_email: '',
      subject: `#${channelName}`,
      preview: text,
      body: text,
      timestamp,
      is_read: false,
      is_actioned: false,
      channel: 'slack',
      external_id: externalId,
      source_account: 'slack',
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}