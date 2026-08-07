// Removes duplicate CalendarEvent records that share the same gcal_event_id.
// These can appear when an optimistic local create races with a Google Calendar
// webhook sync. Keeps the oldest record (the one with the user's original intent).
export async function dedupeGcalEvents(base44) {
  const all = await base44.asServiceRole.entities.CalendarEvent.list('-created_date', 500);
  const byId = {};
  for (const e of all) {
    if (!e.gcal_event_id) continue;
    (byId[e.gcal_event_id] ||= []).push(e);
  }
  for (const id in byId) {
    const group = byId[id].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    for (let i = 1; i < group.length; i++) {
      try { await base44.asServiceRole.entities.CalendarEvent.delete(group[i].id); } catch {}
    }
  }
}