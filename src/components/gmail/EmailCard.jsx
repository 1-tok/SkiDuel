import React from 'react';
import { Check, Calendar, Mail, GripVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function EmailCard({ email, onMarkRead, onSchedule, onOpen, isDragging }) {
  const timeStr = email.timestamp ? format(parseISO(email.timestamp), 'HH:mm') : '';

  return (
    <div
      onClick={() => !isDragging && onOpen?.(email)}
      className={`group relative bg-card rounded-lg border border-border p-3 transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg scale-105 opacity-90 ring-2 ring-primary/30' : 'hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-foreground truncate">{email.sender}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground tabular-nums">{timeStr}</span>
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