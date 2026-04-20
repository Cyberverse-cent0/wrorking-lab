import { useState } from "react";
import { Plus, Flag, User, Calendar, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, apiFetch } from "@/hooks/useApi";
import { getTaskStatusColor, getPriorityColor, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
  assignee?: { id: string; name: string };
}

interface Member {
  id: string;
  user: { id: string; name: string };
}

const COLUMNS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const COLUMN_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

interface Props {
  projectId: string;
  canEdit: boolean;
}

function TaskForm({
  projectId,
  onClose,
  members,
  task,
}: {
  projectId: string;
  onClose: () => void;
  members: Member[];
  task?: Task;
}) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "TODO",
    priority: task?.priority || "MEDIUM",
    dueDate: task?.dueDate ? task.dueDate.split("T")[0] : "",
    assigneeId: task?.assignee?.id || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = { ...form, dueDate: form.dueDate || null, assigneeId: form.assigneeId || null };
      if (task) {
        await apiFetch(`/api/projects/${projectId}/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/api/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(body) });
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Task title" />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLUMNS.map(s => <SelectItem key={s} value={s}>{COLUMN_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Due Date</Label>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Assignee</Label>
          <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {members.map(m => <SelectItem key={m.user.id} value={m.user.id}>{m.user.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : task ? "Update" : "Create Task"}</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export function ProjectTasks({ projectId, canEdit }: Props) {
  const { data, loading, refetch } = useQuery<Task[]>(`/api/projects/${projectId}/tasks`);
  const { data: membersData } = useQuery<Member[]>(`/api/projects/${projectId}/members`);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const members = membersData || [];
  const tasks = data || [];

  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await apiFetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" });
      refetch();
    } catch (e) {}
  };

  const updateStatus = async (taskId: string, status: string) => {
    try {
      await apiFetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      refetch();
    } catch (e) {}
  };

  if (loading) return <div className="grid grid-cols-4 gap-4">{COLUMNS.map(c => <Skeleton key={c} className="h-64" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</h3>
        {canEdit && (
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) refetch(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" data-testid="button-create-task"><Plus className="w-4 h-4" /> Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
              <TaskForm projectId={projectId} onClose={() => { setCreateOpen(false); refetch(); }} members={members} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter(t => t.status === col);
          return (
            <div key={col} className="bg-muted/40 rounded-lg p-3 min-h-40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{COLUMN_LABELS[col]}</span>
                <span className="text-xs bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => (
                  <div key={task.id} className="bg-card border border-border rounded-md p-3 shadow-xs group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-foreground leading-tight flex-1">{task.title}</p>
                      {canEdit && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => setEditTask(task)} className="p-0.5 text-muted-foreground hover:text-foreground">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteTask(task.id)} className="p-0.5 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <span className={`text-xs font-medium ${getPriorityColor(task.priority)} flex items-center gap-0.5`}>
                        <Flag className="w-3 h-3" />{task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />{formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-1 mt-2">
                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-primary">{task.assignee.name.charAt(0)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                      </div>
                    )}
                    {canEdit && col !== "DONE" && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <Select value={task.status} onValueChange={(v) => { updateStatus(task.id, v).then(refetch); }}>
                          <SelectTrigger className="h-6 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMNS.map(s => <SelectItem key={s} value={s} className="text-xs">{COLUMN_LABELS[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTask} onOpenChange={(o) => { if (!o) { setEditTask(null); refetch(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editTask && (
            <TaskForm
              projectId={projectId}
              onClose={() => { setEditTask(null); refetch(); }}
              members={members}
              task={editTask}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
