export class Answer {
  questionIndex: number;
  selectedOptionIndex: number | null;
  points: number;

  constructor(a: Answer) {
    this.questionIndex = a.questionIndex;
    this.selectedOptionIndex = a.selectedOptionIndex ?? null;
    this.points = a.points ?? 0;
  }
}
