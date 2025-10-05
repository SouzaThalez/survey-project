import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

type User = {
  id: number;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string; // ⚠️ Apenas para testes — não salve senhas em texto puro em produção.
};

type UserForm = FormGroup<{
  firstName: FormControl<string | null>;
  lastName: FormControl<string | null>;
  email: FormControl<string | null>;
  password: FormControl<string | null>;
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

  constructor(private fb: FormBuilder, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.form = this.fb.nonNullable.group({
      firstName: this.fb.control<string | null>(null, Validators.required),
      lastName: this.fb.control<string | null>(null, Validators.required),
      email: this.fb.control<string | null>(null, [Validators.required, Validators.email]),
      password: this.fb.control<string | null>(null, [Validators.required, Validators.minLength(6)])
    });

    this.load();
  }

  // Persistência local
  private load(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.users = raw ? JSON.parse(raw) : [];
      // mais recente primeiro
      this.users.sort((a, b) => b.id - a.id);
    } catch {
      this.users = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.users));
    } catch {}
  }

  // Ações
  createUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Revise os campos obrigatórios.', 'Ok', { duration: 2500 });
      return;
    }

    const values = this.form.getRawValue();

    // Evita duplicidade simples por email
    const exists = this.users.some(u => u.email.toLowerCase().trim() === (values.email || '').toLowerCase().trim());
    if (exists) {
      this.snack.open('Já existe um usuário com este email.', 'Ok', { duration: 2500 });
      return;
    }

    const user: User = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      firstName: values.firstName!.trim(),
      lastName: values.lastName!.trim(),
      email: values.email!.trim(),
      password: values.password! // ⚠️ não faça isso em produção
    };

    this.users.unshift(user);
    this.persist();
    this.form.reset();
    this.snack.open('Usuário criado!', 'Ok', { duration: 2200 });
  }

  removeUser(id: number): void {
    this.users = this.users.filter(u => u.id !== id);
    this.persist();
    this.snack.open('Usuário removido.', 'Ok', { duration: 2000 });
  }

  copyEmail(email: string): void {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(email).then(
        () => this.snack.open('Email copiado!', 'Ok', { duration: 1500 }),
        () => this.fallbackCopy(email)
      );
    } else {
      this.fallbackCopy(email);
    }
  }

  private fallbackCopy(text: string): void {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.snack.open('Email copiado!', 'Ok', { duration: 1500 });
    } catch {
      this.snack.open('Não foi possível copiar.', 'Ok', { duration: 2000 });
    }
  }

  // Helpers de UI
  get uniqueEmails(): number {
    const set = new Set(this.users.map(u => u.email.toLowerCase().trim()));
    return set.size;
  }

  get lastCreatedAt(): string | undefined {
    return this.users.length ? this.users[0].createdAt : undefined;
  }

  initials(u: User): string {
    const a = (u.firstName || '').trim().charAt(0).toUpperCase();
    const b = (u.lastName || '').trim().charAt(0).toUpperCase();
    return `${a}${b}` || 'U';
    }

  trackByUser = (_: number, u: User) => u.id;
}
