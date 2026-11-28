import { AdminItemDetail } from "@/features/admin-item-batches/admin-item-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminItemDetail id={id} />;
}
