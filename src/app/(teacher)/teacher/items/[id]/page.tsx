import { ItemDetailView } from "@/features/items/item-detail";

export default async function ItemPage({ params }: PageProps<"/teacher/items/[id]">) {
  const { id } = await params;
  return <ItemDetailView id={id} />;
}
