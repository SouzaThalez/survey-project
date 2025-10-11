import { Answer } from './answer';
import { Submitter } from './submitter';

export class Submission {
  examId: number;
  submittedAt: string;      // ISO
  answers: Answer[];
  total: number;

  // compat com envios em grupo
  groupId?: number;

  // quem enviou (se autenticado)
  submittedBy?: Submitter;

  constructor(s: Submission) {
    this.examId = s.examId;
    this.submittedAt = s.submittedAt;
    this.total = s.total ?? 0;

    this.groupId = s.groupId;
    this.submittedBy = s.submittedBy ? new Submitter(s.submittedBy) : undefined;

    this.answers = (s.answers || []).map(a => new Answer(a));
  }
}
