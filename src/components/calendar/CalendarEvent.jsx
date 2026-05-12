import React from 'react';
import { Mail, GripVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getEventColor } from '@/lib/scheduling';

export default function CalendarEvent({ event, isDragging, style }) {
  const colors = getEventColor(event.color);
  const isCompleted = event.status === 'completed';
  const isCancelled = event.status === 'cancelled';
  const startTime = format(parseISO(event.start_time), 'h:mm a');

  return (
    <div
      style={style}
      className={`rounded-lg border px-2.5 py-1.5 transition-all duration-150 cursor-grab active:cursor-grabbing overflow-hidden group h-full
        ${colors.bg} ${colors.border}
        ${isDragging ? 'shadow-xl scale-[1.02] ring-2 ring-primary/20 z-50' : 'hover:shadow-md hover:-translate-y-px'}
        ${isCancelled ? 'opacity-40' : ''}
      `}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="w-3 h-3 text-muted-foreground/30 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
            <span className={`text-[11px] font-semibold truncate ${colors.text} ${isCompleted || isCancelled ? 'line-through' : ''}`}>
              {event.title}
            </span>
            {event.source === 'gmail' && (
              <Mail className={`w-2.5 h-2.5 ${colors.text} opacity-50 flex-shrink-0`} />
            )}
          </div>
          <span className={`text-[10px] ${colors.text} opacity-60`}>
            {startTime}{event.calendar_name && event.calendar_name !== 'primary' ? ` · ${event.calendar_name}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}