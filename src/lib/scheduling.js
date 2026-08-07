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