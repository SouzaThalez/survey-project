import { Option } from './option';

export class Question {
  text: string;
  options: Option[];
  totalPoints: number;

  constructor(q: Question) {
    this.text = q.text;
    this.totalPoints = q.totalPoints;
    this.options = (q.options || []).map(o => new Option(o));
  }
}
