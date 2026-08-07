import React from 'react';
import { Mail, GripVertical, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getEventColor } from '@/lib/scheduling';

export default function CalendarEvent({ event, isDragging, style, isGhost }) {
  const colors = getEventColor(event.color);
  const isCompleted = event.status === 'completed';
  const isCancelled = event.status === 'cancelled';
  const isShared = !!event.is_shared_calendar;
  const startTime = format(parseISO(event.start_time), 'h:mm a');

  return (
    <div
      style={style}
      className={`rounded-lg border px-2.5 py-1.5 transition-all duration-150 overflow-hidden group h-full
        ${isGhost
          ? 'border-dashed border-primary/60 bg-primary/5 animate-pulse'
          : `${colors.bg} ${colors.border} cursor-grab active:cursor-grabbing`}
        ${isDragging ? 'shadow-xl scale-[1.02] ring-2 ring-primary/20 z-50' : 'hover:shadow-md hover:-translate-y-px'}
        ${isCancelled ? 'opacity-40' : ''}
      `}
    >
      <div className="flex items-start gap-1.5">
        {isGhost ? (
          <div className="w-3 h-3 mt-0.5 flex-shrink-0 border-2 border-primary/40 border-t-transparent rounded-full animate-spin" />
        ) : (
          <GripVertical className="w-3 h-3 text-muted-foreground/30 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isGhost ? 'bg-primary/60' : colors.dot} flex-shrink-0`} />
            <span className={`text-[11px] font-semibold truncate ${isGhost ? 'text-primary/70' : colors.text} ${isCompleted || isCancelled ? 'line-through' : ''}`}>
              {event.title}
            </span>
            {!isGhost && event.source === 'gmail' && (
              <Mail className={`w-2.5 h-2.5 ${colors.text} opacity-50 flex-shrink-0`} />
            )}
            {!isGhost && isShared && (
              <Users className={`w-2.5 h-2.5 ${colors.text} opacity-60 flex-shrink-0`} />
            )}
          </div>
          <span className={`text-[10px] truncate block ${isGhost ? 'text-primary/60' : `${colors.text} opacity-60`}`}>
            {startTime}{isGhost ? ' · creating…' : (isShared && event.calendar_name ? ` · via ${event.calendar_name}` : (event.calendar_name && event.calendar_name !== 'primary' ? ` · ${event.calendar_name}` : ''))}{!isGhost && event.source_account && event.source_account !== 'primary' ? ` · ${event.source_account}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}