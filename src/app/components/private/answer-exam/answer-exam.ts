import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

type GeneratedOption = { value: number | null };
type GeneratedQuestion = { text: string; options: GeneratedOption[]; totalPoints: number };

// Formato salvo no localStorage (suporta tanto "questions" quanto "items" por compat)
type StoredExam = {
  id: number;
  createdAt: string;
  examName: string | null;
  skillTraining: string | null;
  clinicalCase: string | null;
  totalPoints: number;
  examRules: string | null;
  shareUrl: string;

  // compat: pode existir "questions" (preferencial) ou "items"
  questions?: GeneratedQuestion[];
  items?: { text: string; options: GeneratedOption[]; totalPoints: number }[];

  // agrupamento
  groupId?: number;
  groupSize?: number;

  // metadados não usados aqui
  itemsCount?: number | null;
  questionsCount?: number | null;
};

type AnswersForm = FormGroup<{
  selections: FormArray<FormControl<number | null>>;
}>;

@Component({
  selector: 'app-answer-exam',
  standalone: false,
  templateUrl: './answer-exam.html',
  styleUrls: ['./answer-exam.scss']
})
export class AnswerExam implements OnInit, OnDestroy {
  private readonly STORAGE_KEY = 'generatedExams';
  private sub?: Subscription;

  // Pode vir examId (single) OU groupId (várias)
  examId?: number;
  groupId?: number;

  // Lista de provas carregadas (1 ou N)
  exams: StoredExam[] = [];

  // Um formulário por prova (mesma ordem de "exams")
  forms: AnswersForm[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sub = this.route.queryParamMap.subscribe((qp) => {
      const examIdStr = qp.get('examId');
      const groupIdStr = qp.get('groupId');

      this.examId = examIdStr ? Number(examIdStr) : undefined;
      this.groupId = groupIdStr ? Number(groupIdStr) : undefined;

      // Carrega do storage
      const loaded = this.loadFromStorage();

      if (this.groupId && !Number.isNaN(this.groupId)) {
        // múltiplas provas (grupo)
        this.exams = loaded.filter(e => (e.groupId ?? e.id) === this.groupId);
      } else if (this.examId && !Number.isNaN(this.examId)) {
        // prova única
        const one = loaded.find(e => e.id === this.examId);
        this.exams = one ? [one] : [];
      } else {
        this.exams = [];
      }

      if (!this.exams.length) {
        this.snack.open('Prova não encontrada.', 'Ok', { duration: 2500 });
        this.router.navigate(['/private/nova-prova']);
        return;
      }

      // Normaliza para garantir que "questions" exista (compat com itens)
      this.exams = this.exams.map(e => ({
        ...e,
        questions: (e.questions && e.questions.length)
          ? e.questions
          : (e.items || []).map(it => ({
              text: it.text,
              options: it.options || [],
              totalPoints: it.totalPoints || 0
            }))
      }));

      // Constrói um formulário por prova
      this.buildForms();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ==== Storage =====
  private loadFromStorage(): StoredExam[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) as StoredExam[] : [];
    } catch {
      return [];
    }
  }

  // ==== Forms =====
  private buildForms(): void {
    this.forms = this.exams.map(exam => {
      const selections = this.fb.array<FormControl<number | null>>(
        (exam.questions || []).map(() => this.fb.control<number | null>(null, Validators.required))
      );
      // group tipado
      return this.fb.group<AnswersForm['controls']>({
        selections
      });
    });
  }

  selectionsArray(i: number): FormArray<FormControl<number | null>> {
    return this.forms[i].controls.selections;
  }

  // ==== UI helpers (por prova) =====
  optionHeaders(i: number): string[] {
    const e = this.exams[i];
    if (!e || !e.questions?.length) return [];
    const opts = e.questions[0].options || [];
    return opts.map(o => `${o.value ?? 0} pontos`);
  }

  selectedTotal(i: number): number {
    const e = this.exams[i];
    if (!e || !e.questions?.length) return 0;
    const selections = this.selectionsArray(i);
    return selections.controls.reduce((sum, ctrl, qIdx) => {
      const optIdx = ctrl.value ?? -1;
      const pts = e.questions![qIdx].options[optIdx]?.value ?? 0;
      return sum + Number(pts);
    }, 0);
  }

  overallTotal(): number {
    if (!this.exams?.length) return 0;
    return this.exams.reduce((acc, _e, idx) => acc + this.selectedTotal(idx), 0);
  }

  hasInvalidForms(): boolean {
    return this.forms.some(f => f.invalid);
  }

  // ==== Envio =====
  submitAll(): void {
    // valida tudo
    const invalidIdxs = this.forms
      .map((f, i) => ({ i, invalid: f.invalid }))
      .filter(x => x.invalid)
      .map(x => x.i);

    if (invalidIdxs.length) {
      this.forms.forEach(f => f.markAllAsTouched());
      const lista = invalidIdxs.map(i => i + 1).join(', ');
      this.snack.open(
        invalidIdxs.length === 1
          ? `Selecione uma opção para cada questão na Prova ${lista}.`
          : `Selecione uma opção para cada questão nas Provas: ${lista}.`,
        'Ok',
        { duration: 3500 }
      );
      return;
    }

    // monta payload para CADA prova
    const payloads = this.exams.map((e, i) => {
      const sels = this.selectionsArray(i);
      return {
        examId: e.id,
        groupId: e.groupId ?? e.id,
        submittedAt: new Date().toISOString(),
        answers: sels.controls.map((c, qIdx) => ({
          questionIndex: qIdx,
          selectedOptionIndex: c.value,
          points: e.questions![qIdx].options[c.value!]?.value ?? 0
        })),
        total: this.selectedTotal(i)
      };
    });

    // salva todos em 'examResponses' (um registro por prova)
    try {
      const key = 'examResponses';
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      // preserva a ordem dos exams no topo (unshift em ordem reversa)
      for (let p = payloads.length - 1; p >= 0; p--) {
        list.unshift(payloads[p]);
      }
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}

    this.snack.open('Respostas enviadas!', 'Ok', { duration: 2500 });

    // Navega para o resultado:
    // - se veio por groupId, prioriza groupId
    // - senão, mantém compat por examId (usa a primeira prova)
    if (this.groupId) {
      this.router.navigate(['/private/resultado-prova'], {
        queryParams: { groupId: this.groupId }
      });
    } else {
      const id = this.examId ?? this.exams[0]?.id;
      this.router.navigate(['/private/resultado-prova'], {
        queryParams: { examId: id }
      });
    }
  }
}
