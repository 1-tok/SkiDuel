import React, { useState, useEffect, useRef } from 'react';
import { parseISO, format, isToday, isTomorrow } from 'date-fns';
import { Mail, Share2, CalendarClock, Trash2, Users } from 'lucide-react';
import { Droppable } from '@hello-pangea/dnd';
import { formatAttendees } from '@/lib/attendees';
import EventModal from '../kanban/EventModal';
import ItemDropTarget from '../dnd/ItemDropTarget';

const statusStyles = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  needs_followup: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};

const InsertionIndicator = () => (
  <div className="flex items-center gap-2 py-1 px-1" data-schedule-insert>
    <div className="flex-1 h-0.5 rounded bg-primary/60" />
    <span className="text-[10px] text-primary font-medium px-1.5 py-0.5 rounded-full bg-primary/10 whitespace-nowrap">
      Insert here
    </span>
    <div className="flex-1 h-0.5 rounded bg-primary/60" />
  </div>
);

const NowLine = React.forwardRef(function NowLine({ label }, ref) {
  return (
    <div ref={ref} className="flex items-center gap-2 py-1" data-now-line>
      <div className="w-2 h-2 rounded-full bg-destructive -ml-0.5" />
      <div className="flex-1 h-[1.5px] bg-destructive" />
      {label && <span className="text-[10px] font-semibold text-destructive tabular-nums whitespace-nowrap">{label}</span>}
    </div>
  );
});

export default function ScheduleView({ events, onAdd, onDelete, onUpdate, draggingKind }) {
  const [modalEvent, setModalEvent] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const draggingOverRef = useRef(false);
  const scrollRef = useRef(null);
  const redlineRef = useRef(null);
  const didScrollRef = useRef(false);

  const now = new Date();
  const todayKey = format(now, 'yyyy-MM-dd');
  const upcoming = events
    .filter(e => e.start_time)
    .filter(e => {
      const d = parseISO(e.start_time);
      return isToday(d) || d >= now;
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const flatIndexById = {};
  upcoming.forEach((e, i) => { flatIndexById[e.id] = i; });

  // On entering Schedule, scroll the "now" redline to the top of the view.
  useEffect(() => {
    if (didScrollRef.current) return;
    const line = redlineRef.current;
    const container = scrollRef.current;
    if (!line || !container) return;
    const lineRect = line.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    container.scrollTop = Math.max(0, container.scrollTop + lineRect.top - containerRect.top - 36);
    didScrollRef.current = true;
  }, [upcoming]);

  // While a drag is over the schedule, track the pointer so we can show where the
  // dropped item will insert among the existing cards.
  useEffect(() => {
    const onMove = (e) => {
      if (!draggingOverRef.current || e.clientY == null) return;
      const cards = Array.from(document.querySelectorAll('[data-schedule-item]'));
      if (!cards.length) { setHoverIndex(0); return; }
      let idx = cards.length;
      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) { idx = i; break; }
      }
      setHoverIndex(idx);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

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
      {(provided, snapshot) => {
        draggingOverRef.current = snapshot.isDraggingOver;
        const showIndicator = snapshot.isDraggingOver && hoverIndex !== null;
        return (
          <div
            ref={(el) => { provided.innerRef(el); scrollRef.current = el; }}
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
              {groups.length > 0 && !groups.some(g => g.key === todayKey) && (
                <NowLine ref={redlineRef} label={`${format(now, 'HH:mm')} · now`} />
              )}
              {groups.map(g => {
                const isTodayGroup = g.key === todayKey;
                const rawNowIdx = isTodayGroup ? g.items.findIndex(e => parseISO(e.start_time) > now) : -1;
                const nowIdx = rawNowIdx === -1 ? g.items.length : rawNowIdx;
                return (
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
                    {g.items.map((e, i) => {
                      const flatIdx = flatIndexById[e.id];
                      return (
                        <React.Fragment key={e.id}>
                          {isTodayGroup && i === nowIdx && <NowLine ref={redlineRef} label={`${format(now, 'HH:mm')} · now`} />}
                          {showIndicator && hoverIndex === flatIdx && <InsertionIndicator />}
                          <ItemDropTarget itemId={e.id} disabled={draggingKind !== 'email' || !!e.isGhost}>
                          <div
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
                              <p className={`text-sm font-medium truncate mb-0.5 ${e.isGhost ? 'text-primary/70' : (e.status === 'scheduled' && e.end_time && new Date(e.end_time) < new Date()) ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
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
                                    {formatAttendees(e.attendees, 2) && (
                                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                        <Users className="w-2.5 h-2.5" />
                                        {formatAttendees(e.attendees, 2)}
                                      </span>
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
                          </ItemDropTarget>
                        </React.Fragment>
                      );
                    })}
                    {isTodayGroup && nowIdx === g.items.length && (
                      <NowLine ref={redlineRef} label={`${format(now, 'HH:mm')} · now`} />
                    )}
                  </div>
                </div>
                );
              })}
              {showIndicator && hoverIndex === upcoming.length && upcoming.length > 0 && <InsertionIndicator />}
              {provided.placeholder}
            </div>

            <EventModal event={modalEvent} open={!!modalEvent} onClose={() => setModalEvent(null)} onDelete={onDelete} onUpdate={onUpdate} />
          </div>
        );
      }}
    </Droppable>
  );
}