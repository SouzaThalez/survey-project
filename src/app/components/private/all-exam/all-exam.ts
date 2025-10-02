import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

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

@Component({
  selector: 'app-all-exam',
  standalone: false,
  templateUrl: './all-exam.html',
  styleUrls: ['./all-exam.scss']
})
export class AllExam implements OnInit {
  private readonly STORAGE_KEY = 'generatedExams';

  exams: GeneratedExam[] = [];

  // UI state
  search = '';
  trainingFilter: 'all' | 'th1' | 'th2' | 'th3' = 'all';
  sortBy: 'newest' | 'oldest' | 'name' = 'newest';

  constructor(private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.exams = raw ? JSON.parse(raw) : [];
    } catch {
      this.exams = [];
    }
    this.sortList();
  }

  private persist(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.exams));
    } catch {}
  }

  get filtered(): GeneratedExam[] {
    let out = [...this.exams];

    // filter training
    if (this.trainingFilter !== 'all') {
      out = out.filter(e => e.skillTraining === this.trainingFilter);
    }

    // search (name + case + question text)
    const q = this.search.trim().toLowerCase();
    if (q) {
      out = out.filter(e => {
        const inName = (e.examName || '').toLowerCase().includes(q);
        const inCase = (e.clinicalCase || '').toLowerCase().includes(q);
        const inQuestions = (e.questions || []).some(qq => (qq.text || '').toLowerCase().includes(q));
        return inName || inCase || inQuestions;
      });
    }

    // sort
    switch (this.sortBy) {
      case 'oldest':
        out.sort((a, b) => a.id - b.id);
        break;
      case 'name':
        out.sort((a, b) => (a.examName || '').localeCompare(b.examName || ''));
        break;
      default:
        out.sort((a, b) => b.id - a.id); // newest
    }

    return out;
  }

  clearAll(): void {
    this.exams = [];
    this.persist();
    this.snack.open('Todas as provas foram removidas.', 'Ok', { duration: 2000 });
  }

  deleteOne(id: number): void {
    this.exams = this.exams.filter(e => e.id !== id);
    this.persist();
    this.snack.open('Prova removida.', 'Ok', { duration: 1500 });
  }

  trainingLabel(code: string | null): string {
    const map: Record<string, string> = {
      th1: 'Treinamento - 1 (TH 1)',
      th2: 'Treinamento - 2 (TH 2)',
      th3: 'Treinamento - 3 (TH 3)',
    };
    return code ? (map[code] || code) : '—';
  }

  makeShareUrl(e: GeneratedExam): string {
    // fallback in case older entries have no shareUrl
    return e.shareUrl || `${window.location.origin}/private/responder-prova?examId=${e.id}`;
  }

  copyLink(e: GeneratedExam): void {
    const url = this.makeShareUrl(e);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => this.snack.open('Link copiado!', 'Ok', { duration: 1500 }),
        () => this.snack.open(url, 'Ok', { duration: 3000 })
      );
    } else {
      this.snack.open(url, 'Ok', { duration: 3000 });
    }
  }

  optionHeaders(e: GeneratedExam): string[] {
    const first = e.questions?.[0];
    if (!first || !first.options?.length) return [];
    return first.options.map(o => {
      const v = Number(o.value ?? 0);
      return `${v} ponto${v === 1 ? '' : 's'}`;
    });
  }

  private sortList(): void {
    switch (this.sortBy) {
      case 'oldest':
        this.exams.sort((a, b) => a.id - b.id);
        break;
      case 'name':
        this.exams.sort((a, b) => (a.examName || '').localeCompare(b.examName || ''));
        break;
      default:
        this.exams.sort((a, b) => b.id - a.id);
    }
  }
}
