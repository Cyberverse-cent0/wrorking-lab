import { useState } from "react";
import { Plus, Target, Calendar, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, apiFetch } from "@/hooks/useApi";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completedAt?: string;
  status: string;
  createdAt: string;
}

interface Props {
  projectId: string;
  canEdit: boolean;
}

function MilestoneForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", dueDate: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        body: JSON.stringify({ ...form, dueDate: form.dueDate || null }),
      });
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
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Milestone name" />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>Due Date</Label>
        <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Milestone"}</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export function ProjectMilestones({ projectId, canEdit }: Props) {
  const { data, loading, refetch } = useQuery<Milestone[]>(`/api/projects/${projectId}/milestones`);
  const [open, setOpen] = useState(false);

  const toggleComplete = async (milestone: Milestone) => {
    try {
      if (milestone.completedAt) {
        await apiFetch(`/api/projects/${projectId}/milestones/${milestone.id}`, {
          method: "PATCH", body: JSON.stringify({ completedAt: null }),
        });
      } else {
        await apiFetch(`/api/projects/${projectId}/milestones/${milestone.id}/complete`, { method: "POST" });
      }
      refetch();
    } catch (e) {}
  };

  const deleteMilestone = async (id: string) => {
    if (!confirm("Delete milestone?")) return;
    try {
      await apiFetch(`/api/projects/${projectId}/milestones/${id}`, { method: "DELETE" });
      refetch();
    } catch (e) {}
  };

  const milestones = data || [];
  const completed = milestones.filter(m => m.completedAt);
  const upcoming = milestones.filter(m => !m.completedAt);

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{milestones.length} milestone{milestones.length !== 1 ? "s" : ""}</p>
        {canEdit && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) refetch(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Add Milestone</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Milestone</DialogTitle></DialogHeader>
              <MilestoneForm projectId={projectId} onClose={() => { setOpen(false); refetch(); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No milestones yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Upcoming</h4>
              <div className="space-y-2">
                {upcoming.map(m => (
                  <div key={m.id} className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card group">
                    {canEdit && (
                      <button onClick={() => toggleComplete(m)} className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors">
                        <Clock className="w-5 h-5" />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{m.title}</p>
                      {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
                      {m.dueDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                          <Calendar className="w-3 h-3" /> Due {formatDate(m.dueDate)}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <button onClick={() => deleteMilestone(m.id)} className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Completed</h4>
              <div className="space-y-2">
                {completed.map(m => (
                  <div key={m.id} className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card/50 opacity-70 group">
                    {canEdit && (
                      <button onClick={() => toggleComplete(m)} className="mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-through">{m.title}</p>
                      {m.completedAt && (
                        <p className="text-xs text-muted-foreground mt-1">Completed {formatDate(m.completedAt)}</p>
                      )}
                    </div>
                    {canEdit && (
                      <button onClick={() => deleteMilestone(m.id)} className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
