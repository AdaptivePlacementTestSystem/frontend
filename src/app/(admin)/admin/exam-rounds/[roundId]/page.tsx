import { ExamRoundDetailView } from "@/features/admin-exam-rounds/exam-round-detail-view";

export default async function Page({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  return <ExamRoundDetailView roundId={roundId} />;
}
