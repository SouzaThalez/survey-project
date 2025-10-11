import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User as AppUser } from '../../../models/user';              
import { userRoleType } from '../../../enums/userRoles';

/** Vamos guardar o createdAt junto do usuário, sem mudar sua model */
type StoredUser = AppUser & { createdAt: string };

type UserForm = FormGroup<{
  firstName: FormControl<string | null>;        
  lastName: FormControl<string | null>;
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  role: FormControl<userRoleType | null>;   // usa seu enum
  image: FormControl<string | null>;
}>;

/** Normaliza valores antigos do storage (ADMIN/PROFESSOR etc.) para o seu enum */
function normalizeRole(value: any): userRoleType {
  const v = String(value ?? '').toLowerCase();
  if (['admin', 'administrador', 'administrator', 'adm'].includes(v)) {
    return userRoleType.admin;
  }
  return userRoleType.professor;
}

@Component({
  selector: 'app-user-panel',
  standalone: false,
  templateUrl: './user-panel.html',
  styleUrls: ['./user-panel.scss']
})
export class UserPanel implements OnInit {
  private readonly STORAGE_KEY = 'users';

  form!: UserForm;
  users: StoredUser[] = [];
  showPass = false;

  // Exibimos rótulo amigável, mas o value é do seu enum (string 'administrador' | 'professor')
  roles = [
    { value: userRoleType.professor, label: 'Professor' },
    { value: userRoleType.admin,     label: 'Administrador' },
  ];

  constructor(private fb: FormBuilder, private snack: MatSnackBar) {
    this.form = this.fb.nonNullable.group({
      firstName: this.fb.control<string | null>(null, [Validators.required, Validators.minLength(2)]),
      lastName: this.fb.control<string | null>(null, [Validators.required, Validators.minLength(2)]),
      email: this.fb.control<string | null>(null, [Validators.required, Validators.email]),
      password: this.fb.control<string | null>(null, [Validators.required, Validators.minLength(6)]),
      role: this.fb.control<userRoleType | null>(null, [Validators.required]),
      image: this.fb.control<string | null>(''),
    }) as UserForm;
  }

  ngOnInit(): void {
    this.load();
  }

  // ===== Storage =====
  private load(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const parsed: any[] = raw ? JSON.parse(raw) : [];
      this.users = parsed.map((u) => {
        const model = new AppUser({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          password: u.password ?? '',
          role: normalizeRole(u.role),         
          image: u.image ?? '',
        } as AppUser);
        return Object.assign(model, { createdAt: u.createdAt ?? new Date().toISOString() }) as StoredUser;
      });
    } catch {
      this.users = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.users));
    } catch { /* ignore */ }
  }

  // ===== Ações =====
  createUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Revise os campos obrigatórios.', 'Ok', { duration: 2500 });
      return;
    }

    const v = this.form.getRawValue();

    const newModel = new AppUser({
      id: Date.now(),
      firstName: (v.firstName ?? '').trim(),
      lastName: (v.lastName ?? '').trim(),
      email: (v.email ?? '').trim().toLowerCase(),
      password: v.password ?? '',
      role: (v.role ?? userRoleType.professor),   
      image: v.image ?? '',
    } as AppUser);

    const stored: StoredUser = Object.assign(newModel, { createdAt: new Date().toISOString() });
    this.users.unshift(stored);
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
      const ok = window.prompt('Copie o e-mail:', email) !== null;
      if (ok) this.snack.open('E-mail copiado!', 'Ok', { duration: 1500 });
    }
  }

  // ===== Helpers / stats =====
  get uniqueEmails(): number {
    return new Set(this.users.map(u => u.email)).size;
  }

  get lastCreatedAt(): string | null {
    if (!this.users.length) return null;
    return this.users[0].createdAt;
  }

  get professoresCount(): number {
    return this.users.filter(u => u.role === userRoleType.professor).length;
  }

  get adminsCount(): number {
    return this.users.filter(u => u.role === userRoleType.admin).length;
  }

  initials(u: AppUser): string {
    const a = (u.firstName || '').trim().charAt(0).toUpperCase();
    const b = (u.lastName || '').trim().charAt(0).toUpperCase();
    return (a + b) || 'U';
  }

  trackByUser = (_: number, u: StoredUser) => u.id;
}
