import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { trainingData } from '../../../data/trainingData';
import { ExamService } from '../../../services/exam.service';
import { CreatedExamDTO, ExamCreateDTO, ExamGroupCreateDTO } from '../../../models/dtos';

/** ===== Types ===== */
type GlobalOptionGroup = { value: FormControl<number | null> };
type ItemGroup        = { text: FormControl<string> };

type ExamForm = {
  examName: FormControl<string | null>;
  examTheme: FormControl<string | null>;
  skillTraining: FormControl<string | null>;
  itemsCount: FormControl<number | null>;
  optionsCount: FormControl<number | null>;
  globalOptions: FormArray<FormGroup<GlobalOptionGroup>>;
  clinicalCase: FormControl<string | null>;
  items: FormArray<FormGroup<ItemGroup>>;
  examRules: FormControl<string>;
};

type GeneratedOption = { value: number | null };

type GeneratedItem   = { text: string; options: GeneratedOption[]; totalPoints: number };

type GeneratedExam = {
  id: number;
  createdAt: string;   // ISO
  examName: string | null;
  examTheme: string | null;
  skillTraining: string | null;
  itemsCount: number | null;
  clinicalCase: string | null;
  examRules: string | null;
  totalPoints: number;
  items: GeneratedItem[];
  shareUrl: string;
  groupId: number | null;
  groupSize: number;
  questions?: { text: string; options: GeneratedOption[]; totalPoints: number }[];
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
    examCount: FormControl<number>;
    exams: FormArray<FormGroup<ExamForm>>;
  }>;

  selectedIndex = 0;
  examCountOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  trainingOptions = trainingData;

  itemCountOptions    = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
  optionsCountChoices = [2, 3, 4, 5];

  generatedExams: GeneratedExam[] = [];
  lastShareUrlByIndex: Record<number, string> = {};

  private subs: Subscription[] = [];
  private examSubs: Subscription[][] = [];

  constructor(
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private examApi: ExamService
  ) {
    this.form = this.fb.nonNullable.group({
      examCount: this.fb.control(1, { nonNullable: true, validators: [Validators.min(1), Validators.max(5)] }),
      exams: this.fb.array<FormGroup<ExamForm>>([])
    });

    this.loadFromStorage();
    this.resizeExams(this.form.controls.examCount.value);
  }

  ngOnInit(): void {
    this.subs.push(
      this.form.controls.examCount.valueChanges.subscribe(count => {
        this.resizeExams(count ?? 1);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.examSubs.flat().forEach(s => s.unsubscribe());
  }

  // ===== Getters =====
  get examsArray(): FormArray<FormGroup<ExamForm>> {
    return this.form.controls.exams;
  }
  itemsArray(i: number): FormArray<FormGroup<ItemGroup>> {
    return this.examsArray.at(i).controls.items;
  }
  globalOptionsArray(i: number): FormArray<FormGroup<GlobalOptionGroup>> {
    return this.examsArray.at(i).controls.globalOptions;
  }

  // ===== Builders =====
  private createGlobalOption(defaultValue: number): FormGroup<GlobalOptionGroup> {
    return this.fb.nonNullable.group({
      value: this.fb.control<number | null>(defaultValue, [Validators.required, Validators.min(0)])
    }) as unknown as FormGroup<GlobalOptionGroup>;
  }

  private createItemGroup(): FormGroup<ItemGroup> {
    return this.fb.nonNullable.group({
      text: this.fb.control<string>('', [Validators.required, Validators.minLength(3)]),
    }) as unknown as FormGroup<ItemGroup>;
  }

  private createExamForm(): FormGroup<ExamForm> {
    const fg = this.fb.nonNullable.group({
      examName:      this.fb.control<string | null>(null, [Validators.required, Validators.minLength(3)]),
      examTheme:     this.fb.control<string | null>(null, [Validators.required, Validators.minLength(3)]),
      skillTraining: this.fb.control<string | null>(null, Validators.required),
      itemsCount:    this.fb.control<number | null>(3, Validators.required),
      optionsCount:  this.fb.control<number | null>(3, Validators.required),
      globalOptions: this.fb.array<FormGroup<GlobalOptionGroup>>([]),
      clinicalCase:  this.fb.control<string | null>(null, Validators.required),
      items:         this.fb.array<FormGroup<ItemGroup>>([]),
      examRules:     this.fb.control('', { nonNullable: true, validators: [Validators.required] })
    });

    const subs: Subscription[] = [];
    subs.push(
      fg.controls.itemsCount.valueChanges.subscribe(count => {
        const arr = fg.controls.items;
        const target = count ?? 0;
        const current = arr.length;
        if (target > current) {
          for (let i = current; i < target; i++) arr.push(this.createItemGroup());
        } else {
          for (let i = current - 1; i >= target; i--) arr.removeAt(i);
        }
      }),
      fg.controls.optionsCount.valueChanges.subscribe(count => {
        const arr = fg.controls.globalOptions;
        const target = count ?? 0;
        const current = arr.length;
        if (target > current) {
          for (let i = current; i < target; i++) arr.push(this.createGlobalOption(i));
        } else {
          for (let i = current - 1; i >= target; i--) arr.removeAt(i);
        }
      })
    );

    fg.controls.itemsCount.setValue(fg.controls.itemsCount.value ?? 3, { emitEvent: true });
    fg.controls.optionsCount.setValue(fg.controls.optionsCount.value ?? 3, { emitEvent: true });

    this.examSubs.push(subs);
    return fg as FormGroup<ExamForm>;
  }

  private resizeExams(target: number) {
    const arr = this.examsArray;
    const current = arr.length;

    if (current < target) {
      for (let i = current; i < target; i++) arr.push(this.createExamForm());
    } else if (current > target) {
      for (let i = current - 1; i >= target; i--) {
        const subs = this.examSubs[i] ?? [];
        subs.forEach(s => s.unsubscribe());
        this.examSubs.splice(i, 1);
        arr.removeAt(i);
      }
    }

    this.selectedIndex = Math.min(this.selectedIndex, this.examsArray.length - 1);
  }

  // ===== Totais =====
  private maxGlobalOptionOf(i: number): number {
    const values = this.globalOptionsArray(i).controls.map(g => Number(g.controls.value.value ?? 0));
    return values.length ? Math.max(...values) : 0;
  }

  totalPointsFor(i: number): number {
    return this.maxGlobalOptionOf(i) * this.itemsArray(i).length;
  }

  // ===== Persistência local (compat das outras telas) =====
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
private pushToLocal(created: CreatedExamDTO): void {
  const items = created.questions.map(q => ({
    text: q.text,
    options: q.options.map(o => ({ value: o.value })),
    totalPoints: q.totalPoints,
  }));

  const asLocal: GeneratedExam = {
    id: created.id,
    createdAt: created.createdAt,
    examName: created.examName,
    examTheme: created.examTheme,
    skillTraining: created.skillTraining,
    itemsCount: created.questions.length,
    clinicalCase: created.clinicalCase,
    examRules: created.examRules,
    totalPoints: created.totalPoints,
    items, // agora populado
    shareUrl: created.shareUrl,
    // se seu GeneratedExam.groupId for number (não-null), force um fallback:
    groupId: (created.groupId ?? 0) as number, 
    groupSize: created.groupSize ?? 1,

    // mantém também "questions" para compat com telas antigas
    questions: created.questions.map(q => ({
      text: q.text,
      totalPoints: q.totalPoints,
      options: q.options.map(o => ({ value: o.value })),
    })),
  };

  this.generatedExams.unshift(asLocal);
  this.persist();
}

  // ===== Monta payloads para o backend =====
  private buildExamCreateDTO(i: number): ExamCreateDTO | null {
    const exam = this.examsArray.at(i);
    if (!exam.valid) {
      exam.markAllAsTouched();
      return null;
    }

    const globalOpts = this.globalOptionsArray(i).controls.map(g => ({
      value: Number(g.controls.value.value ?? 0)
    }));

    const questions = this.itemsArray(i).controls.map(it => ({
      text: it.controls.text.value!,
      options: globalOpts
    }));

    const v = exam.getRawValue();
    return {
      examName: v.examName ?? null,
      examTheme: v.examTheme!,                 // já validado
      skillTraining: v.skillTraining ?? null,  // ex.: "th1"
      clinicalCase: v.clinicalCase ?? null,
      examRules: (v.examRules ?? '').trim(),
      questions
    };
  }

  // ===== Integração =====
  generateOne(i: number): void {
   
    const payload = this.buildExamCreateDTO(i);
    if (!payload) {
      this.snack.open(`Revise os campos obrigatórios da Prova ${i + 1}.`, 'Ok', { duration: 2500 });
      return;
    }

    this.examApi.createOne(payload).subscribe({
      next: (created) => {
        this.lastShareUrlByIndex[i] = created.shareUrl;
        this.pushToLocal(created);
        this.snack.open(`Prova ${i + 1} gerada no banco!`, 'Ok', { duration: 2500 });
      },
      error: () => this.snack.open('Falha ao criar prova no servidor.', 'Ok', { duration: 2500 })
    });
  }

  generateAll(): void {
 

    const examsPayload: ExamCreateDTO[] = [];

    for (let i = 0; i < this.examsArray.length; i++) {
      const dto = this.buildExamCreateDTO(i);
      if (!dto) {
        this.snack.open(`Pendências na Prova ${i + 1}.`, 'Ok', { duration: 2500 });
        return;
      }
      examsPayload.push(dto);
    }

    const payload: ExamGroupCreateDTO = { title: null, exams: examsPayload };

    this.examApi.createGroup(payload).subscribe({

      next: (res) => {
        res.exams.forEach((ex:CreatedExamDTO, idx:number) => {
          this.lastShareUrlByIndex[idx] = ex.shareUrl;
          this.pushToLocal(ex);
        });
        this.snack.open(`Criadas ${res.exams.length} provas no banco!`, 'Ok', { duration: 2500 });
      },
      error: () => this.snack.open('Falha ao criar grupo de provas no servidor.', 'Ok', { duration: 3000 })
    });
  }

  // ===== Util =====
  resetAll(): void {
    this.examSubs.flat().forEach(s => s.unsubscribe());
    this.examSubs = [];

    this.examsArray.clear();
    this.form.controls.examCount.setValue(1, { emitEvent: false });
    this.resizeExams(1);

    this.lastShareUrlByIndex = {};
    this.selectedIndex = 0;
  }

  trackByIndex = (i: number) => i;
}
