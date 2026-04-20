import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search, FolderOpen, Users, Lock, Globe, Calendar, Filter, SortAsc, SortDesc, X, MessageSquare } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CommentRequestModal } from "@/components/CommentRequestModal";

interface Project {
  id: string;
  title: string;
  description?: string;
  abstract?: string;
  status: string;
  visibility: string;
  keywords?: string[];
  tags?: string[];
  memberCount: number;
  taskCount?: number;
  completedTaskCount?: number;
  createdAt: string;
  updatedAt: string;
  owner?: { name: string; institution?: string };
}

export default function Projects() {
  const { user } = useAuth();
  const [location] = useLocation();
  const params = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const initialMine = params.get("myProjects") === "true";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [myProjects, setMyProjects] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [showCommentRequestModal, setShowCommentRequestModal] = useState(false);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (status !== "all") queryParams.set("status", status);
  if (visibility !== "all") queryParams.set("visibility", visibility);
  if (sortBy) queryParams.set("sortBy", sortBy);
  if (sortOrder) queryParams.set("sortOrder", sortOrder);
  if (myProjects) queryParams.set("myProjects", "true");
  if (selectedKeywords.length > 0) queryParams.set("keywords", selectedKeywords.join(","));

  const { data, loading } = useQuery<Project[]>(
    `/api/projects?${queryParams.toString()}`,
    [search, status, visibility, sortBy, sortOrder, myProjects, selectedKeywords]
  );

  // Check if user can create projects (only ADMIN can create)
  const canCreateProject = user && user.role === "ADMIN";
  // Normal users (USER, SCHOLAR, ORGANIZATION roles) can request to add comments
  const canRequestComment = user && ["USER", "SCHOLAR", "ORGANIZATION"].includes(user.role);

  // Extract unique keywords from projects for filtering
  const allKeywords = data ? [...new Set(data.flatMap(p => p.keywords || []))] : [];

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setVisibility("all");
    setSortBy("updatedAt");
    setSortOrder("desc");
    setSelectedKeywords([]);
  };

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) 
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Research Projects</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Discover and manage collaborative research</p>
        </div>
        {canCreateProject && (
          <Link to="/projects/create">
            <Button className="gap-2" data-testid="button-new-project">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          </Link>
        )}
        {canRequestComment && (
          <Button 
            className="gap-2" 
            variant="outline"
            onClick={() => setShowCommentRequestModal(true)}
            data-testid="button-request-comment"
          >
            <MessageSquare className="w-4 h-4" /> Request to Add Comment
          </Button>
        )}
      </div>

      {/* Enhanced Filters */}
      <div className="space-y-4">
        {/* Primary Filters */}
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
              placeholder="Search projects, keywords, or descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-projects"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            {showAdvancedFilters && <X className="w-3 h-3" />}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full" data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="ONGOING">Ongoing</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="SEEKING_COLLABORATORS">Seeking Collaborators</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Visibility</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Visibility</SelectItem>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                    <SelectItem value="INVITE_ONLY">Invite Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updatedAt">Last Updated</SelectItem>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="memberCount">Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Order</Label>
                <Select value={sortOrder} onValueChange={(v: "asc" | "desc") => setSortOrder(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">
                      <div className="flex items-center gap-2">
                        <SortDesc className="w-4 h-4" />
                        Descending
                      </div>
                    </SelectItem>
                    <SelectItem value="asc">
                      <div className="flex items-center gap-2">
                        <SortAsc className="w-4 h-4" />
                        Ascending
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Keywords Filter */}
            {allKeywords.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Keywords</Label>
                <div className="flex flex-wrap gap-2">
                  {allKeywords.map(keyword => (
                    <Badge
                      key={keyword}
                      variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleKeyword(keyword)}
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {data?.length || 0} projects found
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
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
            {search ? "Try adjusting your search filters" : "No projects available yet"}
          </p>
          {canCreateProject && (
            <Link to="/projects/create">
              <Button className="mt-4 gap-2" variant="outline">
                <Plus className="w-4 h-4" /> Create Project
              </Button>
            </Link>
          )}
          {!canCreateProject && (
            <p className="text-sm text-muted-foreground mt-4">
              Only administrators can create projects. Contact your admin to get started.
            </p>
          )}
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
    {/* Comment Request Modal */}
      {user && (
        <CommentRequestModal
          isOpen={showCommentRequestModal}
          onClose={() => setShowCommentRequestModal(false)}
          projects={data || []}
          user={{ name: user.name, email: user.email }}
        />
      )}
    </div>
  );
}
