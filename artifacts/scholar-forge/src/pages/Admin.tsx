import { useState } from "react";
import { Users, FolderOpen, Activity, Shield, Trash2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, apiFetch } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["hsl(222,83%,54%)", "hsl(160,60%,45%)", "hsl(30,80%,55%)", "hsl(280,65%,60%)"];

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  institution?: string;
  createdAt: string;
  projectCount?: number;
}

interface ProjectRecord {
  id: string;
  title: string;
  status: string;
  visibility: string;
  memberCount: number;
  createdAt: string;
  owner?: { name: string };
}

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
  activeProjects: number;
  projectsByStatus: { status: string; count: number }[];
  projectsByMonth: { month: string; count: number }[];
  usersByInstitution: { institution: string; count: number }[];
}

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-1">You need admin privileges to access this page.</p>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  const { data: stats, loading: statsLoading } = useQuery<AdminStats>("/api/analytics/admin");
  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useQuery<{ users: UserRecord[] }>("/api/admin/users");
  const { data: projectsData, loading: projectsLoading, refetch: refetchProjects } = useQuery<{ projects: ProjectRecord[] }>("/api/admin/projects");

  const changeUserRole = async (userId: string, role: string) => {
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) });
      refetchUsers();
    } catch (e) {}
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user and all their data?")) return;
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      refetchUsers();
    } catch (e) {}
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm("Delete this project and all its data?")) return;
    try {
      await apiFetch(`/api/admin/projects/${projectId}`, { method: "DELETE" });
      refetchProjects();
    } catch (e) {}
  };

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users },
    { label: "Total Projects", value: stats?.totalProjects ?? 0, icon: FolderOpen },
    { label: "Active Projects", value: stats?.activeProjects ?? 0, icon: Activity },
    { label: "Total Tasks", value: stats?.totalTasks ?? 0, icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Platform management and analytics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {statsLoading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                  )}
                </div>
                <Icon className="w-8 h-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {stats?.projectsByStatus && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Projects by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.projectsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label>
                    {stats.projectsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {stats?.projectsByMonth && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Projects Created</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.projectsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(222,83%,54%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">All Users</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : (
                <div className="space-y-2">
                  {usersData?.users?.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 border border-border rounded-lg group">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">{u.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email} {u.institution && `· ${u.institution}`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.id !== user?.id ? (
                          <Select value={u.role} onValueChange={(v) => changeUserRole(u.id, v)}>
                            <SelectTrigger className="h-7 text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RESEARCHER">Researcher</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(u.createdAt)}</span>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">All Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : (
                <div className="space-y-2">
                  {projectsData?.projects?.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 border border-border rounded-lg group">
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/projects/${p.id}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {p.title}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {p.owner?.name && `${p.owner.name} · `}
                          {p.memberCount} members · {formatDate(p.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(p.status)}`}>{p.status}</span>
                        <button
                          onClick={() => deleteProject(p.id)}
                          className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
