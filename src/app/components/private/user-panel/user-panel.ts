import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

type Role = 'Professor' | 'admin';

type User = {
  id: number;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string; // apenas para teste local
  role: Role;
};

type UserForm = FormGroup<{
  firstName: FormControl<string | null>;
  lastName: FormControl<string | null>;
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  role: FormControl<Role | null>;
}>;

@Component({
  selector: 'app-user-panel',
  standalone: false,
  templateUrl: './user-panel.html',
  styleUrls: ['./user-panel.scss']
})
export class UserPanel implements OnInit {
  private readonly STORAGE_KEY = 'users';

  form!: UserForm;
  users: User[] = [];
  showPass = false;

  roles = [
    { value: 'Professor' as Role, label: 'Professor' },
    { value: 'admin' as Role, label: 'Admin' },
  ];

  constructor(private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.nonNullable.group({
      firstName: this.fb.control<string | null>(null, [Validators.required, Validators.minLength(2)]),
      lastName: this.fb.control<string | null>(null, [Validators.required, Validators.minLength(2)]),
      email: this.fb.control<string | null>(null, [Validators.required, Validators.email]),
      password: this.fb.control<string | null>(null, [Validators.required, Validators.minLength(6)]),
      role: this.fb.control<Role | null>(null, [Validators.required]),
    }) as UserForm;
  }

  ngOnInit(): void {
    this.load();
  }

  // Storage
  private load(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.users = raw ? JSON.parse(raw) : [];
    } catch {
      this.users = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.users));
    } catch { }
  }

  // Ações
  createUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Revise os campos obrigatórios.', 'Ok', { duration: 2500 });
      return;
    }

    const v = this.form.getRawValue();
    const user: User = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      firstName: v.firstName!.trim(),
      lastName: v.lastName!.trim(),
      email: (v.email || '').trim().toLowerCase(),
      password: v.password || '',
      role: v.role as Role,
    };

    this.users.unshift(user);
    this.persist();
    this.snack.open('Usuário criado!', 'Ok', { duration: 2000 });
    this.form.reset();
  }

  removeUser(id: number): void {
    this.users = this.users.filter(u => u.id !== id);
    this.persist();
    this.snack.open('Usuário removido.', 'Ok', { duration: 1500 });
  }

  copyEmail(email: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(email).then(
        () => this.snack.open('E-mail copiado!', 'Ok', { duration: 1500 }),
        () => this.snack.open('Não foi possível copiar.', 'Ok', { duration: 1500 })
      );
    } else {
      // fallback simples
      const ok = window.prompt('Copie o e-mail:', email) !== null;
      if (ok) this.snack.open('E-mail copiado!', 'Ok', { duration: 1500 });
    }
  }

  // Helpers / stats
  get uniqueEmails(): number {
    return new Set(this.users.map(u => u.email)).size;
  }

  get lastCreatedAt(): string | null {
    if (!this.users.length) return null;
    return this.users[0].createdAt;
  }

  get professoresCount(): number {
    return this.users.filter(u => (u.role ?? '').toLowerCase() === 'professor').length;
  }

  get adminsCount(): number {
    return this.users.filter(u => (u.role ?? '').toLowerCase() === 'admin').length;
  }




  initials(u: User): string {
    const a = (u.firstName || '').trim().charAt(0).toUpperCase();
    const b = (u.lastName || '').trim().charAt(0).toUpperCase();
    return `${a}${b}` || 'U';
  }

  trackByUser = (_: number, u: User) => u.id;
}
