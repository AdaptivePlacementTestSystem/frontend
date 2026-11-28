import { Suspense } from "react";
import { TakeExamContainer } from "@/features/exam/take-exam-container";
import { LoadingBlock } from "@/components/layout/states";

export default async function StudentTakeExamPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;

  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <TakeExamContainer roundId={roundId} />
    </Suspense>
  );
}
