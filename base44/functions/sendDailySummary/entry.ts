import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { format, parseISO, isSameDay, startOfWeek, addDays, isWithinInterval } from 'npm:date-fns@3.6.0';

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 7);

    const events = await base44.asServiceRole.entities.CalendarEvent.list('-start_time', 200);
    const emails = await base44.asServiceRole.entities.Email.list('-created_date', 50);

    const todaysEvents = events
      .filter(e => e.start_time && isSameDay(parseISO(e.start_time), today))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    const pendingTasks = todaysEvents.filter(e => e.status === 'scheduled' && (e.kanban_column === 'todo' || e.kanban_column === 'doing'));
    const doingTasks = pendingTasks.filter(t => t.kanban_column === 'doing');

    // Completion is measured by updated_date per the app's metric
    const completedToday = events.filter(e => e.status === 'completed' && e.updated_date && isSameDay(parseISO(e.updated_date), today));
    const completedWeek = events.filter(e => e.status === 'completed' && e.updated_date && isWithinInterval(parseISO(e.updated_date), { start: weekStart, end: weekEnd }));

    const backlog = events.filter(e => e.status === 'scheduled' && (e.kanban_column === 'todo' || e.kanban_column === 'doing'));
    const pendingEmails = emails.filter(e => !e.is_actioned);

    const accounts = new Set();
    todaysEvents.forEach(e => e.source_account && accounts.add(e.source_account));
    pendingEmails.forEach(e => e.source_account && accounts.add(e.source_account));
    const accountList = [...accounts].sort();

    const sectionHeader = (title, count) =>
      `<h2 style="margin:22px 0 8px;font-size:15px;color:#2563eb;border-bottom:1px solid #e5e7eb;padding-bottom:6px;">${escapeHtml(title)}${count != null ? ` <span style="color:#6b7280;font-weight:400;font-size:12px;">(${count})</span>` : ''}</h2>`;

    const stat = (label, value, color) =>
      `<div style="flex:1;min-width:110px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;"><div style="font-size:20px;font-weight:700;color:${color};">${value}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;">${escapeHtml(label)}</div></div>`;

    const parts = [];
    parts.push(`<div style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border-radius:12px;padding:20px 24px;">`);
    parts.push(`<h1 style="margin:0;font-size:20px;">Good morning, ${escapeHtml(user.full_name || 'there')}!</h1>`);
    parts.push(`<p style="margin:6px 0 0;font-size:13px;opacity:.92;">Your daily summary for ${escapeHtml(format(today, 'EEEE, MMMM d'))}</p>`);
    parts.push(`</div>`);

    if (accountList.length > 0) {
      parts.push(`<p style="margin:12px 2px 0;font-size:12px;color:#6b7280;">Pulled from all connected accounts: ${escapeHtml(accountList.join(', '))}</p>`);
    }

    // Productivity insights
    parts.push(`<div style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 2px;">`);
    parts.push(stat('Done today', completedToday.length, '#10b981'));
    parts.push(stat('Done this week', completedWeek.length, '#2563eb'));
    parts.push(stat('In backlog', backlog.length, '#f59e0b'));
    parts.push(stat('Emails pending', pendingEmails.length, '#ef4444'));
    parts.push(`</div>`);

    // Doing now
    if (doingTasks.length > 0) {
      parts.push(sectionHeader('🔥 In progress — Doing now', doingTasks.length));
      parts.push(`<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;">`);
      doingTasks.forEach((t) => {
        const time = escapeHtml(format(parseISO(t.start_time), 'h:mm a'));
        const account = t.source_account ? ` <span style="color:#9ca3af;font-size:11px;">[${escapeHtml(t.source_account)}]</span>` : '';
        parts.push(`<div style="margin:5px 0;font-size:13px;"><strong>★ ${time}</strong> — ${escapeHtml(t.title)}${account}</div>`);
      });
      parts.push(`</div>`);
    }

    // Today's tasks
    parts.push(sectionHeader("📋 Today's tasks", pendingTasks.length));
    if (pendingTasks.length === 0) {
      parts.push(`<p style="margin:4px 2px;font-size:13px;color:#6b7280;">No tasks scheduled for today.</p>`);
    } else {
      parts.push(`<table style="width:100%;font-size:13px;border-collapse:collapse;">`);
      pendingTasks.forEach((t) => {
        const time = escapeHtml(format(parseISO(t.start_time), 'h:mm a'));
        const marker = t.kanban_column === 'doing' ? '★ Doing' : 'To do';
        const account = t.source_account ? ` <span style="color:#9ca3af;font-size:11px;">[${escapeHtml(t.source_account)}]</span>` : '';
        parts.push(`<tr><td style="padding:3px 0;vertical-align:top;width:72px;color:#6b7280;">${time}</td><td style="padding:3px 0;"><span style="color:#2563eb;font-size:11px;font-weight:600;">${marker}</span> &nbsp;${escapeHtml(t.title)}${account}</td></tr>`);
      });
      parts.push(`</table>`);
    }

    // Completed items
    parts.push(sectionHeader('✅ Completed today', completedToday.length));
    if (completedToday.length === 0) {
      const note = completedWeek.length > 0 ? ` ${completedWeek.length} completed this week so far.` : '';
      parts.push(`<p style="margin:4px 2px;font-size:13px;color:#6b7280;">Nothing marked done yet today.${note}</p>`);
    } else {
      parts.push(`<table style="width:100%;font-size:13px;border-collapse:collapse;">`);
      completedToday.forEach((t) => {
        const time = t.updated_date ? escapeHtml(format(parseISO(t.updated_date), 'h:mm a')) : '';
        parts.push(`<tr><td style="padding:3px 0;vertical-align:top;width:72px;color:#10b981;">✓ ${time}</td><td style="padding:3px 0;color:#374151;">${escapeHtml(t.title)}</td></tr>`);
      });
      parts.push(`</table>`);
      if (completedWeek.length > completedToday.length) {
        parts.push(`<p style="margin:6px 2px;font-size:11px;color:#6b7280;">+${completedWeek.length - completedToday.length} more completed earlier this week.</p>`);
      }
    }

    // Today's calendar events
    parts.push(sectionHeader("📅 Today's calendar events", todaysEvents.length));
    if (todaysEvents.length === 0) {
      parts.push(`<p style="margin:4px 2px;font-size:13px;color:#6b7280;">No events scheduled for today.</p>`);
    } else {
      parts.push(`<table style="width:100%;font-size:13px;border-collapse:collapse;">`);
      todaysEvents.forEach((e) => {
        const time = escapeHtml(format(parseISO(e.start_time), 'h:mm a'));
        const status = e.status === 'completed' ? '<span style="color:#10b981;">✓</span> '
          : e.status === 'cancelled' ? '<span style="color:#ef4444;">✗</span> ' : '';
        const cal = e.calendar_name && e.calendar_name !== 'primary' ? ` <span style="color:#9ca3af;font-size:11px;">(${escapeHtml(e.calendar_name)})</span>` : '';
        const account = e.source_account ? ` <span style="color:#9ca3af;font-size:11px;">[${escapeHtml(e.source_account)}]</span>` : '';
        parts.push(`<tr><td style="padding:3px 0;vertical-align:top;width:72px;color:#6b7280;">${time}</td><td style="padding:3px 0;">${status}${escapeHtml(e.title)}${cal}${account}</td></tr>`);
      });
      parts.push(`</table>`);
    }

    // Pending emails
    parts.push(sectionHeader('📧 Unactioned emails', pendingEmails.length));
    if (pendingEmails.length === 0) {
      parts.push(`<p style="margin:4px 2px;font-size:13px;color:#6b7280;">Inbox is clear — no pending emails.</p>`);
    } else {
      parts.push(`<table style="width:100%;font-size:13px;border-collapse:collapse;">`);
      pendingEmails.slice(0, 10).forEach((m) => {
        const account = m.source_account ? ` <span style="color:#9ca3af;font-size:11px;">[${escapeHtml(m.source_account)}]</span>` : '';
        parts.push(`<tr><td style="padding:3px 0;vertical-align:top;width:130px;color:#6b7280;">${escapeHtml(m.sender)}</td><td style="padding:3px 0;">${escapeHtml(m.subject)}${account}</td></tr>`);
      });
      parts.push(`</table>`);
      if (pendingEmails.length > 10) {
        parts.push(`<p style="margin:6px 2px;font-size:11px;color:#6b7280;">…and ${pendingEmails.length - 10} more.</p>`);
      }
    }

    parts.push(`<p style="margin:26px 2px 4px;font-size:12px;color:#6b7280;">Have a productive day!<br>— Calkanban</p>`);

    const body =
      `<!DOCTYPE html><html><head><meta charset="utf-8"></head>` +
      `<body style="margin:0;padding:0;background:#f4f6fb;font-family:Inter,Arial,sans-serif;color:#1f2937;">` +
      `<div style="max-width:560px;margin:0 auto;padding:24px;">${parts.join('')}</div></body></html>`;

    const subject = `Calkanban Daily Summary — ${format(today, 'MMM d')}`;

    const users = await base44.asServiceRole.entities.User.list();
    const recipients = users.filter(u => u.email).map(u => u.email);

    const results = [];
    for (const to of recipients) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body, from_name: 'Calkanban' });
        results.push({ to, status: 'sent' });
      } catch (err) {
        results.push({ to, status: 'error', error: err.message });
      }
    }

    return Response.json({
      date: format(today, 'yyyy-MM-dd'),
      accounts: accountList,
      events: todaysEvents.length,
      pendingTasks: pendingTasks.length,
      doingTasks: doingTasks.length,
      completedToday: completedToday.length,
      completedWeek: completedWeek.length,
      backlog: backlog.length,
      pendingEmails: pendingEmails.length,
      recipients: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}