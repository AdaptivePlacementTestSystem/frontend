import type { ExamRoundStatus } from "@apt/shared-types";
import { apiDownload, apiRequest, apiUpload } from "@/lib/api/client";
import type { paths } from "@/lib/api/schema";

export type RoundStatus = `${ExamRoundStatus}`;
export interface ExamRound {
  id: string;
  name: string;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
  status: RoundStatus;
  effectiveStatus: RoundStatus;
  participantCount: number;
}
export type CreateExamRound =
  paths["/api/v1/exam-rounds"]["post"]["requestBody"]["content"]["application/json"];
type ExamRoundWire =
  paths["/api/v1/exam-rounds"]["get"]["responses"][200]["content"]["application/json"];
type CreatedRound =
  paths["/api/v1/exam-rounds"]["post"]["responses"][201]["content"]["application/json"];
function roundStatus(value: string): RoundStatus {
  if (!Object.values<string>(ExamRoundStatus).includes(value))
    throw new Error("Trạng thái kỳ thi không hợp lệ.");
  return value as RoundStatus;
}
export const listExamRounds = async (signal?: AbortSignal): Promise<ExamRound[]> => {
  const rounds = await apiRequest<ExamRoundWire>("/exam-rounds", { signal });
  return rounds.map((round) => ({
    ...round,
    status: roundStatus(round.status),
    effectiveStatus: roundStatus(round.effectiveStatus),
  }));
};
export const createExamRound = (body: CreateExamRound) =>
  apiRequest<CreatedRound>("/exam-rounds", { method: "POST", body });

type RoundDetail =
  paths["/api/v1/exam-rounds/{id}"]["get"]["responses"][200]["content"]["application/json"];
export const getExamRound = (id: string, signal?: AbortSignal) =>
  apiRequest<RoundDetail>(`/exam-rounds/${encodeURIComponent(id)}`, { signal });

type UpdateRound =
  paths["/api/v1/exam-rounds/{id}"]["patch"]["requestBody"]["content"]["application/json"];
type RoundRecord =
  paths["/api/v1/exam-rounds/{id}"]["patch"]["responses"][200]["content"]["application/json"];
type Participants =
  paths["/api/v1/exam-rounds/{id}/participants"]["get"]["responses"][200]["content"]["application/json"];
type ParticipantsQuery = NonNullable<
  paths["/api/v1/exam-rounds/{id}/participants"]["get"]["parameters"]["query"]
>;
type Grid =
  paths["/api/v1/exam-rounds/{roundId}/participants/import/grid"]["get"]["responses"][200]["content"]["application/json"];
type Upload =
  paths["/api/v1/exam-rounds/{roundId}/participants/import/upload"]["post"]["responses"][200]["content"]["application/json"];
type Save =
  paths["/api/v1/exam-rounds/{roundId}/participants/import/save"]["post"]["responses"][200]["content"]["application/json"];

const roundPath = (id: string) => `/exam-rounds/${encodeURIComponent(id)}`;
const importPath = (id: string) => `${roundPath(id)}/participants/import`;
export const updateExamRound = (id: string, body: UpdateRound) =>
  apiRequest<RoundRecord>(roundPath(id), { method: "PATCH", body });
export const publishExamRound = (id: string) =>
  apiRequest<RoundRecord>(`${roundPath(id)}/publish`, { method: "POST" });
export const closeExamRound = (id: string) =>
  apiRequest<RoundRecord>(`${roundPath(id)}/close`, { method: "POST" });
export const listParticipants = (id: string, query: ParticipantsQuery, signal?: AbortSignal) =>
  apiRequest<Participants>(`${roundPath(id)}/participants`, { query, signal });
export const removeParticipant = (id: string, studentId: string) =>
  apiRequest<{ removed: boolean }>(
    `${roundPath(id)}/participants/${encodeURIComponent(studentId)}`,
    { method: "DELETE" },
  );
export const exportParticipants = (
  id: string,
  format: "csv" | "xlsx",
  query: { q?: string; status?: string },
) => apiDownload(`${roundPath(id)}/participants/export`, { query: { ...query, format } });
export const getRosterGrid = (id: string, signal?: AbortSignal) =>
  apiRequest<Grid>(`${importPath(id)}/grid`, { signal });
export const uploadRoster = (id: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<Upload>(`${importPath(id)}/upload`, form);
};
export const removeRosterRow = (id: string, studentId: string) =>
  apiRequest<Grid>(`${importPath(id)}/grid/${encodeURIComponent(studentId)}`, { method: "DELETE" });
export const clearRosterGrid = (id: string) =>
  apiRequest<void>(`${importPath(id)}/grid`, { method: "DELETE" });
export const saveRosterGrid = (id: string, operationId: string) =>
  apiRequest<Save>(`${importPath(id)}/save`, { method: "POST", body: { operationId } });
export const downloadRosterTemplate = (id: string) => apiDownload(`${importPath(id)}/template`);
