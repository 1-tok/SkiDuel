// Formats an attendees list into a compact label for event cards.
// Returns null when there are no attendees so callers can skip rendering.
export function formatAttendees(attendees, max = 2) {
  if (!Array.isArray(attendees) || attendees.length === 0) return null;
  const names = attendees.slice(0, max);
  const extra = attendees.length - names.length;
  const label = names.join(', ');
  return extra > 0 ? `${label} +${extra}` : label;
}