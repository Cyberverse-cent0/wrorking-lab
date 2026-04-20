import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiFetch } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";

export default function CreateProject() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "PLANNING",
    visibility: "PUBLIC",
    keywords: "",
    abstract: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if user is admin, if not redirect to projects
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      navigate("/projects");
    }
  }, [user, navigate]);

  // Don't render anything if user is not admin
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Access Restricted</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Only administrators can create projects.
              </p>
              <Button className="mt-4" onClick={() => navigate("/projects")}>
                Back to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const keywords = form.keywords ? form.keywords.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const data = await apiFetch<{ id: string }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ ...form, keywords }),
      });
      navigate(`/projects/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-xl font-serif">Create New Project</CardTitle>
          <CardDescription>Set up a new collaborative research project</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title">Project Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                placeholder="e.g. Neural Pathways in Memory Consolidation"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                data-testid="input-project-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief overview of this research project..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                data-testid="input-project-description"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="abstract">Abstract</Label>
              <Textarea
                id="abstract"
                placeholder="Detailed research abstract..."
                value={form.abstract}
                onChange={(e) => setForm({ ...form, abstract: e.target.value })}
                rows={4}
                data-testid="input-project-abstract"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-project-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="ONGOING">Ongoing</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="SEEKING_COLLABORATORS">Seeking Collaborators</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
                  <SelectTrigger data-testid="select-project-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                    <SelectItem value="INVITE_ONLY">Invite Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="keywords">Keywords <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
              <Input
                id="keywords"
                placeholder="neuroscience, machine-learning, biology"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                data-testid="input-project-keywords"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} data-testid="button-submit-create-project">
                {loading ? "Creating..." : "Create Project"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/projects")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
