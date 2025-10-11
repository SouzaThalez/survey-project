/** Uma opção de pontuação em cada questão */
export interface OptionDTO {
  value: number; // ex.: 0, 0.5, 1
}

/** Questão com enunciado e opções */
export interface QuestionDTO {
  text: string;
  options: OptionDTO[];
}

/** Opcional: restringe o skillTraining a códigos válidos do front */
export type TrainingCode =
  | 'th1' | 'th2' | 'th3' | 'th4' | 'th5' | 'th6' | 'th7' | 'th8'
  | 'TH1' | 'TH2' | 'TH3' | 'TH4' | 'TH5' | 'TH6' | 'TH7' | 'TH8';

/** Payload esperado pelo POST /api/exams no backend */
export interface ExamCreateDTO {
  examName?: string | null;
  examTheme: string;                 // "Tema da prova"
  skillTraining?: TrainingCode | string | null; // aceita THx/thx
  clinicalCase?: string | null;
  examRules?: string | null;
  questions: QuestionDTO[];
  createdById?: number | null;       // opcional
}

/** Payload para POST /api/exam-groups */
export interface ExamGroupCreateDTO {
  title?: string | null;
  exams: ExamCreateDTO[];
}

/* ====================== RESPOSTAS DA API ====================== */

export interface CreatedQuestionDTO {
  text: string;
  totalPoints: number;
  options: OptionDTO[];
}

export interface CreatedExamDTO {
  id: number;
  createdAt: string;
  examName: string | null;
  examTheme: string | null;
  skillTraining: string | null;  // o backend devolve string/nullable
  clinicalCase: string | null;
  examRules: string | null;
  totalPoints: number;
  shareUrl: string;
  groupId: number | null;
  groupSize: number;
  questions: CreatedQuestionDTO[];
}

/** Resposta do POST /api/exams (pode usar o próprio CreatedExamDTO) */
export type CreateExamResponse = CreatedExamDTO;

/** Resposta do POST /api/exam-groups */
export interface CreateGroupResponse {
  groupId: number;
  groupShareUrl: string;
  exams: CreatedExamDTO[];
}
