import React, { useState } from 'react';
import { Mail, Clock, GripVertical, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getEventColor } from '@/lib/scheduling';
import EventModal from './EventModal';

export default function KanbanCard({ event, isDragging, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false);
  const colors = getEventColor(event.color);
  const isCompleted = event.status === 'completed';
  const isCancelled = event.status === 'cancelled';
  const startTime = event.start_time ? format(parseISO(event.start_time), 'h:mm a') : '';

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className={`group relative bg-card rounded-lg border px-3 py-2.5 transition-all duration-150 cursor-pointer
          ${isDragging ? 'shadow-xl scale-[1.02] ring-2 ring-primary/20' : 'hover:shadow-md hover:-translate-y-0.5 border-border'}
          ${isCancelled ? 'opacity-50' : ''}
        `}
      >
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(event); }}
            title="Delete"
            className="absolute top-1.5 right-1.5 p-1 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        <div className="flex items-start gap-2">
          <GripVertical className="w-3 h-3 text-muted-foreground/30 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
              <span className={`text-xs font-medium truncate ${isCompleted || isCancelled ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {event.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {startTime && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-2.5 h-2.5" />
                  {startTime}
                </div>
              )}
              {event.duration_minutes && (
                <span className="text-[10px] text-muted-foreground">{event.duration_minutes}m</span>
              )}
              {event.source === 'gmail' && (
                <Mail className="w-2.5 h-2.5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </div>

      <EventModal event={event} open={modalOpen} onClose={() => setModalOpen(false)} onDelete={onDelete} />
    </>
  );
}