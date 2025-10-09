import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

type GeneratedOption   = { value: number | null };
type GeneratedQuestion = { text: string; options: GeneratedOption[]; totalPoints: number };

// formato salvo (pode ter questions ou items, e agora groupId/groupSize)
type StoredExam = {
  id: number;
  createdAt: string;
  examName: string | null;
  examTheme?: string | null;                    // <<< NOVO
  skillTraining: string | null;
  clinicalCase: string | null;
  examRules: string | null;
  totalPoints: number;
  shareUrl: string;

  // compat: pode vir "questions" ou "items"
  questions?: GeneratedQuestion[];
  items?: { text: string; options: GeneratedOption[]; totalPoints: number }[];

  // agrupamento (novos)
  groupId?: number;
  groupSize?: number;

  itemsCount?: number | null;
  questionsCount?: number | null;
};

// modelo de card (um por grupo)
type CardExam = {
  id: number;                       // id do representante (usado para remover)
  createdAt: string;
  examName: string | null;
  examTheme: string | null;         // <<< NOVO
  skillTraining: string | null;
  clinicalCase: string | null;
  examRules: string | null;
  totalPoints: number;
  questions: GeneratedQuestion[];
  shareUrl: string;

  _groupId: number;
  _groupCount: number;
  _ids: number[]; // ids de todos os exams do grupo
};

@Component({
  selector: 'app-all-exam',
  standalone: false,
  templateUrl: './all-exam.html',
  styleUrls: ['./all-exam.scss']
})
export class AllExam implements OnInit {
  private readonly STORAGE_KEY = 'generatedExams';

  // agora "exams" são cards (um por grupo)
  exams: CardExam[] = [];

  // UI state
  search = '';
  trainingFilter: 'all' | 'th1' | 'th2' | 'th3' | 'th4' | 'th5' | 'th6' | 'th7' | 'th8' = 'all';
  sortBy: 'newest' | 'oldest' | 'name' = 'newest';

  constructor(private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  private toQuestions(e: StoredExam): GeneratedQuestion[] {
    if (e.questions && e.questions.length) return e.questions;
    if (e.items && e.items.length) {
      return e.items.map(it => ({ text: it.text, options: it.options || [], totalPoints: it.totalPoints || 0 }));
    }
    return [];
  }

  private load(): void {
    let arr: StoredExam[] = [];
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      arr = raw ? JSON.parse(raw) as StoredExam[] : [];
    } catch {
      arr = [];
    }

    // agrupa por groupId (fallback: id)
    const groups = new Map<number, StoredExam[]>();
    for (const e of arr) {
      const gid = e.groupId ?? e.id;
      if (!groups.has(gid)) groups.set(gid, []);
      groups.get(gid)!.push(e);
    }

    // ordena interno por id (estável)
    for (const [gid, list] of groups) {
      list.sort((a, b) => a.id - b.id);
      groups.set(gid, list);
    }

    // monta cards (um por grupo)
    const cards: CardExam[] = [];
    for (const [gid, list] of groups) {
      const rep = list[0];
      const groupCount = list.length;
      const repQuestions = this.toQuestions(rep);

      const shareUrl =
        groupCount > 1
          ? `${window.location.origin}/private/responder-prova?groupId=${gid}`
          : (rep.shareUrl || `${window.location.origin}/private/responder-prova?examId=${rep.id}`);

      const card: CardExam = {
        id: rep.id,
        createdAt: rep.createdAt,
        examName: rep.examName,
        examTheme: rep.examTheme ?? null,  // <<< NOVO
        skillTraining: rep.skillTraining,
        clinicalCase: rep.clinicalCase,
        examRules: rep.examRules,
        totalPoints: rep.totalPoints,
        questions: repQuestions,
        shareUrl,

        _groupId: gid,
        _groupCount: groupCount,
        _ids: list.map(x => x.id)
      };

      cards.push(card);
    }

    this.exams = cards;
    this.sortList();
  }

  private persistCardsToStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const flat: StoredExam[] = raw ? JSON.parse(raw) : [];
      const keepIds = new Set<number>(this.exams.flatMap(c => c._ids));
      const next = flat.filter(e => keepIds.has(e.id));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  get filtered(): CardExam[] {
    let out = [...this.exams];

    // filtro por treinamento
    if (this.trainingFilter !== 'all') {
      out = out.filter(e => e.skillTraining === this.trainingFilter);
    }

    // busca
    const q = this.search.trim().toLowerCase();
    if (q) {
      out = out.filter(e => {
        const inName   = (e.examName || '').toLowerCase().includes(q);
        const inTheme  = (e.examTheme || '').toLowerCase().includes(q); // <<< NOVO
        const inCase   = (e.clinicalCase || '').toLowerCase().includes(q);
        const inRules  = (e.examRules || '').toLowerCase().includes(q);
        const inQs     = (e.questions || []).some(qq => (qq.text || '').toLowerCase().includes(q));
        return inName || inTheme || inCase || inRules || inQs;
      });
    }

    // sort
    switch (this.sortBy) {
      case 'oldest': out.sort((a, b) => a.id - b.id); break;
      case 'name'  : out.sort((a, b) => (a.examName || '').localeCompare(b.examName || '')); break;
      default      : out.sort((a, b) => b.id - a.id);
    }

    return out;
  }

  clearAll(): void {
    this.exams = [];
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify([])); } catch {}
    this.snack.open('Todas as provas foram removidas.', 'Ok', { duration: 2000 });
  }

  deleteOne(idOrGroupRepId: number): void {
    const idx = this.exams.findIndex(c => c.id === idOrGroupRepId);
    if (idx < 0) return;

    this.exams.splice(idx, 1);
    this.persistCardsToStorage();
    this.snack.open('Prova(s) removida(s).', 'Ok', { duration: 1500 });
  }

  trainingLabel(code: string | null): string {
    const map: Record<string, string> = {
      th1: 'Treinamento - 1 (TH 1)',
      th2: 'Treinamento - 2 (TH 2)',
      th3: 'Treinamento - 3 (TH 3)',
      th4: 'Treinamento - 4 (TH 4)',
      th5: 'Treinamento - 5 (TH 5)',
      th6: 'Treinamento - 6 (TH 6)',
      th7: 'Treinamento - 7 (TH 7)',
      th8: 'Treinamento - 8 (TH 8)'
    };
    return code ? (map[code] || code) : '—';
  }

  makeShareUrl(e: CardExam): string {
    return e.shareUrl;
  }

  copyLink(e: CardExam): void {
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

  optionHeaders(e: CardExam): string[] {
    const first = e.questions?.[0];
    if (!first || !first.options?.length) return [];
    return first.options.map(o => {
      const v = Number(o.value ?? 0);
      return `${v} ponto${v === 1 ? '' : 's'}`;
    });
  }

  private sortList(): void {
    switch (this.sortBy) {
      case 'oldest': this.exams.sort((a, b) => a.id - b.id); break;
      case 'name'  : this.exams.sort((a, b) => (a.examName || '').localeCompare(b.examName || '')); break;
      default      : this.exams.sort((a, b) => b.id - a.id);
    }
  }
}
