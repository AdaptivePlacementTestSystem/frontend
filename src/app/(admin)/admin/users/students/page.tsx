import { AccountsView } from "@/features/admin-users/accounts-view";
import { requireUser } from "@/lib/auth/session";

export default async function StudentAccountsPage() {
  const user = await requireUser("admin");
  return <AccountsView key="STUDENT" kind="STUDENT" currentUserId={user.id} />;
}
