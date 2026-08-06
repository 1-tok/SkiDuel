import React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek, addMonths, subMonths } from 'date-fns';

export default function CalendarHeader({ currentDate, setCurrentDate, viewMode, setViewMode }) {
  const goToday = () => setCurrentDate(new Date());

  const goPrev = () => {
    if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (viewMode === 'biweek') setCurrentDate(subWeeks(currentDate, 2));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const goNext = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (viewMode === 'biweek') setCurrentDate(addWeeks(currentDate, 2));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const dateLabel = (() => {
    if (viewMode === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    const start = startOfWeek(currentDate);
    const span = viewMode === 'week' ? 6 : 13;
    return `${format(start, 'MMM d')} — ${format(addDays(start, span), 'MMM d, yyyy')}`;
  })();

  const views = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'biweek', label: 'Bi-Week' },
    { id: 'month', label: 'Month' },
  ];

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{dateLabel}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={goToday} className="text-xs h-7">
          Today
        </Button>
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <Button variant="ghost" size="icon" onClick={goPrev} className="h-6 w-6">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goNext} className="h-6 w-6">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex bg-muted rounded-lg p-0.5 ml-2">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === v.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}