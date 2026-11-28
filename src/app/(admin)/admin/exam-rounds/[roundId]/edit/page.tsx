import { EditExamRoundView } from "@/features/admin-exam-rounds/edit-exam-round-view";

export default async function Page({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  return <EditExamRoundView roundId={roundId} />;
}
