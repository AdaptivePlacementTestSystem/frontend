import { ReviewView } from "@/features/result/review-view";

export default async function StudentReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ReviewView sessionId={sessionId} />;
}
