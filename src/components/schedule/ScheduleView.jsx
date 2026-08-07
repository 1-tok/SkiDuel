import React, { useState } from 'react';
import { parseISO, format, isToday, isTomorrow } from 'date-fns';
import { Mail, Share2, CalendarClock, Trash2 } from 'lucide-react';
import { Droppable } from '@hello-pangea/dnd';
import EventModal from '../kanban/EventModal';

const statusStyles = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  needs_followup: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};

export default function ScheduleView({ events, onAdd, onDelete, onUpdate }) {
  const [modalEvent, setModalEvent] = useState(null);
  const now = new Date();
  const upcoming = events
    .filter(e => e.start_time)
    .filter(e => {
      const d = parseISO(e.start_time);
      return isToday(d) || d >= now;
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const groups = [];
  let lastKey = null;
  upcoming.forEach(e => {
    const d = parseISO(e.start_time);
    const key = format(d, 'yyyy-MM-dd');
    if (key !== lastKey) {
      groups.push({ key, date: d, items: [] });
      lastKey = key;
    }
    groups[groups.length - 1].items.push(e);
  });

  return (
    <Droppable droppableId="schedule" type="TASK">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          onClick={(e) => { if (!e.target.closest('[data-schedule-item]')) onAdd?.(); }}
          className={`h-full overflow-y-auto overscroll-contain bg-muted/30 transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
        >
          <div className="max-w-2xl mx-auto p-4 space-y-6">
            {upcoming.length === 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onAdd?.(); }}
                className="flex flex-col items-center justify-center w-full py-20 text-center rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <CalendarClock className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No upcoming events</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Click to add an item, or drop an email here</p>
              </button>
            )}
            {groups.map(g => (
              <div key={g.key}>
                <div className="sticky top-0 z-10 bg-background/80 backdrop-blur px-2 py-1.5 mb-2 flex items-center gap-2 border-b border-border">
                  <span className="text-xs font-semibold text-foreground">
                    {isToday(g.date) ? 'Today' : isTomorrow(g.date) ? 'Tomorrow' : format(g.date, 'EEEE, MMM d')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {g.items.length} {g.items.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
                <div className="space-y-2">
                  {g.items.map(e => (
                    <div
                      key={e.id}
                      data-schedule-item
                      onClick={() => !e.isGhost && setModalEvent(e)}
                      className={`flex gap-3 bg-card rounded-lg border p-3 transition-shadow ${
                        e.isGhost
                          ? 'border-dashed border-primary/50 bg-primary/5 animate-pulse cursor-default'
                          : 'border-border hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center min-w-[52px] py-0.5">
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {format(parseISO(e.start_time), 'HH:mm')}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {e.end_time ? format(parseISO(e.end_time), 'HH:mm') : ''}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate mb-0.5 ${e.isGhost ? 'text-primary/70' : 'text-foreground'}`}>
                          {e.title}
                        </p>
                        {e.isGhost ? (
                          <p className="text-[11px] text-primary/60">Creating calendar event…</p>
                        ) : (
                          <>
                            {e.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{e.description}</p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusStyles[e.status] || statusStyles.scheduled}`}>
                                {e.status}
                              </span>
                              {e.source === 'gmail' && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <Mail className="w-2.5 h-2.5" />gmail
                                </span>
                              )}
                              {e.is_shared_calendar && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <Share2 className="w-2.5 h-2.5" />shared
                                </span>
                              )}
                              {e.calendar_name && e.calendar_name !== 'primary' && (
                                <span className="text-[10px] text-muted-foreground">{e.calendar_name}</span>
                              )}
                              {e.source_account && (
                                <span className="text-[10px] text-muted-foreground/70">via {e.source_account}</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      {!e.isGhost && onDelete && !e.is_shared_calendar && (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); onDelete(e); }}
                          title="Delete"
                          className="self-center p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {provided.placeholder}
          </div>

          <EventModal event={modalEvent} open={!!modalEvent} onClose={() => setModalEvent(null)} onDelete={onDelete} onUpdate={onUpdate} />
        </div>
      )}
    </Droppable>
  );
}