import { format, parseISO, isSameDay, startOfWeek, addDays, isWithinInterval } from 'npm:date-fns@3.6.0';

// Shared data-gathering + Slack-text formatting used by sendSlackSummary and the
// email sendDailySummary (so Slack and email report the exact same numbers).
export async function gatherSummaryData(base44, user) {
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

  const completedToday = events.filter(e => e.status === 'completed' && e.updated_date && isSameDay(parseISO(e.updated_date), today));
  const completedWeek = events.filter(e => e.status === 'completed' && e.updated_date && isWithinInterval(parseISO(e.updated_date), { start: weekStart, end: weekEnd }));

  const backlog = events.filter(e => e.status === 'scheduled' && (e.kanban_column === 'todo' || e.kanban_column === 'doing'));
  const pendingEmails = emails.filter(e => !e.is_actioned);

  const accounts = new Set();
  todaysEvents.forEach(e => e.source_account && accounts.add(e.source_account));
  pendingEmails.forEach(e => e.source_account && accounts.add(e.source_account));
  const accountList = [...accounts].sort();

  return { user, today, todaysEvents, pendingTasks, doingTasks, completedToday, completedWeek, backlog, pendingEmails, accountList };
}

export function buildSlackText(data) {
  const { user, today, todaysEvents, pendingTasks, doingTasks, completedToday, completedWeek, backlog, pendingEmails, accountList } = data;
  const L = [];
  L.push(`*Good morning, ${user?.full_name || 'there'}!* ☀️`);
  L.push(`Your daily summary for ${format(today, 'EEEE, MMMM d')}`);
  L.push('');
  L.push(`✅ Done today: *${completedToday.length}*   📆 This week: *${completedWeek.length}*   📌 Backlog: *${backlog.length}*   📧 Emails pending: *${pendingEmails.length}*`);
  if (accountList.length) L.push(`_Pulled from: ${accountList.join(', ')}_`);

  if (doingTasks.length > 0) {
    L.push('');
    L.push(`🔥 *In progress — Doing now* (${doingTasks.length})`);
    doingTasks.forEach(t => {
      const time = format(parseISO(t.start_time), 'h:mm a');
      L.push(`★ ${time} — ${t.title}`);
    });
  }

  L.push('');
  L.push(`📋 *Today's tasks* (${pendingTasks.length})`);
  if (pendingTasks.length === 0) L.push('No tasks scheduled for today.');
  else pendingTasks.forEach(t => {
    const time = format(parseISO(t.start_time), 'h:mm a');
    const marker = t.kanban_column === 'doing' ? '★ Doing' : 'To do';
    L.push(`${time}   ${marker}   ${t.title}`);
  });

  L.push('');
  L.push(`✅ *Completed today* (${completedToday.length})`);
  if (completedToday.length === 0) L.push('Nothing marked done yet today.');
  else completedToday.forEach(t => {
    const time = t.updated_date ? format(parseISO(t.updated_date), 'h:mm a') : '';
    L.push(`✓ ${time}   ${t.title}`);
  });

  L.push('');
  L.push(`📅 *Today's calendar events* (${todaysEvents.length})`);
  if (todaysEvents.length === 0) L.push('No events scheduled for today.');
  else todaysEvents.forEach(e => {
    const time = format(parseISO(e.start_time), 'h:mm a');
    const status = e.status === 'completed' ? '✓ ' : e.status === 'cancelled' ? '✗ ' : '';
    L.push(`${time}   ${status}${e.title}`);
  });

  L.push('');
  L.push(`📧 *Unactioned emails* (${pendingEmails.length})`);
  if (pendingEmails.length === 0) L.push('Inbox is clear — no pending emails.');
  else pendingEmails.slice(0, 10).forEach(m => L.push(`• ${m.sender} — ${m.subject}`));

  L.push('');
  L.push('Have a productive day! — Calkanban');
  return L.join('\n');
}