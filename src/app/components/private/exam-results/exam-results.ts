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
  groupId?: number;
  groupSize?: number;
};

type SavedAnswer = {
  questionIndex: number;
  selectedOptionIndex: number | null;
  points: number;
};

type Submitter = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

type SavedResponse = {
  examId: number;
  submittedAt: string;
  answers: SavedAnswer[];
  total: number;
  groupId?: number;
  submittedBy?: Submitter; // <<< quem respondeu
};

type Stats = {
  max: number;
  avg: number;
  best: number;
  worst: number;
  count: number;
  lastAt?: string;
};

type ExamCardSimple = {
  isComposite: false;
  exam: GeneratedExam;
  submissions: SavedResponse[];
  stats: Stats;
};

type CombinedSubmission = {
  submittedAt: string;
  total: number;
  totalsByExam: { examId: number; total: number }[];
  perExamAnswers: { examId: number; answers: SavedAnswer[] }[];
  submittedBy?: Submitter; // agregado do lote (primeiro disponível)
};

type ExamCardComposite = {
  isComposite: true;
  groupId: number;
  exams: GeneratedExam[];
  submissions: CombinedSubmission[];
  stats: Stats;
};

type ExamCard = ExamCardSimple | ExamCardComposite;

@Component({
  selector: 'app-exam-results',
  standalone: false,
  templateUrl: './exam-results.html',
  styleUrls: ['./exam-results.scss'],
})
export class ExamResults implements OnInit {
  private readonly EXAMS_KEY = 'generatedExams';
  private readonly RESPONSES_KEY = 'examResponses';

  examIdFilter?: number;
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

  // ======= LOAD & GROUP =======
  private load(): void {
    const exams: GeneratedExam[] = this.safeGet<GeneratedExam[]>(this.EXAMS_KEY, []);
    const responses: SavedResponse[] = this.safeGet<SavedResponse[]>(this.RESPONSES_KEY, []);

    exams.sort((a, b) => b.id - a.id);
    responses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const examById = new Map<number, GeneratedExam>();
    for (const e of exams) examById.set(e.id, e);

    const getGroupIdOfExam = (e: GeneratedExam) => (e.groupId ?? e.id);
    const getGroupIdOfResponse = (r: SavedResponse) => {
      if (r.groupId) return r.groupId;
      const ex = examById.get(r.examId);
      return ex ? getGroupIdOfExam(ex) : r.examId;
    };

    const examsByGroup = new Map<number, GeneratedExam[]>();
    for (const ex of exams) {
      if (this.examIdFilter && ex.id !== this.examIdFilter) continue;
      const gid = getGroupIdOfExam(ex);
      const arr = examsByGroup.get(gid) || [];
      arr.push(ex);
      examsByGroup.set(gid, arr);
    }

    const responsesByGroup = new Map<number, SavedResponse[]>();
    for (const r of responses) {
      if (this.examIdFilter && r.examId !== this.examIdFilter) continue;
      const gid = getGroupIdOfResponse(r);
      const arr = responsesByGroup.get(gid) || [];
      arr.push(r);
      responsesByGroup.set(gid, arr);
    }

    const cards: ExamCard[] = [];
    for (const [groupId, groupExams] of examsByGroup.entries()) {
      const groupResponses = responsesByGroup.get(groupId) || [];
      if (!groupResponses.length) continue;

      const isComposite = groupExams.length > 1;

      if (!isComposite) {
        const exam = groupExams[0];
        const subs = groupResponses.filter((r) => r.examId === exam.id);
        if (!subs.length) continue;

        const totals = subs.map((s) => s.total);
        const max = Number(exam.totalPoints ?? 0);
        const count = subs.length;
        const best = Math.max(...totals);
        const worst = Math.min(...totals);
        const avg = Math.round((totals.reduce((a, b) => a + b, 0) / count) * 10) / 10;
        const lastAt = subs[0]?.submittedAt;

        cards.push({
          isComposite: false,
          exam,
          submissions: subs,
          stats: { max, avg, best, worst, count, lastAt },
        });
      } else {
        // agrupa por submittedAt (lote)
        const buckets = new Map<string, SavedResponse[]>();
        for (const r of groupResponses) {
          const key = r.submittedAt;
          const arr = buckets.get(key) || [];
          arr.push(r);
          buckets.set(key, arr);
        }

        const combined: CombinedSubmission[] = Array.from(buckets.entries())
          .map(([submittedAt, list]) => {
            const totalsByExam: { examId: number; total: number }[] = [];
            const perExamAnswers: { examId: number; answers: SavedAnswer[] }[] = [];
            let sum = 0;
            for (const r of list) {
              sum += (r.total || 0);
              totalsByExam.push({ examId: r.examId, total: r.total || 0 });
              perExamAnswers.push({ examId: r.examId, answers: r.answers || [] });
            }
            const submittedBy = list.find(x => !!x.submittedBy)?.submittedBy;
            return { submittedAt, total: sum, totalsByExam, perExamAnswers, submittedBy };
          })
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        const max = groupExams.reduce((acc, e) => acc + Number(e.totalPoints || 0), 0);
        const totals = combined.map((c) => c.total);
        const count = combined.length;
        const best = Math.max(...totals);
        const worst = Math.min(...totals);
        const avg = Math.round((totals.reduce((a, b) => a + b, 0) / count) * 10) / 10;
        const lastAt = combined[0]?.submittedAt;

        cards.push({
          isComposite: true,
          groupId,
          exams: groupExams,
          submissions: combined,
          stats: { max, avg, best, worst, count, lastAt },
        });
      }
    }

    cards.sort((a, b) => {
      const aT = a.stats.lastAt ? new Date(a.stats.lastAt).getTime() : 0;
      const bT = b.stats.lastAt ? new Date(b.stats.lastAt).getTime() : 0;
      return bT - aT;
    });

    this.cards = cards;
    this.loaded = true;
  }

  // ======= HELPERS =======
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

  cardTitle(c: ExamCard): string {
    if (c.isComposite) {
      const base = c.exams[0]?.examName || 'Prova composta';
      const extra = c.exams.length > 1 ? ` (+${c.exams.length - 1})` : '';
      return `${base}${extra}`;
    }
    return c.exam.examName || `Prova ${c.exam.id}`;
  }

  createdAtChip(c: ExamCard): string {
    if (!c.isComposite) {
      return new Date(c.exam.createdAt).toLocaleString();
    }
    const times = c.exams
      .map((e) => new Date(e.createdAt).getTime())
      .filter((n) => !Number.isNaN(n));
    if (!times.length) return '-';
    const min = new Date(Math.min(...times));
    return min.toLocaleString();
  }

  cardQuestionsCount(c: ExamCard): number {
    const countFor = (e: GeneratedExam) =>
      (e.questions?.length ?? e.questionsCount ?? 0);
    if (!c.isComposite) return countFor(c.exam);
    return c.exams.reduce((acc, e) => acc + countFor(e), 0);
  }

  // track by
  trackByCard = (_: number, c: ExamCard) =>
    c.isComposite ? `g-${(c as any).groupId}` : `e-${(c as any).exam.id}`;

  trackBySubSimple = (_: number, s: SavedResponse) =>
    `${s.examId}-${s.submittedAt}`;

  trackBySubComposite = (_: number, s: CombinedSubmission) =>
    `g-sub-${s.submittedAt}`;

  // ======= PRINT (SIMPLES) =======
  printSubmission(exam: GeneratedExam, sub: SavedResponse): void {
    try {
      const win = window.open('', '_blank', 'width=900,height=1000');
      if (!win) return;

      const submittedAt = new Date(sub.submittedAt).toLocaleString();
      const createdAt = new Date(exam.createdAt).toLocaleString();
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
      const who = sub.submittedBy?.name || sub.submittedBy?.email || 'Usuário';

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
    h3{margin:16px 0 6px}
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
  </style>
</head>
<body>
  <div class="paper">
    <h1>${this.escapeHtml(exam.examName || 'Prova')}</h1>
    <div class="muted">Criada em ${this.escapeHtml(createdAt)} • Envio em ${this.escapeHtml(submittedAt)} • Por: ${this.escapeHtml(who)}</div>

    <div class="meta">
      <span class="chip">Peso: ${exam.totalPoints} pts</span>
      <span class="chip">Questões: ${exam.questions.length || exam.questionsCount || 0}</span>
      <span class="chip">Resultado: ${sub.total} / ${exam.totalPoints} (${resultadoPct})</span>
    </div>
    ${exam.examRules ? '<h3>Regras e Orientações</h3><div class="case">' + this.escapeHtml(exam.examRules || '') + '</div>' : ''}
    ${exam.clinicalCase ? '<h3>Caso Clínico</h3><div class="case">' + this.escapeHtml(exam.clinicalCase || '') + '</div>' : ''}

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
  <script>window.onload=function(){window.print();setTimeout(()=>window.close(),300);}</script>
</body>
</html>`;

      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch {
      // ignore
    }
  }

  // ======= PRINT (COMPOSTA) =======
  printSubmissionGroup(card: any, sub: CombinedSubmission): void {
    try {
      const win = window.open('', '_blank', 'width=900,height=1000');
      if (!win) return;

      const submittedAt = new Date(sub.submittedAt).toLocaleString();
      const totalMax = card.stats.max;
      const resultadoPct = this.percent(sub.total, totalMax);
      const who = sub.submittedBy?.name || sub.submittedBy?.email || 'Usuário';

      const answersByExam = new Map<number, SavedAnswer[]>();
      for (const pea of sub.perExamAnswers) answersByExam.set(pea.examId, pea.answers);

      const sectionsHtml = card.exams
        .map((ex: GeneratedExam, idx: number) => {
          const answers = answersByExam.get(ex.id) || [];
          const createdAt = new Date(ex.createdAt).toLocaleString();

          const answersHtml = answers
            .map((a) => {
              const qIndex = a.questionIndex + 1;
              const qText = ex.questions[a.questionIndex]?.text || '';
              const pts = a.points ?? 0;
              return `
                <tr>
                  <td class="col-idx">${qIndex}</td>
                  <td class="col-text">${this.escapeHtml(qText)}</td>
                  <td class="col-pts">${pts}</td>
                </tr>`;
            })
            .join('');

          const subTotal = sub.totalsByExam.find(t => t.examId === ex.id)?.total ?? 0;
          const pctLocal = this.percent(subTotal, ex.totalPoints);

          return `
            <div class="exam-section">
              <h2>${this.escapeHtml(ex.examName || `Prova ${idx + 1}`)}</h2>
              <div class="muted">Criada em ${this.escapeHtml(createdAt)} • Envio em ${this.escapeHtml(submittedAt)} • Por: ${this.escapeHtml(who)}</div>
              <div class="meta">
                <span class="chip">Peso: ${ex.totalPoints} pts</span>
                <span class="chip">Questões: ${ex.questions.length || ex.questionsCount || 0}</span>
                <span class="chip">Resultado: ${subTotal} / ${ex.totalPoints} (${pctLocal})</span>
              </div>

              ${ex.examRules ? `<h3>Regras e Orientações</h3><div class="case">${this.escapeHtml(ex.examRules || '')}</div>` : ''}
              ${ex.clinicalCase ? `<h3>Caso Clínico</h3><div class="case">${this.escapeHtml(ex.clinicalCase || '')}</div>` : ''}

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

              <div class="totals">Total desta prova: ${subTotal} / ${ex.totalPoints}</div>
            </div>
          `;
        })
        .join('<hr class="sep" />');

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Resultado — Prova composta (grupo ${card.groupId})</title>
  <style>
    *{box-sizing:border-box}
    body{font-family: Roboto, Arial, sans-serif; margin:0; color:#111827}
    .paper{max-width:920px; margin:0 auto; padding:28px}
    h1{margin:0 0 6px; font-size:22px}
    h2{margin:18px 0 8px; font-size:18px}
    h3{margin:16px 0 6px}
    .muted{color:#6b7280; font-size:13px}
    .meta{display:flex; gap:10px; flex-wrap:wrap; margin:10px 0 14px}
    .chip{display:inline-flex; align-items:center; gap:6px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:999px; padding:3px 10px; font-size:12px}
    .case{background:#f8f9fb; border:1px solid #e7ecf3; border-radius:8px; padding:10px; margin:10px 0 16px; white-space:pre-wrap}
    .exam-section{margin-top:16px}
    .sep{border:none; border-top:1px solid #e5e7eb; margin:22px 0}
    table{width:100%; border-collapse:collapse; margin-top:8px}
    thead th{background:#f1f3f4; text-align:left; padding:10px; border-bottom:1px solid #e5e7eb}
    tbody td{padding:10px; border-bottom:1px solid #eef1f6; vertical-align:top}
    .col-idx{width:48px; font-weight:600}
    .col-pts{width:120px; text-align:right; font-weight:600}
    .grand{display:flex; justify-content:flex-end; margin-top:18px; font-weight:800; font-size:16px}
  </style>
</head>
<body>
  <div class="paper">
    <h1>Resultado — Prova composta</h1>
    <div class="muted">Grupo ${card.groupId} • Envio em ${this.escapeHtml(submittedAt)} • Por: ${this.escapeHtml(who)}</div>
    <div class="meta">
      <span class="chip">Provas: ${card.exams.length}</span>
      <span class="chip">Questões: ${this.cardQuestionsCount(card)}</span>
      <span class="chip">Peso total: ${totalMax} pts</span>
      <span class="chip">Resultado: ${sub.total} / ${totalMax} (${resultadoPct})</span>
    </div>

    ${sectionsHtml}

    <div class="grand">Total do grupo: ${sub.total} / ${totalMax}</div>
  </div>
  <script>window.onload=function(){window.print();setTimeout(()=>window.close(),300);}</script>
</body>
</html>`;

      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch {
      // ignore
    }
  }

  // ======= UTILS =======
  private escapeHtml(input: string): string {
    return (input || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
