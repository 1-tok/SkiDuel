import { format, addDays, setHours, setMinutes, isWeekend, startOfDay, isSameDay, parseISO, addMinutes } from 'date-fns';

export function findNextAvailableSlot(events, targetDate, settings = {}, forToday = false) {
  const workStart = settings.work_start_hour ?? 9;
  const workEnd = settings.work_end_hour ?? 18;
  const duration = settings.default_event_duration ?? 30;
  const includeWeekends = settings.include_weekends ?? false;

  let currentDate = targetDate ? new Date(targetDate) : new Date();
  if (!forToday) {
    // For "next available" — start from now if today, otherwise start of work day
    const now = new Date();
    if (isSameDay(currentDate, now)) {
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      const workStartMin = workStart * 60;
      if (currentMinute < workStartMin) {
        currentDate = setMinutes(setHours(startOfDay(currentDate), workStart), 0);
      } else {
        // Round up to next 15-min increment
        const rounded = Math.ceil(currentMinute / 15) * 15;
        currentDate = setMinutes(setHours(startOfDay(currentDate), 0), rounded);
      }
    } else {
      currentDate = setMinutes(setHours(startOfDay(currentDate), workStart), 0);
    }
  } else {
    currentDate = setMinutes(setHours(startOfDay(currentDate), workStart), 0);
  }

  // Try up to 14 days ahead
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const day = addDays(startOfDay(targetDate || new Date()), dayOffset);
    
    if (!includeWeekends && isWeekend(day)) continue;

    const dayEvents = events
      .filter(e => e.status === 'scheduled' && isSameDay(parseISO(e.start_time), day))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    let slotStart = dayOffset === 0 
      ? Math.max(workStart * 60, new Date().getHours() * 60 + new Date().getMinutes())
      : workStart * 60;
    
    // Round up to nearest 15
    slotStart = Math.ceil(slotStart / 15) * 15;

    const workEndMin = workEnd * 60;

    while (slotStart + duration <= workEndMin) {
      const slotEnd = slotStart + duration;
      const conflict = dayEvents.some(e => {
        const eStart = new Date(e.start_time).getHours() * 60 + new Date(e.start_time).getMinutes();
        const eEnd = new Date(e.end_time).getHours() * 60 + new Date(e.end_time).getMinutes();
        return slotStart < eEnd && slotEnd > eStart;
      });

      if (!conflict) {
        const startTime = setMinutes(setHours(day, Math.floor(slotStart / 60)), slotStart % 60);
        const endTime = addMinutes(startTime, duration);
        return {
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          date: format(day, 'yyyy-MM-dd')
        };
      }
      slotStart += 15;
    }

    if (forToday && dayOffset === 0) return null; // Only check today
  }
  return null;
}

export function getEventColor(color) {
  const colors = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    purple: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-400' },
    orange: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', dot: 'bg-pink-400' },
  };
  return colors[color] || colors.blue;
}

const CALENDAR_PALETTE = ['blue', 'green', 'purple', 'orange', 'pink'];
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Deterministic color per source calendar so each calendar (own or shared) is
// visually distinct. Manual/gmail items fall back to their stored color.
export function getCalendarColor(event) {
  if (event && event.source === 'google_calendar' && event.calendar_name) {
    const key = `${event.source_account || ''}|${event.calendar_name}`;
    return CALENDAR_PALETTE[hashStr(key) % CALENDAR_PALETTE.length];
  }
  return (event && event.color) || 'blue';
}

// A "flexible" item is a to-do the user created in-app (manual or from an email).
// Fixed meetings synced from Google Calendar are NOT flexible and stay put.
export function isFlexibleEvent(event) {
  if (!event) return false;
  return event.flexible === true || event.source === 'manual' || event.source === 'gmail';
}

function evStart(e) { return parseISO(e.start_time); }
function evEnd(e) { return e.end_time ? parseISO(e.end_time) : addMinutes(evStart(e), e.duration_minutes || 30); }
function evDur(e) {
  if (e.duration_minutes) return e.duration_minutes;
  return Math.max(5, Math.round((evEnd(e) - evStart(e)) / 60000));
}

// Squeezes a new item of `durationMin` into `targetStart`. Fixed (non-flexible) events
// are immovable barriers: the new item is cut to fit before the next fixed meeting and,
// when there's no room, nudged past it. Flexible items the new item overlaps are first
// *shaved* (their start moves later, keeping their end) to make room in place; if a
// shave would shrink a flexible item below the minimum length it is shifted later
// instead, cascading past fixed meetings. Returns
// { newStart, newEnd, date, updates: [{id,start_time,end_time,date}], nudged }.
export function computeSqueeze(allEvents, targetStart, durationMin, settings = {}) {
  const day = targetStart;
  const workStartHour = settings.work_start_hour ?? 9;
  const workEndHour = settings.work_end_hour ?? 18;
  const MIN_ITEM = 5;

  const minTo = (d) => d.getHours() * 60 + d.getMinutes();

  const dayEvents = allEvents
    .filter(e => e.start_time && isSameDay(parseISO(e.start_time), day))
    .map(e => {
      const s = evStart(e), en = evEnd(e);
      return { id: e.id, s, e: en, dur: Math.max(MIN_ITEM, Math.round((en - s) / 60000)), flex: isFlexibleEvent(e) };
    })
    .sort((a, b) => a.s - b.s);

  const fixed = dayEvents.filter(e => !e.flex);
  const workStart = setMinutes(setHours(startOfDay(day), workStartHour), 0);
  const workEnd = setMinutes(setHours(startOfDay(day), workEndHour), 0);

  const pushPastFixed = (start, dur) => {
    let s = new Date(start);
    for (let g = 0; g < 50; g++) {
      const hit = fixed.find(f => f.s < addMinutes(s, dur) && f.e > s);
      if (!hit) break;
      s = new Date(hit.e);
    }
    return s;
  };

  // Nudge the new item past any fixed meeting that covers the desired slot.
  let newStart = pushPastFixed(targetStart, durationMin);
  let nudged = newStart > targetStart;
  if (newStart < workStart) newStart = new Date(workStart);

  // Hard ceiling: the next fixed meeting after newStart (or the end of the work day).
  // Fixed meetings can't be moved, so the new item is cut to fit before it.
  let ceil = new Date(workEnd);
  for (const f of fixed) { if (f.s >= newStart && f.s < ceil) ceil = new Date(f.s); }

  const updates = [];

  // If newStart lands inside a flexible item (dropped on top of its tail), first try
  // to shift that item earlier to preserve its duration; only when there isn't room
  // before it do we compress its tail to newStart. This keeps the previous item intact
  // instead of shrinking it or bumping following items to later slots.
  const overlapPrev = dayEvents.find(ev => ev.flex && ev.s < newStart && ev.e > newStart);
  if (overlapPrev) {
    const overlap = minTo(overlapPrev.e) - minTo(newStart); // minutes eaten off the tail
    const priorEnd = dayEvents
      .filter(ev => ev !== overlapPrev && minTo(ev.e) <= minTo(overlapPrev.s))
      .reduce((mx, ev) => Math.max(mx, minTo(ev.e)), minTo(workStart));
    const gapBefore = minTo(overlapPrev.s) - priorEnd;
    if (gapBefore >= overlap) {
      // Shift the previous item earlier by the overlap, preserving its duration.
      const ns = addMinutes(overlapPrev.s, -overlap);
      const ne = addMinutes(overlapPrev.e, -overlap);
      updates.push({ id: overlapPrev.id, start_time: ns.toISOString(), end_time: ne.toISOString(), date: format(ns, 'yyyy-MM-dd') });
    } else {
      // No room earlier — compress the previous item's tail to make space in place.
      updates.push({ id: overlapPrev.id, start_time: overlapPrev.s.toISOString(), end_time: newStart.toISOString(), date: format(overlapPrev.s, 'yyyy-MM-dd') });
    }
  }

  // Cut the new item so it never crosses the next fixed meeting.
  let newDur = Math.min(durationMin, Math.max(0, minTo(ceil) - minTo(newStart)));
  let newEnd = addMinutes(newStart, newDur);

  // Stagger the flexible items the new item overlaps so no two share a time: each is
  // placed right after the previous one and shortened to fit before the next fixed
  // meeting, following the existing sequence (To Do / dropped order). Items are
  // compressed in place rather than bumped to far-off later slots.
  const flexAfter = dayEvents
    .filter(ev => ev.flex && ev !== overlapPrev && minTo(ev.e) > minTo(newStart))
    .sort((a, b) => a.s - b.s);

  const dayStart = startOfDay(day);
  const workEndMin = minTo(workEnd);
  let cursorMin = minTo(newEnd);
  let i = 0;
  while (i < flexAfter.length) {
    const f = flexAfter[i];
    if (minTo(f.s) >= cursorMin) break; // gap reached — no overlap, leave the rest
    if (cursorMin >= workEndMin) break; // end of work day
    let ceilMin = workEndMin;
    for (const fx of fixed) { const fxMin = minTo(fx.s); if (fxMin > cursorMin && fxMin < ceilMin) ceilMin = fxMin; }
    const avail = ceilMin - cursorMin;
    if (avail < MIN_ITEM) { cursorMin = ceilMin; continue; } // blocked by a fixed meeting — step past it and retry this item
    const fdur = Math.min(f.dur, avail); // shorten to fit, never below MIN_ITEM
    const fs = addMinutes(dayStart, cursorMin);
    const fe = addMinutes(dayStart, cursorMin + fdur);
    updates.push({ id: f.id, start_time: fs.toISOString(), end_time: fe.toISOString(), date: format(fs, 'yyyy-MM-dd') });
    cursorMin += fdur;
    i++;
  }

  // No room at all before the next fixed meeting — nudge the new item after it.
  if (newDur < MIN_ITEM) {
    newStart = new Date(ceil);
    nudged = true;
    let ceil2 = new Date(workEnd);
    for (const f of fixed) { if (f.s >= newStart && f.s < ceil2) ceil2 = new Date(f.s); }
    newDur = Math.min(durationMin, Math.max(MIN_ITEM, minTo(ceil2) - minTo(newStart)));
    newEnd = addMinutes(newStart, newDur);
  }

  return { newStart: newStart.toISOString(), newEnd: newEnd.toISOString(), date: format(newStart, 'yyyy-MM-dd'), updates, nudged };
}