import { Link } from "wouter";
import { FolderOpen, Users, CheckSquare, Target, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelative, getStatusColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalMembers: number;
  totalTasks: number;
  completedTasks: number;
  upcomingMilestones: number;
}

interface Project {
  id: string;
  title: string;
  status: string;
  memberCount: number;
  taskCount?: number;
  updatedAt: string;
}

interface Activity {
  id: string;
  action: string;
  entityType: string;
  description?: string;
  createdAt: string;
  user: { name: string };
  project?: { title: string; id: string };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, loading: statsLoading } = useQuery<DashboardStats>("/api/analytics/overview");
  const { data: projects, loading: projectsLoading } = useQuery<Project[]>("/api/projects?myProjects=true&limit=5");
  const { data: activityRaw, loading: activityLoading } = useQuery<any>("/api/analytics/dashboard");

  const statItems = [
    { label: "Active Projects", value: stats?.activeProjects ?? 0, icon: FolderOpen, color: "text-blue-600 dark:text-blue-400" },
    { label: "Total Collaborators", value: stats?.totalMembers ?? 0, icon: Users, color: "text-green-600 dark:text-green-400" },
    { label: "Tasks Completed", value: stats?.completedTasks ?? 0, suffix: `/ ${stats?.totalTasks ?? 0}`, icon: CheckSquare, color: "text-purple-600 dark:text-purple-400" },
    { label: "Upcoming Milestones", value: stats?.upcomingMilestones ?? 0, icon: Target, color: "text-orange-600 dark:text-orange-400" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-semibold text-foreground">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Here's an overview of your research workspace
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    {statsLoading ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                        {stat.suffix && <span className="text-sm text-muted-foreground">{stat.suffix}</span>}
                      </>
                    )}
                  </div>
                </div>
                <div className={`p-2 bg-current/10 rounded-lg ${stat.color}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card className="border-border">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
            <Link to="/projects?myProjects=true">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {projectsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : !projects?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No projects yet.{" "}
                <Link to="/projects/create">
                  <span className="text-primary hover:underline cursor-pointer">Create one</span>
                </Link>
              </div>
            ) : (
              projects?.map((project) => (
                <Link key={project.id} to={`/projects/${project.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {project.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />{project.memberCount}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {formatRelative(project.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : !activityRaw?.recentActivity?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No recent activity
              </div>
            ) : (
              activityRaw?.recentActivity?.map((act: any) => (
                <div key={act.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">
                      {(act.user?.name || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">
                      <span className="font-medium">{act.user?.name}</span>{" "}
                      {act.details || act.action}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(act.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
