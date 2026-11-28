import { AssignBatch } from "@/features/admin-item-batches/assign-batch";
export default async function Page({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  return <AssignBatch batchId={batchId} />;
}
