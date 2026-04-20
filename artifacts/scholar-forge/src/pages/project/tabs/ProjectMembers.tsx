import { useState } from "react";
import { UserPlus, Shield, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, apiFetch } from "@/hooks/useApi";
import { getRoleColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string; institution?: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface Props {
  projectId: string;
  canEdit: boolean;
}

function InviteForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CONTRIBUTOR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
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
        <Label>Email Address</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="colleague@university.edu" />
      </div>
      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="CO_LEAD">Co-Lead</SelectItem>
            <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send Invitation"}</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export function ProjectMembers({ projectId, canEdit }: Props) {
  const { data, loading, refetch } = useQuery<Member[]>(`/api/projects/${projectId}/members`);
  const { data: invData, refetch: refetchInv } = useQuery<Invitation[]>(`/api/projects/${projectId}/invitations`);
  const [inviteOpen, setInviteOpen] = useState(false);

  const members = data || [];
  const invitations = invData?.filter(i => i.status === "PENDING") || [];

  const removeMember = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      await apiFetch(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
      refetch();
    } catch (e) {}
  };

  const changeRole = async (memberId: string, role: string) => {
    try {
      await apiFetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH", body: JSON.stringify({ role }),
      });
      refetch();
    } catch (e) {}
  };

  const cancelInvite = async (invId: string) => {
    try {
      await apiFetch(`/api/projects/${projectId}/invitations/${invId}`, { method: "DELETE" });
      refetchInv();
    } catch (e) {}
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        {canEdit && (
          <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) { refetch(); refetchInv(); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><UserPlus className="w-4 h-4" /> Invite</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
              <InviteForm projectId={projectId} onClose={() => { setInviteOpen(false); refetch(); refetchInv(); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="invitations">Pending Invites ({invitations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-3 space-y-2">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card group">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">{member.user.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{member.user.name}</p>
                <p className="text-xs text-muted-foreground">{member.user.email}</p>
                {member.user.institution && (
                  <p className="text-xs text-muted-foreground">{member.user.institution}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && member.role !== "LEAD" ? (
                  <Select value={member.role} onValueChange={(v) => changeRole(member.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CO_LEAD">Co-Lead</SelectItem>
                      <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(member.role)}`}>
                    {member.role === "CO_LEAD" ? "Co-Lead" : member.role}
                  </span>
                )}
                {canEdit && member.role !== "LEAD" && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="invitations" className="mt-3 space-y-2">
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No pending invitations</p>
          ) : (
            invitations.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card group">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited as {inv.role} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => cancelInvite(inv.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
