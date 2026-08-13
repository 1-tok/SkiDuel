// Internal canonical ICS representation of a Flowcal item.
// Extends a standard VEVENT with custom X- properties so the record carries
// its Kanban position, its P1-P4 priority, and the emails (with attachments)
// included within it. Used internally by the app to round-trip an item's
// full state, independent of Google Calendar sync.

const PRIORITY_TO_NUM = { P1: 1, P2: 2, P3: 3, P4: 4 };
const NUM_TO_PRIORITY = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' };

function esc(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

// RFC 5545 line folding: break lines longer than 75 octets with a leading space.
function fold(line) {
  if (line.length <= 75) return line;
  const chunks = [];
  let i = 0;
  while (i < line.length) {
    chunks.push(line.slice(i, i + 73));
    i += 73;
  }
  return chunks.join('\r\n ');
}

function icsDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Use UTC "floating" form: YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function serializeEventICS(event) {
  const e = event || {};
  const lines = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Flowcal//Internal Item//EN');
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${e.id || 'unknown'}@flowcal`);
  if (e.start_time) lines.push(`DTSTART:${icsDate(e.start_time)}`);
  if (e.end_time) lines.push(`DTEND:${icsDate(e.end_time)}`);
  lines.push(`SUMMARY:${esc(e.title)}`);
  if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);

  const priority = e.priority && PRIORITY_TO_NUM[e.priority] ? e.priority : 'P3';
  lines.push(`PRIORITY:${PRIORITY_TO_NUM[priority]}`);
  lines.push(`X-FLOW-PRIORITY:${priority}`);
  if (e.kanban_column) lines.push(`X-FLOW-KANBAN-COLUMN:${e.kanban_column}`);
  if (e.status) lines.push(`X-FLOW-STATUS:${e.status}`);

  // Emails included within this item, with their attachment references.
  const linked = Array.isArray(e.linked_emails) ? e.linked_emails : [];
  if (linked.length > 0) {
    lines.push(`X-FLOW-LINKED-EMAILS:${esc(JSON.stringify(linked))}`);
  }

  // Direct attachments on the item.
  for (const a of (e.attachments || [])) {
    if (a && a.file_url) lines.push(`ATTACH:${esc(a.file_url)}`);
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n');
}

export function parseEventICS(ics) {
  if (!ics) return {};
  // Unfold continuation lines first.
  const unfolded = ics.replace(/\r\n[ \t]/g, '');
  const out = {};
  const props = {};
  const attachments = [];
  for (const raw of unfolded.split(/\r?\n/)) {
    const idx = raw.indexOf(':');
    if (idx === -1) continue;
    const key = raw.slice(0, idx).split(';')[0].toUpperCase();
    let val = raw.slice(idx + 1);
    // basic unescape
    val = val.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
    props[key] = val;
    if (key === 'ATTACH' && val) attachments.push({ file_url: val });
  }
  if (props['X-FLOW-PRIORITY']) out.priority = props['X-FLOW-PRIORITY'];
  else if (props['PRIORITY']) out.priority = NUM_TO_PRIORITY[Number(props['PRIORITY'])] || 'P3';
  if (props['X-FLOW-KANBAN-COLUMN']) out.kanban_column = props['X-FLOW-KANBAN-COLUMN'];
  if (props['X-FLOW-STATUS']) out.status = props['X-FLOW-STATUS'];
  if (props['SUMMARY']) out.title = props['SUMMARY'];
  if (props['DESCRIPTION']) out.description = props['DESCRIPTION'];
  if (props['X-FLOW-LINKED-EMAILS']) {
    try { out.linked_emails = JSON.parse(props['X-FLOW-LINKED-EMAILS']); } catch { out.linked_emails = []; }
  }
  if (attachments.length) out.attachments = attachments;
  return out;
}