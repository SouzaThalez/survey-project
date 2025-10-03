import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

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

  examId!: number;
  exam?: GeneratedExam;

  answersForm!: AnswersForm;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sub = this.route.queryParamMap.subscribe((qp) => {
      const idStr = qp.get('examId');
      this.examId = idStr ? Number(idStr) : NaN;

      if (!this.examId || Number.isNaN(this.examId)) {
        this.snack.open('Link inválido: examId ausente.', 'Ok', { duration: 2500 });
        this.router.navigate(['/private/nova-prova']);
        return;
      }

      const exam = this.loadExam(this.examId);
      if (!exam) {
        this.snack.open('Prova não encontrada.', 'Ok', { duration: 2500 });
        this.router.navigate(['/private/nova-prova']);
        return;
      }

      this.exam = exam;
      this.buildForm(exam);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private loadExam(id: number): GeneratedExam | undefined {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const list: GeneratedExam[] = raw ? JSON.parse(raw) : [];
      return list.find(e => e.id === id);
    } catch {
      return undefined;
    }
  }

  private buildForm(exam: GeneratedExam): void {
    const selections = this.fb.array<FormControl<number | null>>(
      exam.questions.map(() => this.fb.control<number | null>(null, Validators.required))
    );
    this.answersForm = this.fb.nonNullable.group({
      selections
    });
  }

  get selections(): FormArray<FormControl<number | null>> {
    return this.answersForm.controls.selections;
  }

  /** Header columns derived from the first question’s options */
  get optionHeaders(): string[] {
    if (!this.exam || !this.exam.questions.length) return [];
    const opts = this.exam.questions[0].options;
    return opts.map(o => `${o.value ?? 0} pontos`);
  }

  /** Current total with selected options */
  get selectedTotal(): number {
    if (!this.exam) return 0;
    return this.selections.controls.reduce((sum, ctrl, i) => {
      const idx = ctrl.value ?? -1;
      const pts = this.exam!.questions[i].options[idx]?.value ?? 0;
      return sum + Number(pts);
    }, 0);
  }

  submitAnswers(): void {

    if (this.answersForm.invalid) {
      this.answersForm.markAllAsTouched();
      this.snack.open('Selecione uma opção para cada questão.', 'Ok', { duration: 2500 });
      return;
    }

    // Persist a lightweight response if you want to list later
    const payload = {
      examId: this.examId,
      submittedAt: new Date().toISOString(),
      answers: this.selections.controls.map((c, i) => ({
        questionIndex: i,
        selectedOptionIndex: c.value,
        points: this.exam!.questions[i].options[c.value!]?.value ?? 0
      })),
      total: this.selectedTotal
    };

    try {
      const key = 'examResponses';
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(payload);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}

    this.snack.open('Respostas enviadas!', 'Ok', { duration: 2500 });

    // Navigate away to exam-results component
     this.router.navigate(['/private/resultado-prova'], {
      queryParams: { examId: this.examId }
    });
    
    
  }
}
