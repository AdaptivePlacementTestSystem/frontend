import { BatchDetailView } from "@/features/admin-item-batches/batch-detail";

export default async function Page({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  return <BatchDetailView batchId={batchId} />;
}
