import React from 'react';
import { parseISO, isBefore, isToday } from 'date-fns';
import { Check, Trash2, X } from 'lucide-react';
import KanbanColumn from './KanbanColumn';

export default function KanbanPanel({
  events, onAdd, onDelete, onUpdate,
  selectedIds, onToggleSelect, onSelectAll, onBulkDelete, onBulkComplete, onBulkMove,
}) {
  const now = new Date();
  // Exclude events from calendars shared with the user — they only show on the Calendar view.
  const own = events.filter(e => !e.is_shared_calendar);
  const isPast = (e) => e.start_time && isBefore(parseISO(e.start_time), now);
  const isTodayActive = (e) => {
    if (!e.start_time || !isToday(parseISO(e.start_time))) return false;
    if (e.status === 'cancelled' || e.status === 'completed') return false;
    const end = e.end_time ? parseISO(e.end_time) : parseISO(e.start_time);
    return end >= now;
  };

  const columns = {
    todo: own.filter(e => e.kanban_column === 'todo' && !isTodayActive(e) && !isPast(e)),
    doing: own.filter(e => e.kanban_column === 'doing' || (e.kanban_column === 'todo' && isTodayActive(e))),
    done: own.filter(e => e.kanban_column === 'done'),
    past: own.filter(e => e.kanban_column === 'past' || (e.kanban_column === 'todo' && isPast(e) && !isTodayActive(e))),
  };

  const selected = selectedIds || new Set();
  const someSelected = selected.size > 0;
  const allSelected = own.length > 0 && own.every(e => selected.has(e.id));

  return (
    <div className="h-full flex flex-col bg-muted/30">
      <div className="px-4 py-1.5 border-b border-border bg-card/60 flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll?.(own.map(o => o.id), e.target.checked)}
            className="w-3.5 h-3.5 accent-primary rounded"
          />
          <span className="text-[11px] text-muted-foreground">Select all</span>
        </label>
        {someSelected && (
          <>
            <span className="text-[11px] font-medium text-primary">{selected.size} selected</span>
            <button onClick={onBulkComplete} title="Mark complete" className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors">
              <Check className="w-3 h-3" /> Complete
            </button>
            <button onClick={onBulkDelete} title="Move to Past" className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3 h-3" /> Past
            </button>
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              Move to
              <select
                value=""
                onChange={(e) => { if (e.target.value) onBulkMove?.(e.target.value); }}
                className="text-[11px] border border-input rounded-md bg-background px-1.5 py-1 outline-none"
              >
                <option value="">Column…</option>
                <option value="todo">To Do</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
                <option value="past">Past</option>
              </select>
            </label>
            <button onClick={() => onSelectAll?.([], false)} title="Clear" className="ml-auto p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors">
              <X className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 min-h-0 p-4 gap-4 overflow-x-auto overscroll-contain">
        {['todo', 'doing', 'done', 'past'].map(col => (
          <KanbanColumn
            key={col}
            columnId={col}
            events={columns[col]}
            onAdd={onAdd}
            onDelete={onDelete}
            onUpdate={onUpdate}
            selectedIds={selected}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </div>
  );
}