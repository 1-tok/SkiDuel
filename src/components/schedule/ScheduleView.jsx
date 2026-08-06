import React from 'react';
import { parseISO, format, isToday, isTomorrow } from 'date-fns';
import { Mail, Share2, CalendarClock } from 'lucide-react';
import { Droppable } from '@hello-pangea/dnd';

const statusStyles = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  needs_followup: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};

export default function ScheduleView({ events }) {
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
          className={`h-full overflow-y-auto bg-muted/30 transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
        >
          <div className="max-w-2xl mx-auto p-4 space-y-6">
            {upcoming.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <CalendarClock className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No upcoming events</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Drop an email here to schedule it</p>
              </div>
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
                    <div key={e.id} className="flex gap-3 bg-card rounded-lg border border-border p-3 hover:shadow-sm transition-shadow">
                      <div className="flex flex-col items-center justify-center min-w-[52px] py-0.5">
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {format(parseISO(e.start_time), 'HH:mm')}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {e.end_time ? format(parseISO(e.end_time), 'HH:mm') : ''}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate mb-0.5">{e.title}</p>
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}