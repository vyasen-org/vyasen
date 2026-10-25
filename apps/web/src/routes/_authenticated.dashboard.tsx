import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  GraduationCap,
  MoreHorizontal,
  Plus,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const metrics = [
  {
    label: "Total students",
    value: "1,248",
    change: "+4.8%",
    icon: GraduationCap,
    positive: true,
  },
  {
    label: "Teaching staff",
    value: "86",
    change: "+2 this term",
    icon: UsersRound,
    positive: true,
  },
  {
    label: "Attendance today",
    value: "94.2%",
    change: "−1.3%",
    icon: CalendarDays,
    positive: false,
  },
];

const activities = [
  {
    initials: "JM",
    name: "Jordan Miller",
    detail: "Attendance recorded · Grade 8",
    time: "8:42 AM",
    tone: "violet",
  },
  {
    initials: "AR",
    name: "Amara Rahman",
    detail: "Joined the staff directory",
    time: "8:15 AM",
    tone: "teal",
  },
  {
    initials: "LC",
    name: "Lucas Chen",
    detail: "Class schedule updated",
    time: "Yesterday",
    tone: "amber",
  },
];

const schedule = [
  {
    time: "09:00",
    subject: "Mathematics",
    detail: "Grade 8 · Room 204",
    tag: "In progress",
  },
  {
    time: "10:30",
    subject: "Science lab",
    detail: "Grade 10 · Lab 2",
    tag: "Next up",
  },
  {
    time: "12:00",
    subject: "Staff meeting",
    detail: "Faculty · Main hall",
    tag: "Upcoming",
  },
];

function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {Date.now().toLocaleString()}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Good morning, Avery
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across Greenwood Academy today.
          </p>
        </div>
        <Button className="gap-2">
          <Plus size={16} /> Add to school
        </Button>
      </div>

      <section
        aria-label="School overview"
        className="grid gap-4 md:grid-cols-3"
      >
        {metrics.map(({ label, value, change, icon: Icon, positive }) => (
          <article
            key={label}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
                <Icon size={19} />
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`More options for ${label}`}
                className="size-8"
              >
                <MoreHorizontal size={17} />
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">{label}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold tracking-tight">{value}</p>
              <span
                className={`mb-1 inline-flex items-center gap-1 text-xs font-medium ${
                  positive ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {positive ? (
                  <ArrowUpRight size={13} />
                ) : (
                  <ArrowDownRight size={13} />
                )}
                {change}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Attendance overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Daily attendance across the school
              </p>
            </div>
            <button className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
              This week
            </button>
          </div>
          <div className="mt-8 flex h-52 items-end justify-between gap-3 border-b border-border px-1">
            {[64, 82, 73, 94, 79, 89, 68].map((height, index) => (
              <div
                key={index}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[10px] text-muted-foreground">
                  {height}%
                </span>
                <div
                  className={`w-full max-w-12 rounded-t-xl ${
                    index === 3 ? "bg-accent" : "bg-accent/30"
                  }`}
                  style={{ height: `${height}%` }}
                />
                <span className="mb-[-1.5rem] text-[10px] text-muted-foreground">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-9 flex items-center justify-between rounded-xl bg-background px-4 py-3">
            <span className="text-xs text-muted-foreground">
              School average
            </span>
            <span className="text-sm font-semibold">81.3%</span>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold">Today&apos;s schedule</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A few things on the calendar
              </p>
            </div>
            <CalendarDays size={18} className="text-muted-foreground" />
          </div>
          <div className="mt-5 space-y-1">
            {schedule.map((item, index) => (
              <div
                key={item.subject}
                className="flex gap-3 rounded-xl p-3 hover:bg-background"
              >
                <span className="w-12 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">
                  {item.time}
                </span>
                <span
                  className={`mt-1 h-10 w-0.5 shrink-0 rounded-full ${index === 0 ? "bg-accent" : "bg-border"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {item.subject}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
                <span
                  className={`self-start rounded-full px-2 py-1 text-[10px] ${
                    index === 0
                      ? "bg-accent/15 text-accent"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            className="mt-3 w-full justify-between text-muted-foreground"
          >
            View full schedule <ArrowRight size={15} />
          </Button>
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Recent school activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Updates from your school community
            </p>
          </div>
          <Button variant="ghost" size="sm">
            View activity
          </Button>
        </div>
        <div className="mt-4 divide-y divide-border">
          {activities.map((activity) => (
            <div key={activity.name} className="flex items-center gap-3 py-4">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  activity.tone === "violet"
                    ? "bg-violet-400/15 text-violet-300"
                    : activity.tone === "teal"
                      ? "bg-teal-400/15 text-teal-300"
                      : "bg-amber-400/15 text-amber-300"
                }`}
              >
                {activity.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{activity.name}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {activity.detail}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
