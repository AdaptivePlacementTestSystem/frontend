import { redirect } from "next/navigation";

// DC-32: không tạo câu hỏi bằng form; câu vào hệ thống qua lô (AI sinh / import file).
export default function NewItemPage() {
  redirect("/teacher/items");
}
