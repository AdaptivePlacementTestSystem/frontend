import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";

export default async function RootRedirectPage() {
  const user = await getSessionUser();
  redirect(user ? homeFor(user.role) : "/login");
}
