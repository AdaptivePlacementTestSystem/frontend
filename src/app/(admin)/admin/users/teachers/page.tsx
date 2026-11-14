import { AccountsView } from "@/features/admin-users/accounts-view";
import { requireUser } from "@/lib/auth/session";

export default async function TeacherAccountsPage() {
  const user = await requireUser("admin");
  return <AccountsView key="TEACHER" kind="TEACHER" currentUserId={user.id} />;
}
