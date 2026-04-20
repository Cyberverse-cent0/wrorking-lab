import { formatRelative } from "@/lib/utils";
import { useQuery } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

interface Activity {
  id: string;
  action: string;
  entityType: string;
  description?: string;
  createdAt: string;
  user: { name: string };
}

interface Props {
  projectId: string;
}

export function ProjectActivity({ projectId }: Props) {
  const { data, loading } = useQuery<Activity[]>(`/api/projects/${projectId}/activity`);
  const activities = data || [];

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((act, i) => (
        <div key={act.id} className="flex gap-4 py-3">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">{act.user.name.charAt(0)}</span>
            </div>
            {i < activities.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
          </div>
          <div className="flex-1 pb-3">
            <p className="text-sm text-foreground">
              <span className="font-medium">{act.user?.name}</span>{" "}
              {(act as any).details || act.action}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(act.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
