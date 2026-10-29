import { ExamRunner } from "@/features/exam/exam-runner";

export default async function ExamPage({ params }: PageProps<"/exam/[sessionId]">) {
  const { sessionId } = await params;
  return <ExamRunner sessionId={sessionId} />;
}
