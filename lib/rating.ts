/**
 * Computes a freelancer's rating dynamically based on milestone track record:
 * Rating = 5.0 * (Accepted / (Accepted + Rejected))
 *
 * If no milestones have been accepted or rejected yet, returns a default 5.0 (New Talent).
 */
export interface DynamicRating {
  rating: number;
  formatted: string;
  isNew: boolean;
  totalDecided: number;
  acceptanceRatePercent: number;
  label: string;
}

export function computeFreelancerRating(
  acceptedCount: number,
  rejectedCount: number
): DynamicRating {
  const totalDecided = acceptedCount + rejectedCount;
  if (totalDecided === 0) {
    return {
      rating: 5.0,
      formatted: "5.0",
      isNew: true,
      totalDecided: 0,
      acceptanceRatePercent: 100,
      label: "New Talent (Default 5.0)",
    };
  }

  const score = (acceptedCount / totalDecided) * 5.0;
  const rounded = Math.round(score * 10) / 10;
  const percent = Math.round((acceptedCount / totalDecided) * 100);

  return {
    rating: rounded,
    formatted: rounded.toFixed(1),
    isNew: false,
    totalDecided,
    acceptanceRatePercent: percent,
    label: `${percent}% acceptance (${acceptedCount}/${totalDecided} milestones)`,
  };
}

export async function getFreelancerStats(supabase: any, freelancerId: string) {
  // 1. Tasks assigned to freelancer
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, status, reward_amount")
    .eq("assigned_to", freelancerId);

  const taskList = (tasks ?? []) as any[];

  // 2. Submissions by freelancer
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id")
    .eq("freelancer_id", freelancerId);

  const subList = (submissions ?? []) as any[];
  const subIds = subList.map((s) => s.id);

  // 3. Reviews on those submissions
  const { data: reviews } = subIds.length
    ? await supabase
        .from("reviews")
        .select("id, decision")
        .in("submission_id", subIds)
    : { data: [] };

  const revList = (reviews ?? []) as any[];

  // Counts
  const completedTasks = taskList.filter((t) => t.status === "completed");
  const approvedReviews = revList.filter((r) => r.decision === "approve");
  const acceptedCount = Math.max(completedTasks.length, approvedReviews.length);

  const rejectedReviews = revList.filter((r) => r.decision === "reject");
  const rejectedCount = rejectedReviews.length;

  const revisionReviews = revList.filter((r) => r.decision === "revision");
  const currentlyInReviewTasks = taskList.filter((t) =>
    ["submitted", "revision_requested"].includes(t.status)
  );
  const askedForReviewCount =
    revisionReviews.length + currentlyInReviewTasks.length;

  const rating = computeFreelancerRating(acceptedCount, rejectedCount);

  const totalEarned = completedTasks.reduce(
    (sum, t) => sum + Number(t.reward_amount ?? 0),
    0
  );

  return {
    acceptedCount,
    rejectedCount,
    askedForReviewCount,
    totalTasksAssigned: taskList.length,
    totalEarned,
    rating,
  };
}
