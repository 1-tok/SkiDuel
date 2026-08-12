import React, { useState } from 'react';
import { Mail, Inbox, Trash2, Calendar, Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import EmailCard from './EmailCard';
import { Draggable, Droppable } from '@hello-pangea/dnd';

export default function GmailSidebar({
  emails, onMarkRead, onSchedule, onSnooze, onOpen, onDelete,
  selectedIds, onToggleSelect, onSelectAll, onBulkDelete, onBulkSchedule, onBulkDone,
}) {
  const [showRead, setShowRead] = useState(false);

  const visibleEmails = showRead ? emails : emails.filter(e => !e.is_read && !e.is_actioned);
  const selected = selectedIds || new Set();
  const allSelected = visibleEmails.length > 0 && visibleEmails.every(e => selected.has(e.id));
  const someSelected = selected.size > 0;

  const toggleAll = (checked) => onSelectAll?.(visibleEmails.map(e => e.id), checked);

  return (
    <div className="bg-card flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="w-3.5 h-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Communications</h2>
          <div className="ml-auto flex items-center gap-1">
            {visibleEmails.length > 0 && (
              <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {visibleEmails.length}
              </span>
            )}

          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
              className="w-3.5 h-3.5 accent-primary rounded"
            />
            <span className="text-[11px] text-muted-foreground">Select all</span>
          </label>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">Show read</span>
            <Switch checked={showRead} onCheckedChange={setShowRead} className="scale-75" />
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="px-3 py-2 border-b border-border bg-primary/5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-primary mr-1">{selected.size} selected</span>
          <button onClick={onBulkSchedule} title="Create calendar entries" className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md text-primary hover:bg-primary/10 transition-colors">
            <Calendar className="w-3 h-3" /> Schedule
          </button>
          <button onClick={onBulkDone} title="Mark done" className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors">
            <Check className="w-3 h-3" /> Done
          </button>
          <button onClick={onBulkDelete} title="Move to Past" className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3 h-3" /> Past
          </button>
          <button onClick={() => onSelectAll?.([], false)} title="Clear selection" className="ml-auto p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Email List */}
      <Droppable droppableId="gmail-sidebar" type="TASK">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3 space-y-2"
          >
            {visibleEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Inbox className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">All caught up!</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">No unread messages</p>
              </div>
            ) : (
              visibleEmails.map((email, index) => (
                <Draggable key={email.id} draggableId={`email-${email.id}`} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <EmailCard
                        email={email}
                        onMarkRead={onMarkRead}
                        onSchedule={onSchedule}
                        onSnooze={onSnooze}
                        onOpen={onOpen}
                        onDelete={onDelete}
                        isDragging={snapshot.isDragging}
                        selected={selected.has(email.id)}
                        onToggleSelect={onToggleSelect}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

    </div>
  );
}