export class Option {
  value: number | null;

  constructor(option: Option) {
    this.value = option?.value ?? null;
  }
}
