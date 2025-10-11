export class Submitter {
  id?: number;
  name?: string;
  email?: string;
  role?: string;

  constructor(s: Submitter) {
    this.id = s?.id;
    this.name = s?.name;
    this.email = s?.email;
    this.role = s?.role;
  }
}
