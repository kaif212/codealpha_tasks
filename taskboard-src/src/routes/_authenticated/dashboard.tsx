import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Taskboard" },
      { name: "description", content: "All your projects in one place." },
      { property: "og:title", content: "Dashboard — Taskboard" },
      { property: "og:description", content: "All your projects in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*, tasks(status)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("projects").insert({ name, description: desc, owner_id: user!.id });
    if (error) { toast.error(error.message); return; }
    setName(""); setDesc(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["projects"] });
    toast.success("Project created");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Your projects</h1>
          <p className="text-muted-foreground">Pick a board or start a new one.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New project</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <Input placeholder="Project name" required value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <Button className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="mt-10 rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
          No projects yet — create your first one.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const taskList = Array.isArray(p.tasks) ? p.tasks : [];
            const total = taskList.length;
            const done = taskList.filter((t) => t.status === "done").length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Link key={p.id} to="/projects/$id" params={{ id: p.id }}
                className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <h2 className="font-display text-xl font-bold group-hover:underline">{p.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description || "No description"}</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{done}/{total} tasks done · {p.owner_id === user?.id ? "Owner" : "Member"}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
