import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

type StoredUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'Professor' | 'Admin';
  createdAt: string;
};

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  private readonly USERS_KEY = 'usersStore';
  private readonly AUTH_KEY = 'authUser';
  private readonly REMEMBER_KEY = 'rememberEmail';

  loading = false;
  showPass = false;

  form!: FormGroup<{
    email: FormControl<string>;
    password: FormControl<string>;
    remember: FormControl<boolean>;
  }>;

  constructor(
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private router: Router
  ) {
    this.form = this.fb.nonNullable.group({
      email: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.email]
      }),
      password: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.minLength(6)]
      }),
      remember: this.fb.nonNullable.control(true)
    });
  }

  ngOnInit(): void {
    // Se já logado, envia para área privada
    const auth = localStorage.getItem(this.AUTH_KEY);
    if (auth) {
      this.router.navigate(['/private']);
      return;
    }

    // Preenche email lembrado (se existir)
    const remembered = localStorage.getItem(this.REMEMBER_KEY);
    if (remembered) {
      this.form.controls.email.setValue(remembered);
    }
  }

  signIn(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, remember } = this.form.getRawValue();
    this.loading = true;

    try {
      const raw = localStorage.getItem(this.USERS_KEY);
      const users: StoredUser[] = raw ? JSON.parse(raw) : [];

      const found = users.find(u =>
        u.email?.toLowerCase().trim() === email.toLowerCase().trim() &&
        u.password === password
      );

      if (!found) {
        this.snack.open('Credenciais inválidas.', 'Ok', { duration: 2000 });
        return;
      }

      // Salva sessão simples
      const session = {
        id: found.id,
        email: found.email,
        name: `${found.firstName} ${found.lastName}`.trim(),
        role: found.role
      };
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(session));

      // Lembrar email
      if (remember) {
        localStorage.setItem(this.REMEMBER_KEY, found.email);
      } else {
        localStorage.removeItem(this.REMEMBER_KEY);
      }

      this.snack.open('Login realizado!', 'Ok', { duration: 1200 });
      this.router.navigate(['/private']);
    } catch {
      this.snack.open('Erro ao ler usuários locais.', 'Ok', { duration: 2000 });
    } finally {
      this.loading = false;
    }
  }

  goToUsers(): void {
    this.router.navigate(['/private/painel-usuario']);
  }
}
