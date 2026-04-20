import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search, FolderOpen, Users, Lock, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  visibility: string;
  tags?: string[];
  memberCount: number;
  taskCount?: number;
  completedTaskCount?: number;
  createdAt: string;
  updatedAt: string;
  owner?: { name: string; institution?: string };
}

export default function Projects() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const initialMine = params.get("myProjects") === "true";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [myProjects, setMyProjects] = useState(initialMine);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (status !== "all") queryParams.set("status", status);
  if (myProjects) queryParams.set("myProjects", "true");

  const { data, loading } = useQuery<Project[]>(
    `/api/projects?${queryParams.toString()}`,
    [search, status, myProjects]
  );

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Research Projects</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Discover and manage collaborative research</p>
        </div>
        <Link to="/projects/create">
          <Button className="gap-2" data-testid="button-new-project">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Tabs value={myProjects ? "mine" : "all"} onValueChange={(v) => setMyProjects(v === "mine")}>
          <TabsList>
            <TabsTrigger value="all">All Projects</TabsTrigger>
            <TabsTrigger value="mine">My Projects</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PLANNING">Planning</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium text-foreground">No projects found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Try adjusting your search filters" : "Be the first to create a project"}
          </p>
          <Link to="/projects/create">
            <Button className="mt-4 gap-2" variant="outline">
              <Plus className="w-4 h-4" /> Create Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group h-full">
                <CardContent className="pt-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <div className="flex-shrink-0">
                      {project.visibility === "PRIVATE" ? (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                      {project.description}
                    </p>
                  )}

                  {(project as any).keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {((project as any).keywords as string[]).slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {project.memberCount}
                      </span>
                      {project.taskCount !== undefined && (
                        <span className="flex items-center gap-1">
                          Tasks: {project.completedTaskCount ?? 0}/{project.taskCount}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
