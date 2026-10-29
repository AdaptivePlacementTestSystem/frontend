import { ReviewView } from "@/features/result/review-view";

export default async function ReviewPage({ params }: PageProps<"/results/[sessionId]/review">) {
  const { sessionId } = await params;
  return <ReviewView sessionId={sessionId} />;
}
