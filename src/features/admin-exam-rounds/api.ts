import type { ExamRoundStatus } from "@apt/shared-types";
import { apiRequest } from "@/lib/api/client";

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
export interface CreateExamRound {
  name: string;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
}
export const listExamRounds = (signal?: AbortSignal) =>
  apiRequest<ExamRound[]>("/exam-rounds", { signal });
export const createExamRound = (body: CreateExamRound) =>
  apiRequest<{ id: string }>("/exam-rounds", { method: "POST", body });
