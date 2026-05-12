import React, { useState } from 'react';
import { Check, Calendar, Mail, GripVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import EmailModal from './EmailModal';

export default function EmailCard({ email, onMarkRead, onSchedule, isDragging }) {
  const [modalOpen, setModalOpen] = useState(false);

  const timeStr = email.timestamp 
    ? format(parseISO(email.timestamp), 'h:mm a') 
    : '';

  return (
    <>
    <div
      onClick={() => !isDragging && setModalOpen(true)}
      className={`group relative bg-card rounded-lg border border-border p-3 transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg scale-105 opacity-90 ring-2 ring-primary/30' : 'hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-foreground truncate">{email.sender}</span>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeStr}</span>
          </div>
          <p className="text-xs font-medium text-foreground/80 truncate mb-0.5">{email.subject}</p>
          <p className="text-[11px] text-muted-foreground truncate">{email.preview}</p>
        </div>
      </div>
      
      <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-border/50">
        <button
          onClick={(e) => { e.stopPropagation(); onMarkRead(email); }}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
        >
          <Check className="w-3 h-3" />
          Done
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSchedule(email); }}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <Calendar className="w-3 h-3" />
          Schedule
        </button>
      </div>
    </div>
    <EmailModal
      email={email}
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      onMarkRead={onMarkRead}
      onSchedule={onSchedule}
    />
    </>
  );
}