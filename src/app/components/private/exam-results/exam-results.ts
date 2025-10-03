import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type GeneratedOption = { value: number | null };
type GeneratedQuestion = { text: string; options: GeneratedOption[]; totalPoints: number };
type GeneratedExam = {
  id: number;
  createdAt: string;
  examName: string | null;
  skillTraining: string | null;
  questionsCount: number | null;
  clinicalCase: string | null;
  totalPoints: number;
  questions: GeneratedQuestion[];
  shareUrl: string;
};

type SavedAnswer = {
  questionIndex: number;
  selectedOptionIndex: number | null;
  points: number;
};

type SavedResponse = {
  examId: number;
  submittedAt: string;
  answers: SavedAnswer[];
  total: number;
};

type ExamCard = {
  exam: GeneratedExam;
  submissions: SavedResponse[];
  stats: {
    max: number;
    avg: number;
    best: number;
    worst: number;
    count: number;
    lastAt?: string;
  };
};

@Component({
  selector: 'app-exam-results',
  standalone: false,
  templateUrl: './exam-results.html',
  styleUrls: ['./exam-results.scss'],
})
export class ExamResults implements OnInit {
  private readonly EXAMS_KEY = 'generatedExams';
  private readonly RESPONSES_KEY = 'examResponses';

  examIdFilter?: number; // definido via query param
  cards: ExamCard[] = [];
  loaded = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((qp) => {
      const idStr = qp.get('examId');
      this.examIdFilter = idStr ? Number(idStr) : undefined;
      this.load();
    });
  }

  private load(): void {
    const exams: GeneratedExam[] = this.safeGet<GeneratedExam[]>(this.EXAMS_KEY, []);
    const responses: SavedResponse[] = this.safeGet<SavedResponse[]>(this.RESPONSES_KEY, []);

    // ordenar por recência
    exams.sort((a, b) => b.id - a.id);
    responses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const map = new Map<number, SavedResponse[]>();
    for (const r of responses) {
      if (this.examIdFilter && r.examId !== this.examIdFilter) continue;
      const list = map.get(r.examId) || [];
      list.push(r);
      map.set(r.examId, list);
    }

    const cards: ExamCard[] = [];
    for (const exam of exams) {
      if (this.examIdFilter && exam.id !== this.examIdFilter) continue;
      const subs = map.get(exam.id) || [];
      if (!subs.length) continue; // só provas finalizadas (com envios)

      const totals = subs.map((s) => s.total);
      const max = Number(exam.totalPoints ?? 0);
      const count = subs.length;
      const best = Math.max(...totals);
      const worst = Math.min(...totals);
      const avg = Math.round((totals.reduce((a, b) => a + b, 0) / count) * 10) / 10;
      const lastAt = subs[0]?.submittedAt;

      cards.push({
        exam,
        submissions: subs,
        stats: { max, avg, best, worst, count, lastAt },
      });
    }

    this.cards = cards;
    this.loaded = true;
  }

  private safeGet<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  percent(total: number, max: number): string {
    if (!max) return '0%';
    const p = Math.round((total / max) * 100);
    return `${isFinite(p) ? p : 0}%`;
  }

  trackByCard = (_: number, c: ExamCard) => c.exam.id;
  trackBySub = (_: number, s: SavedResponse) => `${s.examId}-${s.submittedAt}`;
}
