import React from 'react';
import { format, parseISO } from 'date-fns';
import { Mail, Clock, Calendar, FileText, X, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getEventColor } from '@/lib/scheduling';
import RichText from '@/components/RichText';

const statusLabels = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  needs_followup: { label: 'Needs Follow-up', className: 'bg-orange-100 text-orange-700' },
};

const columnLabels = {
  todo: 'To Do',
  doing: 'Doing',
  done: 'Done',
  cancelled: 'Cancelled',
};

export default function EventModal({ event, open, onClose, onDelete }) {
  if (!event) return null;

  const colors = getEventColor(event.color);
  const startTime = event.start_time ? format(parseISO(event.start_time), 'EEEE, MMM d · h:mm a') : '';
  const endTime = event.end_time ? format(parseISO(event.end_time), 'h:mm a') : '';
  const status = statusLabels[event.status] || statusLabels.scheduled;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <div className={`w-3 h-3 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`} />
            <DialogTitle className="text-base leading-snug">{event.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* Status & column */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>
              {status.label}
            </span>
            {event.kanban_column && (
              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                {columnLabels[event.kanban_column] || event.kanban_column}
              </span>
            )}
          </div>

          {/* Time */}
          {startTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{startTime}{endTime ? ` – ${endTime}` : ''}</span>
            </div>
          )}

          {/* Duration */}
          {event.duration_minutes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{event.duration_minutes} minutes</span>
            </div>
          )}

          {/* Calendar name */}
          {event.calendar_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{event.calendar_name}</span>
            </div>
          )}

          {/* Source */}
          {event.source === 'gmail' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>From Gmail</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <RichText content={event.description} className="text-sm text-muted-foreground" />
            </div>
          )}

          {/* Follow-up note */}
          {event.followup_note && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
              <p className="text-xs font-medium text-orange-700 mb-1">Follow-up note</p>
              <RichText content={event.followup_note} className="text-sm text-orange-800" />
            </div>
          )}
        </div>

        {onDelete && !event.is_shared_calendar && (
          <div className="pt-2 border-t border-border mt-3">
            <button
              onClick={() => { onDelete(event); onClose?.(); }}
              className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Move to Past
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}