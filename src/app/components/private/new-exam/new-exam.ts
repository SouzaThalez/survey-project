// new-exam.component.ts (updated: totalPoints = max(globalOptions) * number of questions)
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

// ===== Types =====
type GlobalOptionGroup = {
  value: FormControl<number | null>;
};

type QuestionGroup = {
  text: FormControl<string>;
};

type GeneratedOption = { value: number | null };

type GeneratedQuestion = { text: string; options: GeneratedOption[]; totalPoints: number };

type GeneratedExam = {
  id: number;                 
  createdAt: string;          // ISO
  examName: string | null;
  skillTraining: string | null;
  questionsCount: number | null;
  clinicalCase: string | null;
  totalPoints: number;
 examRules: string | null;
  questions: GeneratedQuestion[];
  shareUrl: string;
};

@Component({
  selector: 'app-new-exam',
  standalone: false,
  templateUrl: './new-exam.html',
  styleUrls: ['./new-exam.scss']
})
export class NewExam implements OnInit, OnDestroy {
  private readonly STORAGE_KEY = 'generatedExams';

  form!: FormGroup<{

    examName: FormControl<string | null>;
    skillTraining: FormControl<string | null>;
    questionsCount: FormControl<number | null>;
    optionsCount: FormControl<number | null>;
    globalOptions: FormArray<FormGroup<GlobalOptionGroup>>;
    clinicalCase: FormControl<string | null>;
    questions: FormArray<FormGroup<QuestionGroup>>;
    examRules: FormControl<string>;

  }>;

  generatedExams: GeneratedExam[] = [];
  lastShareUrl = '';
  lastCreated?: GeneratedExam;

  trainingOptions = [
    { value: 'th1', label: 'Treinamento - 1 (TH 1)' },
    { value: 'th2', label: 'Treinamento - 2 (TH 2)' },
    { value: 'th3', label: 'Treinamento - 3 (TH 3)' },
    
    { value: 'th4', label: 'Treinamento - 4 (TH 4)' },
    { value: 'th5', label: 'Treinamento - 5 (TH 5)' },
    { value: 'th6', label: 'Treinamento - 6 (TH 6)' },
    { value: 'th7', label: 'Treinamento - 7 (TH 7)' },
    { value: 'th8', label: 'Treinamento - 8 (TH 8)' },

    
  ];

  questionCountOptions = [3, 5, 10, 15];
  optionsCountChoices = [2, 3, 4, 5];

  private subs: Subscription[] = [];

  constructor(private fb: FormBuilder, private snack: MatSnackBar) {
    // Create immediately so template never sees undefined
    this.form = this.fb.nonNullable.group({

      examName: this.fb.control<string | null>(null, [Validators.required, Validators.minLength(3)]),
      skillTraining: this.fb.control<string | null>(null, Validators.required),
      questionsCount: this.fb.control<number | null>(3, Validators.required),
      optionsCount: this.fb.control<number | null>(3, Validators.required),
      globalOptions: this.fb.array<FormGroup<GlobalOptionGroup>>([]),
      clinicalCase: this.fb.control<string | null>(null, Validators.required),
      questions: this.fb.array<FormGroup<QuestionGroup>>([]),
        examRules: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),

    });

    this.loadFromStorage();
  }

  ngOnInit(): void {
    // Auto-create question fields whenever count changes
    this.subs.push(
      this.form.controls.questionsCount.valueChanges.subscribe((count) => {
        if (count && count > 0) this.resizeQuestions(count);
        else this.form.controls.questions.clear();
      })
    );

    // Auto-create global options whenever optionsCount changes
    this.subs.push(
      this.form.controls.optionsCount.valueChanges.subscribe((count) => {
        if (count && count > 0) this.resizeGlobalOptions(count);
        else this.form.controls.globalOptions.clear();
      })
    );

    // Seed once (triggers valueChanges)
    const initialQ = this.form.controls.questionsCount.value ?? 3;
    const initialO = this.form.controls.optionsCount.value ?? 3;
    this.form.controls.questionsCount.setValue(initialQ, { emitEvent: true });
    this.form.controls.optionsCount.setValue(initialO, { emitEvent: true });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // === Getters ===
  get questionsArray(): FormArray<FormGroup<QuestionGroup>> {
    return this.form.controls.questions;
  }
  get globalOptionsArray(): FormArray<FormGroup<GlobalOptionGroup>> {
    return this.form.controls.globalOptions;
  }

  // === Builders ===
  private createGlobalOption(defaultValue: number): FormGroup<GlobalOptionGroup> {
    return this.fb.nonNullable.group({
      value: this.fb.control<number | null>(defaultValue, [Validators.required, Validators.min(0)])
    }) as FormGroup<GlobalOptionGroup>;
  }

  private createQuestionGroup(): FormGroup<QuestionGroup> {
    return this.fb.nonNullable.group({
      text: this.fb.control<string>('', [Validators.required, Validators.minLength(3)]),
    }) as FormGroup<QuestionGroup>;
  }

  private resizeQuestions(target: number) {
    const arr = this.questionsArray;
    const current = arr.length;

    if (current < target) {
      for (let i = current; i < target; i++) arr.push(this.createQuestionGroup());
    } else if (current > target) {
      for (let i = current - 1; i >= target; i--) arr.removeAt(i);
    }
  }

  private resizeGlobalOptions(target: number) {
    const arr = this.globalOptionsArray;
    const current = arr.length;

    // Default values like 0,1,2,3...
    if (current < target) {
      for (let i = current; i < target; i++) arr.push(this.createGlobalOption(i));
    } else if (current > target) {
      for (let i = current - 1; i >= target; i--) arr.removeAt(i);
    }
  }

  // === Totals (MAX logic) ===
  private maxGlobalOption(): number {
    const values = this.globalOptionsArray.controls.map(g => Number(g.controls.value.value ?? 0));
    // Ensure non-empty for Math.max; default to 0
    return values.length ? Math.max(...values) : 0;
  }

  get totalPoints(): number {
    const perQuestionMax = this.maxGlobalOption();
    const count = this.questionsArray.length;
    return perQuestionMax * count;
  }

  // === Local persistence & link generation ===
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.generatedExams = raw ? JSON.parse(raw) : [];
    } catch {
      this.generatedExams = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.generatedExams));
    } catch {}
  }

  private getShareUrl(id: number): string {
    const base = `${window.location.origin}/private/responder-prova`;
    return `${base}?examId=${id}`;
  }

  // === Create & save exam (uses MAX per-question logic) ===
  generateExam(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Revise os campos obrigatórios.', 'Ok', { duration: 2500 });
      return;
    }

    const values = this.form.getRawValue();

    // Build the global option template
    const templateOptions: GeneratedOption[] = this.globalOptionsArray.controls.map(o => ({
      value: o.controls.value.value
    }));

    const perQuestionMax = this.maxGlobalOption();

    // Create questions using the shared template
    const questions: GeneratedQuestion[] = this.questionsArray.controls.map(q => ({
      text: q.controls.text.value,
      options: templateOptions.map(o => ({ value: o.value })), // clone values
      totalPoints: perQuestionMax
    }));

    const totalPoints = perQuestionMax * questions.length;
    const id = Date.now();
    const shareUrl = this.getShareUrl(id);

    const exam: GeneratedExam = {
      id,
      createdAt: new Date().toISOString(),
      examName: values.examName,
      skillTraining: values.skillTraining,
      questionsCount: values.questionsCount,
      clinicalCase: values.clinicalCase,
       examRules: values.examRules.trim(), 
      totalPoints,
      questions,
      shareUrl
    };

    this.generatedExams.unshift(exam);
    this.persist();

    this.lastCreated = exam;
    this.lastShareUrl = shareUrl;

    this.snack.open('Prova gerada e salva localmente!', 'Ok', { duration: 2500 });
  }

  resetAll(): void {
    this.form.reset();
    this.questionsArray.clear();
    this.globalOptionsArray.clear();
    this.form.controls.questionsCount.setValue(3, { emitEvent: true });
    this.form.controls.optionsCount.setValue(3, { emitEvent: true });
    this.lastShareUrl = '';
    this.lastCreated = undefined;
  }

  trackByIndex = (i: number) => i;
}
 