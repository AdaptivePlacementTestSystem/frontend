import { ExamIntro } from "@/features/exam/exam-intro";

export default async function ExamIntroPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  return <ExamIntro roundId={roundId} />;
}
