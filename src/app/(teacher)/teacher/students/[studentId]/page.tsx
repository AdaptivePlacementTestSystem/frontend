import { StudentProfileView } from "@/features/reports/student-profile-view";

interface PageProps {
  params: Promise<{ studentId: string }> | { studentId: string };
}

export default async function StudentDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <StudentProfileView studentId={resolvedParams.studentId} />;
}
