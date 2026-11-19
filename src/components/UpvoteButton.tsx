import React from "react";
import { ThumbsUp, Check, Flame } from "lucide-react";
import { useUpvotes } from "@/lib/upvotes";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UpvoteButtonProps {
  complaintId: string;
  complaintCode?: string;
  size?: "xs" | "sm" | "default";
  className?: string;
  variant?: "button" | "pill" | "badge";
}

export function UpvoteButton({
  complaintId,
  complaintCode,
  size = "sm",
  className,
  variant = "button",
}: UpvoteButtonProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { count, hasVoted, toggle, isCommunityVerified } = useUpvotes(
    complaintId,
    complaintCode,
    user?.id,
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const res = toggle();
    if (res.upvoted) {
      toast.success(
        res.count >= 5
          ? `+1 Verified! Complaint reached 5 confirmations (High Priority).`
          : `+1 Issue confirmed! (${res.count} total)`,
      );
    } else {
      toast.info("Confirmation removed.");
    }
  };

  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
          isCommunityVerified
            ? "bg-destructive/15 text-destructive border border-destructive/30"
            : hasVoted
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground border border-border",
          className,
        )}
      >
        {isCommunityVerified ? (
          <Flame className="h-3 w-3 text-destructive" />
        ) : (
          <ThumbsUp className="h-3 w-3" />
        )}
        <span>{count}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={hasVoted ? t("confirmed_issue") : t("confirm_issue")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer shadow-2xs select-none",
        size === "xs" && "px-2 py-1 text-[11px]",
        size === "sm" && "px-2.5 py-1.5 text-xs",
        size === "default" && "px-3.5 py-2 text-sm",
        hasVoted
          ? "bg-primary text-primary-foreground border border-primary hover:bg-primary/90"
          : "bg-card text-foreground border border-border/90 hover:bg-muted/70 hover:border-primary/50",
        isCommunityVerified &&
          !hasVoted &&
          "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10",
        className,
      )}
    >
      {hasVoted ? (
        <Check className="h-3.5 w-3.5 text-primary-foreground stroke-[2.5]" />
      ) : (
        <ThumbsUp className="h-3.5 w-3.5 text-primary" />
      )}
      <span>{hasVoted ? t("confirmed_issue") : t("confirm_issue")}</span>
      <span
        className={cn(
          "ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
          hasVoted
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
