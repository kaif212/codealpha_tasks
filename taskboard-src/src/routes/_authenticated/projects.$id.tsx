import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project board — Taskboard" },
      { name: "description", content: "Manage tasks, assignees, deadlines and comments." },
      { property: "og:title", content: "Project board — Taskboard" },
      { property: "og:description", content: "Manage tasks, assignees, deadlines and comments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Board,
});

const COLUMNS = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
] as const;

const PRIORITY: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-destructive text-destructive-foreground",
};

type Task = {
  id: string; title: string; description: string | null; status: string; priority: string;
  assignee_id: string | null; due_date: string | null; project_id: string;
};
type Profile = { id: string; email: string | null; display_name: string | null };

function Board() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [newTitle, setNewTitle] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Task | null>(null);
  const [invite, setInvite] = useState("");

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["members", id, project.data?.owner_id],
    enabled: !!project.data,
    queryFn: async () => {
      const { data: m } = await supabase.from("project_members").select("user_id").eq("project_id", id);
      const ids = [project.data!.owner_id, ...(m ?? []).map((x) => x.user_id)];
      const { data } = await supabase.from("profiles").select("id,email,display_name").in("id", ids);
      return (data ?? []) as Profile[];
    },
  });

  const tasks = useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("project_id", id).order("created_at");
      if (error) throw error;
      return data as Task[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`tasks-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${id}` }, () =>
        qc.invalidateQueries({ queryKey: ["tasks", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks", id] });
  const nameOf = (uid: string | null) => {
    const p = members.data?.find((m) => m.id === uid);
    return p?.display_name || p?.email || "Unassigned";
  };

  const addTask = async (status: string) => {
    const title = (newTitle[status] || "").trim();
    if (!title) return;
    const { error } = await supabase.from("tasks").insert({ project_id: id, title, status });
    if (error) { toast.error(error.message); return; }
    setNewTitle({ ...newTitle, [status]: "" });
    refresh();
  };

  const moveTask = async (taskId: string, status: string) => {
    qc.setQueryData<Task[]>(["tasks", id], (old) => old?.map((t) => (t.id === taskId ? { ...t, status } : t)));
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) { toast.error(error.message); refresh(); }
  };

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", invite.trim().toLowerCase()).maybeSingle();
    if (!prof) { toast.error("No user with that email has signed up yet."); return; }
    const { error } = await supabase.from("project_members").insert({ project_id: id, user_id: prof.id });
    if (error) { toast.error(error.message); return; }
    setInvite("");
    toast.success("Member added");
    qc.invalidateQueries({ queryKey: ["members", id] });
  };

  const deleteProject = async () => {
    if (!confirm("Delete this project and all its tasks?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Project deleted");
    navigate({ to: "/dashboard" });
  };

  if (project.isLoading) return <p className="p-10 text-muted-foreground">Loading…</p>;
  if (project.error || !project.data) return <p className="p-10">Project not found. <Link to="/dashboard" className="underline">Back</Link></p>;
  const isOwner = project.data.owner_id === user?.id;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />All projects
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">{project.data.name}</h1>
          {project.data.description && <p className="mt-1 text-muted-foreground">{project.data.description}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {members.data?.map((m) => (
              <span key={m.id} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{m.display_name || m.email}</span>
            ))}
          </div>
        </div>
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={inviteMember} className="flex gap-2">
              <Input placeholder="Teammate email" type="email" value={invite} onChange={(e) => setInvite(e.target.value)} className="w-52" />
              <Button variant="outline"><UserPlus className="mr-1 h-4 w-4" />Add</Button>
            </form>
            <Button variant="ghost" size="icon" onClick={deleteProject} aria-label="Delete project"><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = (tasks.data ?? []).filter((t) => t.status === col.id);
          return (
            <div key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const tid = e.dataTransfer.getData("text/plain"); if (tid) moveTask(tid, col.id); }}
              className="flex min-h-[300px] flex-col rounded-2xl bg-muted/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display font-bold">{col.label}</h2>
                <span className="rounded-full bg-background px-2 text-xs">{list.length}</span>
              </div>
              <div className="flex-1 space-y-3">
                {list.map((t) => (
                  <button key={t.id} draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                    onClick={() => setSelected(t)}
                    className="block w-full cursor-grab rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:shadow-md active:cursor-grabbing">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{t.title}</p>
                      <Badge className={PRIORITY[t.priority]}>{t.priority}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{nameOf(t.assignee_id)}</span>
                      {t.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.due_date}</span>}
                    </div>
                  </button>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); addTask(col.id); }} className="mt-3 flex gap-2">
                <Input placeholder="Add a task…" value={newTitle[col.id] || ""} onChange={(e) => setNewTitle({ ...newTitle, [col.id]: e.target.value })} className="bg-background" />
                <Button size="icon" aria-label="Add task"><Plus className="h-4 w-4" /></Button>
              </form>
            </div>
          );
        })}
      </div>

      {selected && (
        <TaskDialog task={selected} members={members.data ?? []} onClose={() => setSelected(null)} onSaved={refresh} />
      )}
    </div>
  );
}

function TaskDialog({ task, members, onClose, onSaved }: { task: Task; members: Profile[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [t, setT] = useState(task);
  const [comment, setComment] = useState("");

  const comments = useQuery({
    queryKey: ["comments", task.id],
    queryFn: async () => {
      const { data } = await supabase.from("comments").select("*").eq("task_id", task.id).order("created_at");
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`comments-${task.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `task_id=eq.${task.id}` }, () =>
        qc.invalidateQueries({ queryKey: ["comments", task.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [task.id, qc]);

  const save = async () => {
    const { error } = await supabase.from("tasks").update({
      title: t.title, description: t.description, priority: t.priority, status: t.status,
      assignee_id: t.assignee_id, due_date: t.due_date || null,
    }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task saved"); onSaved(); onClose();
  };

  const remove = async () => {
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task deleted");
    onSaved(); onClose();
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const { error } = await supabase.from("comments").insert({ task_id: t.id, body: comment.trim(), user_id: user!.id });
    if (error) { toast.error(error.message); return; }
    setComment("");
    qc.invalidateQueries({ queryKey: ["comments", task.id] });
  };

  const who = (uid: string) => { const p = members.find((m) => m.id === uid); return p?.display_name || p?.email || "Someone"; };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} />
          <Textarea placeholder="Description" value={t.description ?? ""} onChange={(e) => setT({ ...t, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select value={t.status} onValueChange={(v) => setT({ ...t, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COLUMNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={t.priority} onValueChange={(v) => setT({ ...t, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Select value={t.assignee_id ?? "none"} onValueChange={(v) => setT({ ...t, assignee_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.display_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={t.due_date ?? ""} onChange={(e) => setT({ ...t, due_date: e.target.value })} />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={remove}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
            <Button onClick={save}>Save</Button>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="font-display font-bold">Comments</h3>
            <div className="mt-2 space-y-2">
              {comments.data?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
              {comments.data?.map((c) => (
                <div key={c.id} className="rounded-lg bg-muted p-3 text-sm">
                  <p className="text-xs font-bold">{who(c.user_id)} <span className="font-normal text-muted-foreground">· {new Date(c.created_at).toLocaleString()}</span></p>
                  <p className="mt-1">{c.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={addComment} className="mt-3 flex gap-2">
              <Input placeholder="Write a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <Button>Post</Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
