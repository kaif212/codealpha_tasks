import { createFileRoute, Link } from "@tanstack/react-router";
import { KanbanSquare, MessageSquare, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Taskboard — Project management for small teams" },
      { name: "description", content: "Create projects, assign tasks, drag cards across boards and discuss work in real time." },
      { property: "og:title", content: "Taskboard — Project management for small teams" },
      { property: "og:description", content: "Boards, tasks, comments and real-time team collaboration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const features = [
  { Icon: KanbanSquare, title: "Kanban boards", text: "Drag tasks between To do, In progress and Done." },
  { Icon: Users, title: "Team projects", text: "Invite teammates by email and assign tasks." },
  { Icon: MessageSquare, title: "Comments", text: "Discuss every task right where the work lives." },
  { Icon: Zap, title: "Real-time", text: "Changes appear instantly for everyone on the board." },
];

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
            Plan · Assign · Ship
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
            Your team's work,<br />on one <span className="underline decoration-accent decoration-8 underline-offset-4">board</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Taskboard helps small teams create projects, assign tasks, set deadlines and talk it through — without the clutter.
          </p>
          <div className="mt-8 flex gap-3">
            <Button size="lg" asChild><Link to="/auth">Start for free</Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/dashboard">Open dashboard</Link></Button>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <Icon className="h-8 w-8 text-accent" />
              <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
