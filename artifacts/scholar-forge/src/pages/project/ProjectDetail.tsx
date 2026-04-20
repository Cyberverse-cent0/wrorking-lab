import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Settings, Users, Globe, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { getStatusColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectOverview } from "./tabs/ProjectOverview";
import { ProjectTasks } from "./tabs/ProjectTasks";
import { ProjectMilestones } from "./tabs/ProjectMilestones";
import { ProjectMembers } from "./tabs/ProjectMembers";
import { ProjectFiles } from "./tabs/ProjectFiles";
import { ProjectChat } from "./tabs/ProjectChat";
import { ProjectActivity } from "./tabs/ProjectActivity";
import { ProjectSettings } from "./tabs/ProjectSettings";

interface Project {
  id: string;
  title: string;
  description?: string;
  abstract?: string;
  status: string;
  visibility: string;
  tags?: string[];
  fundingInfo?: string;
  memberCount: number;
  taskCount?: number;
  completedTaskCount?: number;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name: string; institution?: string };
}

interface MemberInfo {
  role: string;
  userId: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: project, loading, refetch } = useQuery<Project & { currentUserRole?: string }>(`/api/projects/${id}`);

  const memberRole = project?.currentUserRole;
  const memberInfo = memberRole ? { role: memberRole } : null;
  const isLead = memberRole === "LEAD" || memberRole === "CO_LEAD";
  const canEdit = isLead || user?.role === "ADMIN";

  if (loading) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found or you don't have access.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="gap-1 flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-serif font-semibold text-foreground">{project.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
            {project.visibility === "PRIVATE" ? (
              <span className="text-xs flex items-center gap-1 text-muted-foreground"><Lock className="w-3 h-3" />Private</span>
            ) : (
              <span className="text-xs flex items-center gap-1 text-muted-foreground"><Globe className="w-3 h-3" />Public</span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {((project as any).keywords as string[] | undefined)?.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> {project.memberCount} members
            </span>
            {memberInfo?.role && (
              <span className="text-xs text-muted-foreground">
                You: <span className="font-medium text-foreground">{memberInfo.role}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          {canEdit && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ProjectOverview project={project} memberInfo={memberInfo} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <ProjectTasks projectId={id!} canEdit={!!memberInfo?.role && memberInfo.role !== "VIEWER"} />
        </TabsContent>
        <TabsContent value="milestones" className="mt-4">
          <ProjectMilestones projectId={id!} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <ProjectMembers projectId={id!} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="files" className="mt-4">
          <ProjectFiles projectId={id!} canEdit={!!memberInfo?.role && memberInfo.role !== "VIEWER"} />
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          <ProjectChat projectId={id!} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ProjectActivity projectId={id!} />
        </TabsContent>
        {canEdit && (
          <TabsContent value="settings" className="mt-4">
            <ProjectSettings project={project} onUpdate={refetch} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
