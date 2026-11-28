import { ResultView } from "@/features/result/result-view";

export default async function StudentResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ResultView sessionId={sessionId} />;
}
