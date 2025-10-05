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
  examRules?: string | null;
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

  /** Abre uma aba com HTML pronto para imprimir e gera o PDF via diálogo do navegador */
  printSubmission(exam: GeneratedExam, sub: SavedResponse): void {
    try {
      const win = window.open('', '_blank', 'width=900,height=1000');
      if (!win) return;

      const submittedAt = new Date(sub.submittedAt).toLocaleString();
      const createdAt = new Date(exam.createdAt).toLocaleString();

      // Monta linhas da tabela (questões)
      const answersHtml = sub.answers
        .map((a) => {
          const qIndex = a.questionIndex + 1;
          const qText = exam.questions[a.questionIndex]?.text || '';
          const pts = a.points ?? 0;
          return `
            <tr>
              <td class="col-idx">${qIndex}</td>
              <td class="col-text">${this.escapeHtml(qText)}</td>
              <td class="col-pts">${pts}</td>
            </tr>`;
        })
        .join('');

      const resultadoPct = this.percent(sub.total, exam.totalPoints);

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Resultado — ${this.escapeHtml(exam.examName || 'Prova')}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family: Roboto, Arial, sans-serif; margin:0; color:#111827}
    .paper{max-width:920px; margin:0 auto; padding:28px}
    h1{margin:0 0 6px; font-size:22px}
    .muted{color:#6b7280; font-size:13px}
    .meta{display:flex; gap:10px; flex-wrap:wrap; margin:10px 0 14px}
    .chip{display:inline-flex; align-items:center; gap:6px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:999px; padding:3px 10px; font-size:12px}
    .case{background:#f8f9fb; border:1px solid #e7ecf3; border-radius:8px; padding:10px; margin:10px 0 16px; white-space:pre-wrap}
    table{width:100%; border-collapse:collapse; margin-top:8px}
    thead th{background:#f1f3f4; text-align:left; padding:10px; border-bottom:1px solid #e5e7eb}
    tbody td{padding:10px; border-bottom:1px solid #eef1f6; vertical-align:top}
    .col-idx{width:48px; font-weight:600}
    .col-pts{width:120px; text-align:right; font-weight:600}
    .totals{display:flex; justify-content:flex-end; margin-top:12px; font-weight:700}
    @media print { .no-print { display:none } }
  </style>
</head>
<body>
  <div class="paper">
    <h1>${this.escapeHtml(exam.examName || 'Prova')}</h1>
    <div class="muted">Criada em ${this.escapeHtml(createdAt)} • Envio em ${this.escapeHtml(submittedAt)}</div>

    <div class="meta">
      <span class="chip">Peso: ${exam.totalPoints} pts</span>
      <span class="chip">Questões: ${exam.questions.length || exam.questionsCount || 0}</span>
      <span class="chip">Resultado: ${sub.total} / ${exam.totalPoints} (${resultadoPct})</span>
    </div>
    <h3>Regras e Orientações</h3>
    <div class="case">${this.escapeHtml(exam.examRules || '')}</div>
    <h3>Caso Clínico</h3>
    <div class="case">${this.escapeHtml(exam.clinicalCase || '')}</div>

    <table>
      <thead>
        <tr>
          <th class="col-idx">#</th>
          <th>Enunciados</th>
          <th class="col-pts">Pontos</th>
        </tr>
      </thead>
      <tbody>
        ${answersHtml}
      </tbody>
    </table>

    <div class="totals">Total: ${sub.total} / ${exam.totalPoints}</div>
  </div>
  <script>
    window.onload = function(){
      window.print();
      setTimeout(() => window.close(), 300);
    }
  </script>
</body>
</html>`;

      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch {
      // silencia erros de popup/aba bloqueada
    }
  }

  /** Util simples para evitar problemas com caracteres especiais ao montar HTML */
  private escapeHtml(input: string): string {
    return (input || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
