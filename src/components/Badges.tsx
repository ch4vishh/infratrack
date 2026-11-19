import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { priorityLabel, statusLabel } from "@/lib/infratrack";
import { useLanguage } from "@/lib/i18n";

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  assigned: "bg-info/10 text-info border-info/30",
  in_progress: "bg-warning/15 text-warning-foreground border-warning/40 font-medium",
  resolved: "bg-success/15 text-success border-success/30 font-medium",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const priorityStyles: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-info/10 text-info border-info/30",
  high: "bg-destructive/15 text-destructive border-destructive/30 font-semibold",
};

function Pill({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

export const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useLanguage();
  const label = t(`status_${status}`, statusLabel(status));
  return <Pill className={statusStyles[status] ?? statusStyles["pending"]}>{label}</Pill>;
};

export const PriorityBadge = ({
  priority,
  upvotes = 0,
}: {
  priority: string;
  upvotes?: number;
}) => {
  const { t } = useLanguage();

  if (upvotes >= 5) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/15 px-2.5 py-0.5 text-xs font-bold text-destructive whitespace-nowrap shadow-2xs">
        <Flame className="h-3 w-3 text-destructive animate-pulse" />
        {t("prio_community_verified", "High Priority (Community Verified)")}
      </span>
    );
  }

  const label = t(`prio_${priority}`, priorityLabel(priority));
  return <Pill className={priorityStyles[priority] ?? priorityStyles["low"]}>{label}</Pill>;
};
