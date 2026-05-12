import React, { useState } from 'react';
import { LayoutGrid, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KanbanColumn from './KanbanColumn';

export default function KanbanPanel({ events }) {
  const [collapsed, setCollapsed] = useState(false);

  const columns = {
    todo: events.filter(e => e.kanban_column === 'todo'),
    doing: events.filter(e => e.kanban_column === 'doing'),
    done: events.filter(e => e.kanban_column === 'done'),
    cancelled: events.filter(e => e.kanban_column === 'cancelled'),
  };

  if (collapsed) {
    return (
      <div className="w-10 min-w-[40px] border-l border-border bg-card flex flex-col items-center py-3">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} className="h-7 w-7">
          <PanelRightOpen className="w-3.5 h-3.5" />
        </Button>
        <div className="mt-4 flex flex-col items-center gap-2">
          {Object.entries(columns).map(([key, col]) => (
            col.length > 0 && (
              <div key={key} className="flex flex-col items-center">
                <span className="text-[9px] font-medium text-muted-foreground">{col.length}</span>
              </div>
            )
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[320px] min-w-[320px] border-l border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <LayoutGrid className="w-3.5 h-3.5 text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Board</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} className="h-7 w-7">
          <PanelRightClose className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {['doing', 'todo', 'done', 'cancelled'].map(col => (
          <KanbanColumn key={col} columnId={col} events={columns[col]} />
        ))}
      </div>
    </div>
  );
}