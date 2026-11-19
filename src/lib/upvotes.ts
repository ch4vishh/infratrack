import { useEffect, useState } from "react";

// Initial seed upvote counts for key demo complaints to show community verification
const SEED_COUNTS: Record<string, number> = {
  "INF-10001": 7,
  "INF-10002": 5,
  "INF-10003": 6,
  "INF-10004": 3,
  "INF-10005": 4,
  "INF-10006": 2,
};

function getStorageKey(complaintId: string) {
  return `infratrack_upvotes_${complaintId}`;
}

function getUserVoteKey(complaintId: string, userId?: string | null) {
  const identifier = userId || "guest_device";
  return `infratrack_voted_${complaintId}_${identifier}`;
}

/**
 * Returns the current upvote count for a complaint.
 */
export function getUpvotesCount(complaintId: string, complaintCode?: string): number {
  try {
    const stored = localStorage.getItem(getStorageKey(complaintId));
    if (stored !== null) {
      return parseInt(stored, 10) || 0;
    }
  } catch {
    // ignore
  }

  // Fallback to seed count for demo data
  if (complaintCode && SEED_COUNTS[complaintCode] !== undefined) {
    return SEED_COUNTS[complaintCode];
  }
  if (SEED_COUNTS[complaintId] !== undefined) {
    return SEED_COUNTS[complaintId];
  }
  return 0;
}

/**
 * Checks if the user or device has already confirmed / upvoted this complaint.
 */
export function hasUserUpvoted(complaintId: string, userId?: string | null): boolean {
  try {
    return localStorage.getItem(getUserVoteKey(complaintId, userId)) === "true";
  } catch {
    return false;
  }
}

/**
 * Toggles an upvote on a complaint.
 */
export function toggleUpvote(
  complaintId: string,
  complaintCode?: string,
  userId?: string | null,
): { upvoted: boolean; count: number } {
  const currentCount = getUpvotesCount(complaintId, complaintCode);
  const alreadyVoted = hasUserUpvoted(complaintId, userId);

  const newVoted = !alreadyVoted;
  const newCount = Math.max(0, currentCount + (newVoted ? 1 : -1));

  try {
    localStorage.setItem(getStorageKey(complaintId), newCount.toString());
    if (newVoted) {
      localStorage.setItem(getUserVoteKey(complaintId, userId), "true");
    } else {
      localStorage.removeItem(getUserVoteKey(complaintId, userId));
    }
  } catch {
    // ignore
  }

  // Dispatch custom event so all reactive components update
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("infratrack-upvote-change", {
        detail: { complaintId, count: newCount, upvoted: newVoted },
      }),
    );
  }

  return { upvoted: newVoted, count: newCount };
}

/**
 * React hook to reactively read and toggle upvotes on any component.
 */
export function useUpvotes(complaintId: string, complaintCode?: string, userId?: string | null) {
  const [count, setCount] = useState<number>(() => getUpvotesCount(complaintId, complaintCode));
  const [hasVoted, setHasVoted] = useState<boolean>(() => hasUserUpvoted(complaintId, userId));

  useEffect(() => {
    setCount(getUpvotesCount(complaintId, complaintCode));
    setHasVoted(hasUserUpvoted(complaintId, userId));

    const handleEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.complaintId === complaintId) {
        setCount(detail.count);
        setHasVoted(detail.upvoted);
      }
    };

    window.addEventListener("infratrack-upvote-change", handleEvent);
    return () => window.removeEventListener("infratrack-upvote-change", handleEvent);
  }, [complaintId, complaintCode, userId]);

  const toggle = () => {
    const res = toggleUpvote(complaintId, complaintCode, userId);
    setCount(res.count);
    setHasVoted(res.upvoted);
    return res;
  };

  return {
    count,
    hasVoted,
    toggle,
    isCommunityVerified: count >= 5,
  };
}
