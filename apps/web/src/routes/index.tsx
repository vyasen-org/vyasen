import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const highlights = [
  {
    icon: UsersRound,
    title: "Every role, one place",
    description:
      "Give administrators, teachers, families, and students a workspace that makes sense.",
  },
  {
    icon: ShieldCheck,
    title: "Designed for school privacy",
    description:
      "Keep each school's people, records, and daily work securely in its own workspace.",
  },
  {
    icon: CalendarDays,
    title: "Less busywork",
    description:
      "Bring class schedules, attendance, and school updates together in one clear view.",
  },
];

function LandingPage() {
  return (
    <AppShell>
      <div className="bg-background text-foreground">
        <main>
          <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-12 sm:px-8 lg:grid-cols-[1fr_0.95fr] lg:gap-10 lg:pb-32 lg:pt-20">
            <div className="pointer-events-none absolute -left-36 top-12 size-[28rem] rounded-full bg-accent/10 blur-[120px]" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <Sparkles size={14} className="text-accent" />A calmer way to
                run a school
              </span>
              <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                A better day at school starts{" "}
                <span className="text-accent">with everyone in sync.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                Bring the people and everyday work of your school together in
                one thoughtful, secure workspace.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="default" className="h-12 px-5" asChild>
                  <Link to="/dashboard">
                    Explore the workspace <ArrowRight size={17} />
                  </Link>
                </Button>
                <a
                  href="#platform"
                  className="inline-flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                >
                  See what&apos;s included <ArrowUpRight size={16} />
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
                {[
                  "For every school role",
                  "One workspace per school",
                  "Built to grow with you",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check size={14} className="text-accent" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 rounded-[2.5rem] bg-accent/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface p-4 shadow-2xl shadow-black/20 sm:p-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent">
                      <GraduationCap size={19} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Greenwood Academy</p>
                      <p className="text-xs text-muted-foreground">
                        Your school at a glance
                      </p>
                    </div>
                  </div>
                  <span className="size-2 rounded-full bg-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-3 py-5">
                  {[
                    { label: "Students", value: "1,248", icon: GraduationCap },
                    { label: "Teachers", value: "86", icon: UsersRound },
                  ].map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-border bg-background p-4"
                    >
                      <Icon size={17} className="text-accent" />
                      <p className="mt-4 text-2xl font-semibold">{value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        Today&apos;s rhythm
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        A quick look at the school day
                      </p>
                    </div>
                    <CalendarDays size={18} className="text-muted-foreground" />
                  </div>
                  <div className="mt-5 grid grid-cols-7 items-end gap-2">
                    {[38, 62, 48, 84, 58, 72, 44].map((height, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center gap-2"
                      >
                        <div
                          className={`w-full rounded-t-lg ${index === 3 ? "bg-accent" : "bg-accent/25"}`}
                          style={{ height: `${height}px` }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {["M", "T", "W", "T", "F", "S", "S"][index]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400">
                    <BookOpenCheck size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">
                      A shared school workspace
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Admin · Principal · Teacher · Student
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            id="platform"
            className="border-y border-border bg-surface/40"
          >
            <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                  One school, one clear picture
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  The right information, for the right people.
                </h2>
                <p className="mt-4 leading-7 text-muted-foreground">
                  A shared foundation for school teams, with each role focused
                  on what matters to them.
                </p>
              </div>
              <div id="community" className="mt-10 grid gap-4 md:grid-cols-3">
                {highlights.map(({ icon: Icon, title, description }) => (
                  <article
                    key={title}
                    className="rounded-2xl border border-border bg-background p-6"
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-accent/15 text-accent">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-5 text-base font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section
            id="about"
            className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-center"
          >
            <div>
              <p className="text-xl font-semibold">
                Make more room for learning.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                A connected school community begins here.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/dashboard">
                Preview the dashboard <ArrowRight size={15} />
              </Link>
            </Button>
          </section>
        </main>
        <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">
          School SMS · A shared workspace for school communities
        </footer>
      </div>
    </AppShell>
  );
}
