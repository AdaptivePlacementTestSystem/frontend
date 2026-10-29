import { redirect } from "next/navigation";

// DC-32: không sửa câu hỏi bằng form; GV A sửa trong gói được giao (S34).
export default async function EditItemPage({ params }: PageProps<"/teacher/items/[id]/edit">) {
  const { id } = await params;
  redirect(`/teacher/items/${id}`);
}
