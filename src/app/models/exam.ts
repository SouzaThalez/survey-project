import { Question } from './question';

export class Exam {
  id: number;
  createdAt: string;              // ISO string
  examName: string | null;        // Nome da prova
  examTopic: string | null;       // Tema da prova (novo)
  skillTraining: string | null;   // th1..th8
  clinicalCase: string | null;
  examRules: string | null;
  totalPoints: number;
  questions: Question[];
  shareUrl: string;

  // Agrupamento (para provas compostas)
  groupId?: number;
  groupSize?: number;

  constructor(e: Exam) {
    this.id = e.id;
    this.createdAt = e.createdAt;
    this.examName = e.examName ?? null;
    this.examTopic = e.examTopic ?? null;
    this.skillTraining = e.skillTraining ?? null;
    this.clinicalCase = e.clinicalCase ?? null;
    this.examRules = e.examRules ?? null;
    this.totalPoints = e.totalPoints ?? 0;
    this.shareUrl = e.shareUrl ?? '';

    this.groupId = e.groupId;
    this.groupSize = e.groupSize;

    this.questions = (e.questions || []).map(q => new Question(q));
  }
}
