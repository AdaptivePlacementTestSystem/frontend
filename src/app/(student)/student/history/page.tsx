import { requireUser } from "@/lib/auth/session";
import { HistoryView } from "@/features/history/history-view";

export default async function StudentHistoryPage() {
  const user = await requireUser("student");
  return <HistoryView studentCode={user.studentCode} />;
}
