import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { format, parseISO, isSameDay, isToday } from 'npm:date-fns@3.6.0';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Fetch today's events and unactioned emails as the service role
    const events = await base44.asServiceRole.entities.CalendarEvent.list('-start_time', 200);
    const emails = await base44.asServiceRole.entities.Email.list('-created_date', 50);

    const todaysEvents = events
      .filter(e => isSameDay(parseISO(e.start_time), today))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    const pendingTasks = todaysEvents.filter(
      e => e.status === 'scheduled' && (e.kanban_column === 'todo' || e.kanban_column === 'doing')
    );

    const pendingEmails = emails.filter(e => !e.is_actioned);

    // Build the summary email body
    const lines = [];
    lines.push(`Good morning, ${user.full_name || 'there'}!`);
    lines.push('');
    lines.push(`Here's your daily summary for ${format(today, 'EEEE, MMMM d')}.`);
    lines.push('');

    lines.push(`📅 Today's Calendar Events (${todaysEvents.length})`);
    lines.push('─────────────────────────────');
    if (todaysEvents.length === 0) {
      lines.push('No events scheduled for today.');
    } else {
      todaysEvents.forEach(e => {
        const time = format(parseISO(e.start_time), 'h:mm a');
        const status = e.status === 'completed' ? '✓ ' : e.status === 'cancelled' ? '✗ ' : '';
        const account = e.source_account ? ` [${e.source_account}]` : '';
        const cal = e.calendar_name && e.calendar_name !== 'primary' ? ` (${e.calendar_name})` : '';
        lines.push(`• ${time} — ${status}${e.title}${cal}${account}`);
        if (e.description) lines.push(`    ${e.description.slice(0, 120)}`);
      });
    }
    lines.push('');

    lines.push(`📋 Pending Tasks for Today (${pendingTasks.length})`);
    lines.push('─────────────────────────────');
    if (pendingTasks.length === 0) {
      lines.push('No pending tasks for today.');
    } else {
      pendingTasks.forEach(t => {
        const time = format(parseISO(t.start_time), 'h:mm a');
        const col = t.kanban_column === 'todo' ? 'TODO' : 'DOING';
        const account = t.source_account ? ` [${t.source_account}]` : '';
        lines.push(`• [${col}] ${time} — ${t.title}${account}`);
      });
    }
    lines.push('');

    lines.push(`📧 Unactioned Emails (${pendingEmails.length})`);
    lines.push('─────────────────────────────');
    if (pendingEmails.length === 0) {
      lines.push('Inbox is clear — no pending emails.');
    } else {
      pendingEmails.slice(0, 10).forEach(m => {
        const account = m.source_account ? ` [${m.source_account}]` : '';
        lines.push(`• ${m.sender}: ${m.subject}${account}`);
      });
      if (pendingEmails.length > 10) {
        lines.push(`...and ${pendingEmails.length - 10} more.`);
      }
    }
    lines.push('');
    lines.push('Have a productive day!');
    lines.push('— Flowcal');

    const body = lines.join('\n');
    const subject = `Flowcal Daily Summary — ${format(today, 'MMM d')}`;

    // Send to all admin users
    const users = await base44.asServiceRole.entities.User.list();
    const recipients = users.filter(u => u.email).map(u => u.email);

    const results = [];
    for (const to of recipients) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject,
          body,
          from_name: 'Flowcal',
        });
        results.push({ to, status: 'sent' });
      } catch (err) {
        results.push({ to, status: 'error', error: err.message });
      }
    }

    return Response.json({
      date: todayStr,
      events: todaysEvents.length,
      pendingTasks: pendingTasks.length,
      pendingEmails: pendingEmails.length,
      recipients: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}