import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, User } from "lucide-react";

interface Props {
  project: {
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
  };
  memberInfo?: { role: string } | null;
}

export function ProjectOverview({ project }: Props) {
  const progress = project.taskCount && project.taskCount > 0
    ? Math.round(((project.completedTaskCount ?? 0) / project.taskCount) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-4">
        {project.abstract && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Abstract</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{project.abstract}</p>
            </CardContent>
          </Card>
        )}

        {!project.abstract && project.description && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Task Progress */}
        {project.taskCount !== undefined && project.taskCount > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Task Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{project.completedTaskCount ?? 0} of {project.taskCount} completed</span>
                <span className="text-xs font-medium text-foreground">{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.owner && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead Researcher</p>
                  <p className="text-sm font-medium text-foreground">{project.owner.name}</p>
                  {project.owner.institution && (
                    <p className="text-xs text-muted-foreground">{project.owner.institution}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm text-foreground">{formatDate(project.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm text-foreground">{formatDate(project.updatedAt)}</p>
              </div>
            </div>

            {project.fundingInfo && (
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Funding</p>
                  <p className="text-sm text-foreground">{project.fundingInfo}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
