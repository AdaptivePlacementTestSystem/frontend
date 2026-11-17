import { ImportAccountsView } from "@/features/admin-import/import-accounts-view";

export default async function ImportAccountsPage({
  searchParams,
}: PageProps<"/admin/users/import">) {
  const kind = (await searchParams).kind;
  // `?kind=STUDENT|TEACHER` chọn sẵn loại theo tab đã bấm Import; mặc định sinh viên
  return <ImportAccountsView initialKind={kind === "TEACHER" ? "TEACHER" : "STUDENT"} />;
}
