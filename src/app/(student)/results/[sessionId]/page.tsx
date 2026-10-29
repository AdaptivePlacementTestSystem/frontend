import { ResultView } from "@/features/result/result-view";

export default async function ResultPage({ params }: PageProps<"/results/[sessionId]">) {
  const { sessionId } = await params;
  return <ResultView sessionId={sessionId} />;
}
