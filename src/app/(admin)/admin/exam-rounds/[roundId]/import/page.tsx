import { RosterImportView } from "@/features/admin-exam-rounds/roster-import-view";

export default async function Page({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  return <RosterImportView roundId={roundId} />;
}
