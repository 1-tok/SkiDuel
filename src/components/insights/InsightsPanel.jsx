import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { format, parseISO, subDays, startOfDay, isSameDay, isAfter } from 'date-fns';
import { ArrowLeft, ListTodo, CheckCircle2, CalendarCheck, Mail } from 'lucide-react';

const DAYS = 14;

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tint}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <div className="text-2xl font-semibold leading-tight text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export default function InsightsPanel({ events, emails, onBack }) {
  const { donePerDay, backlogSeries, stats } = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: DAYS }, (_, i) => subDays(startOfDay(today), DAYS - 1 - i));
    const key = (d) => format(d, 'yyyy-MM-dd');

    const doneCount = {};
    const createdCount = {};
    const emailCount = {};
    days.forEach((d) => {
      doneCount[key(d)] = 0;
      createdCount[key(d)] = 0;
      emailCount[key(d)] = 0;
    });

    events.forEach((e) => {
      if (e.status === 'completed' && e.start_time) {
        const k = key(parseISO(e.start_time));
        if (k in doneCount) doneCount[k] += 1;
      }
      if (e.created_date) {
        const k = key(parseISO(e.created_date));
        if (k in createdCount) createdCount[k] += 1;
      }
    });
    emails.forEach((e) => {
      const ts = e.timestamp || e.created_date;
      if (ts) {
        const k = key(parseISO(ts));
        if (k in emailCount) emailCount[k] += 1;
      }
    });

    const donePerDay = days.map((d) => ({
      date: format(d, 'M/d'),
      Done: doneCount[key(d)],
      Emails: emailCount[key(d)],
    }));

    let cumDone = 0;
    let cumCreated = 0;
    const backlogSeries = donePerDay.map((p) => {
      cumDone += p.Done;
      cumCreated += (createdCount[key(days[donePerDay.indexOf(p)])] || 0);
      return { date: p.date, Done: cumDone, Backlog: Math.max(0, cumCreated - cumDone) };
    });

    const backlogNow = events.filter(
      (e) => e.kanban_column === 'todo' && e.status !== 'cancelled' && e.status !== 'completed'
    ).length;
    const doneToday = events.filter(
      (e) => e.status === 'completed' && e.start_time && isSameDay(parseISO(e.start_time), today)
    ).length;
    const weekStart = subDays(startOfDay(today), 7);
    const doneWeek = events.filter(
      (e) => e.status === 'completed' && e.start_time && isAfter(parseISO(e.start_time), weekStart)
    ).length;
    const activeEmailDays = days.filter((d) => emailCount[key(d)] > 0).length || 1;
    const totalEmails = Object.values(emailCount).reduce((a, b) => a + b, 0);
    const avgEmails = totalEmails / activeEmailDays;

    return {
      donePerDay,
      backlogSeries,
      stats: { backlogNow, doneToday, doneWeek, avgEmails },
    };
  }, [events, emails]);

  return (
    <div className="h-full flex flex-col bg-background min-w-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-sm font-semibold text-foreground">Performance Insights</h1>
        <span className="text-xs text-muted-foreground">Game your day · last {DAYS} days</span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={ListTodo} label="Backlog (To Do)" value={stats.backlogNow} tint="bg-primary/10 text-primary" />
          <StatCard icon={CheckCircle2} label="Done today" value={stats.doneToday} tint="bg-chart-2/15 text-chart-2" />
          <StatCard icon={CalendarCheck} label="Done this week" value={stats.doneWeek} tint="bg-chart-3/15 text-chart-3" />
          <StatCard icon={Mail} label="Avg emails / day" value={stats.avgEmails.toFixed(1)} tint="bg-chart-4/15 text-chart-4" />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Queue → Done over time</h2>
            <span className="text-xs text-muted-foreground">Cumulative done vs. remaining backlog</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={backlogSeries} margin={{ top: 5, right: 10, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="backlogGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Done" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#doneGrad)" />
                <Area type="monotone" dataKey="Backlog" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#backlogGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">Done per day</h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={donePerDay} margin={{ top: 5, right: 10, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="Done" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">Emails per day</h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={donePerDay} margin={{ top: 5, right: 10, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="Emails" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}