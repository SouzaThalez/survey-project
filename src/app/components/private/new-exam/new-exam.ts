import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

/** ===== Types ===== */
type GlobalOptionGroup = { value: FormControl<number | null> };
type ItemGroup        = { text: FormControl<string> };

type ExamForm = {
  examName: FormControl<string | null>;
  examTheme: FormControl<string | null>;     // <<< NOVO CAMPO
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
  examTheme: string | null;                 // <<< NOVO CAMPO
  skillTraining: string | null;
  itemsCount: number | null;
  clinicalCase: string | null;
  examRules: string | null;
  totalPoints: number;
  items: GeneratedItem[];
  shareUrl: string;

  // === NOVO: agrupamento ===
  groupId: number;
  groupSize: number;

  // === COMPAT: a página atual usa "questions" ===
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

  // ===== Master form (múltiplas provas) =====
  form!: FormGroup<{
    examCount: FormControl<number>;
    exams: FormArray<FormGroup<ExamForm>>;
  }>;

  // UI
  selectedIndex = 0;
  examCountOptions = [1, 2, 3, 4, 5,6,7,8,9,10];

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

  itemCountOptions    = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
  optionsCountChoices = [2, 3, 4, 5];

  // Persistência
  generatedExams: GeneratedExam[] = [];
  lastShareUrlByIndex: Record<number, string> = {};

  private subs: Subscription[] = [];
  private examSubs: Subscription[][] = []; // listeners por aba

  constructor(private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.nonNullable.group({
      examCount: this.fb.control(1, { nonNullable: true, validators: [Validators.min(1), Validators.max(5)] }),
      exams: this.fb.array<FormGroup<ExamForm>>([])
    });

    this.loadFromStorage();

    // Garante 1 prova antes da 1ª renderização
    this.resizeExams(this.form.controls.examCount.value); // value = 1
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
    }) as FormGroup<GlobalOptionGroup>;
  }

  private createItemGroup(): FormGroup<ItemGroup> {
    return this.fb.nonNullable.group({
      text: this.fb.control<string>('', [Validators.required, Validators.minLength(3)]),
    }) as FormGroup<ItemGroup>;
  }

  private createExamForm(): FormGroup<ExamForm> {
    const fg = this.fb.nonNullable.group({
      examName:      this.fb.control<string | null>(null, [Validators.required, Validators.minLength(3)]),
      examTheme:     this.fb.control<string | null>(null, [Validators.required, Validators.minLength(3)]), // NOVO
      skillTraining: this.fb.control<string | null>(null, Validators.required),
      itemsCount:    this.fb.control<number | null>(3, Validators.required),
      optionsCount:  this.fb.control<number | null>(3, Validators.required),
      globalOptions: this.fb.array<FormGroup<GlobalOptionGroup>>([]),
      clinicalCase:  this.fb.control<string | null>(null, Validators.required),
      items:         this.fb.array<FormGroup<ItemGroup>>([]),
      examRules:     this.fb.control('', { nonNullable: true, validators: [Validators.required] })
    });

    // listeners locais da prova
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

    // semente inicial
    fg.controls.itemsCount.setValue(fg.controls.itemsCount.value ?? 3, { emitEvent: true });
    fg.controls.optionsCount.setValue(fg.controls.optionsCount.value ?? 3, { emitEvent: true });

    // guarda subs desta prova para limpar depois
    this.examSubs.push(subs);

    return fg as FormGroup<ExamForm>;
  }

  private resizeExams(target: number) {
    const arr = this.examsArray;
    const current = arr.length;

    if (current < target) {
      for (let i = current; i < target; i++) arr.push(this.createExamForm());
    } else if (current > target) {
      // limpa listeners das provas removidas
      for (let i = current - 1; i >= target; i--) {
        const subs = this.examSubs[i] ?? [];
        subs.forEach(s => s.unsubscribe());
        this.examSubs.splice(i, 1);
        arr.removeAt(i);
      }
    }

    // ajusta índice visível
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

  // ===== Persistência =====
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

  // ===== Geração =====
  private buildGeneratedFrom(i: number, groupId: number, groupSize: number): GeneratedExam | null {
    const exam = this.examsArray.at(i);
    if (!exam.valid) {
      exam.markAllAsTouched();
      return null;
    }

    const perItemMax = this.maxGlobalOptionOf(i);

    const templateOptions: GeneratedOption[] =
      this.globalOptionsArray(i).controls.map(o => ({ value: o.controls.value.value }));

    const items: GeneratedItem[] =
      this.itemsArray(i).controls.map(it => ({
        text: it.controls.text.value,
        options: templateOptions.map(o => ({ value: o.value })),
        totalPoints: perItemMax
      }));

    const totalPoints = perItemMax * items.length;
    const id = Date.now() + i;

    const v = exam.getRawValue();
    const gen: GeneratedExam = {
      id,
      createdAt: new Date().toISOString(),
      examName: v.examName,
      examTheme: v.examTheme ?? null,     // <<< NOVO CAMPO
      skillTraining: v.skillTraining,
      itemsCount: v.itemsCount,
      clinicalCase: v.clinicalCase,
      examRules: (v.examRules ?? '').trim(),
      totalPoints,
      items,
      shareUrl: '', // setado no caller
      groupId,
      groupSize,
      questions: items.map(it => ({ text: it.text, options: it.options, totalPoints: it.totalPoints })) // compat
    };

    return gen;
  }

  generateOne(i: number): void {
    const tempId = Date.now() + i;
    const groupId = tempId; // grupo unitário
    const groupSize = 1;

    const gen = this.buildGeneratedFrom(i, groupId, groupSize);
    if (!gen) {
      this.snack.open(`Revise os campos obrigatórios da Prova ${i + 1}.`, 'Ok', { duration: 2500 });
      return;
    }

    // link por examId
    gen.shareUrl = this.getShareUrl(gen.id);

    this.generatedExams.unshift(gen);
    this.persist();
    this.lastShareUrlByIndex[i] = gen.shareUrl;

    this.snack.open(`Prova ${i + 1} gerada e salva localmente!`, 'Ok', { duration: 2500 });
  }

  generateAll(): void {
    const groupId = Date.now(); // mesmo groupId para todas as abas
    const groupSize = this.examsArray.length;

    let ok = 0, fail = 0;
    const toAdd: GeneratedExam[] = [];

    for (let i = 0; i < this.examsArray.length; i++) {
      const gen = this.buildGeneratedFrom(i, groupId, groupSize);
      if (gen) {
        ok++;
        // link por groupId
        gen.shareUrl = `${window.location.origin}/private/responder-prova?groupId=${groupId}`;
        toAdd.push(gen);
        this.lastShareUrlByIndex[i] = gen.shareUrl;
      } else {
        fail++;
      }
    }

    if (toAdd.length) {
      this.generatedExams.unshift(...toAdd);
      this.persist();
    }

    if (ok && !fail) {
      this.snack.open(`Todas as ${ok} provas foram geradas!`, 'Ok', { duration: 2500 });
    } else if (ok && fail) {
      this.snack.open(`${ok} prova(s) gerada(s), ${fail} com pendências.`, 'Ok', { duration: 3500 });
    } else {
      this.snack.open(`Nenhuma prova gerada. Revise os campos.`, 'Ok', { duration: 2500 });
    }
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
