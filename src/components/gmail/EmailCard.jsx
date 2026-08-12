import React from 'react';
import { Check, Calendar, Mail, GripVertical, Trash2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function EmailCard({ email, onMarkRead, onSchedule, onSnooze, onOpen, onDelete, isDragging, selected, onToggleSelect }) {
  const timeStr = email.timestamp ? format(parseISO(email.timestamp), 'HH:mm') : '';

  return (
    <div
      onClick={() => !isDragging && onOpen?.(email)}
      className={`group relative bg-card rounded-lg border border-border p-3 transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg scale-105 opacity-90 ring-2 ring-primary/30' : 'hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5'
      } ${selected ? 'ring-2 ring-primary/40 border-primary/40' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(email.id); }}
          title="Select"
          className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
            selected ? 'bg-primary border-primary' : 'border-border bg-card hover:border-primary/40'
          }`}
        >
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </button>
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-foreground truncate">{email.sender}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {email.channel === 'slack' && (
                <span className="text-[9px] font-semibold text-accent bg-accent/15 px-1 py-0.5 rounded">Slack</span>
              )}
              <span className="text-[10px] text-muted-foreground tabular-nums group-hover:hidden">{timeStr}</span>
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkRead(email); }}
                  title="Done"
                  className="p-1 rounded-md text-muted-foreground/70 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSchedule(email); }}
                  title="Schedule"
                  className="p-1 rounded-md text-muted-foreground/70 hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSnooze(email); }}
                  title="Snooze"
                  className="p-1 rounded-md text-muted-foreground/70 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(email); }}
                    title="Move to Past"
                    className="p-1 rounded-md text-muted-foreground/70 hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs font-medium text-foreground/80 truncate mb-0.5">{email.subject}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-5 leading-relaxed">{email.preview}</p>
          {email.source_account && (
            <p className="text-[9px] text-muted-foreground/70 truncate mt-0.5">via {email.source_account}</p>
          )}
        </div>
      </div>
    </div>
  );
}