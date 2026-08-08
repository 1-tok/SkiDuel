import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { format, parseISO, subDays, startOfDay } from 'date-fns';

const DAYS = 7;

// Compact weekly trend: tasks completed each day vs. items scheduled for that day.
export default function WeeklyTrendChart({ events }) {
  const data = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: DAYS }, (_, i) => subDays(startOfDay(today), DAYS - 1 - i));
    const key = (d) => format(d, 'yyyy-MM-dd');

    const scheduledCount = {};
    const doneCount = {};
    days.forEach((d) => {
      scheduledCount[key(d)] = 0;
      doneCount[key(d)] = 0;
    });

    events.forEach((e) => {
      if (e.start_time) {
        const k = key(parseISO(e.start_time));
        if (k in scheduledCount) scheduledCount[k] += 1;
      }
      if (e.status === 'completed' && e.updated_date) {
        const k = key(parseISO(e.updated_date));
        if (k in doneCount) doneCount[k] += 1;
      }
    });

    return days.map((d) => ({
      date: format(d, 'EEE'),
      Scheduled: scheduledCount[key(d)],
      Completed: doneCount[key(d)],
    }));
  }, [events]);

  return (
    <div className="h-[150px] w-full px-4 pb-2">
      <div className="h-full rounded-lg border border-border bg-card p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
            <Bar dataKey="Scheduled" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Completed" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}