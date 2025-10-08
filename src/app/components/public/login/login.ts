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
  // Pode vir como 'Professor' | 'Admin' ou 'Professor' | 'admin' (vamos normalizar)
  role?: string;
  createdAt: string;
};

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrls: ['./login.scss'] // <- cuidado: use styleUrls (plural)
})
export class Login implements OnInit {
  // Tenta ambas as chaves, na ordem (users = usada no seu UserPanel atual)
  private readonly USERS_KEYS = ['users', 'usersStore'];
  private readonly AUTH_KEY = 'authUser';

  loading = false;
  showPass = false;

  form!: FormGroup<{
    email: FormControl<string>;
    password: FormControl<string>;
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
      })
    });
  }

  ngOnInit(): void {
    // Se já logado, envia para área privada
    const auth = localStorage.getItem(this.AUTH_KEY);
    if (auth) {
      this.router.navigate(['/private']);
      return;
    }
  }

  private readUsers(): StoredUser[] {
    const out: StoredUser[] = [];
    for (const key of this.USERS_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          out.push(...arr);
        }
      } catch {
        // ignora parse inválido
      }
    }

    // Remove duplicados por email (caso existam nas duas chaves)
    const seen = new Set<string>();
    const dedup = out.filter(u => {
      const email = (u.email || '').toLowerCase().trim();
      if (!email || seen.has(email)) return false;
      seen.add(email);
      return true;
    });

    // Normaliza role (Admin/Professor)
    return dedup.map(u => ({
      ...u,
      role: (u.role || '').toLowerCase() === 'admin' ? 'Admin' : 'Professor'
    }));
  }

  signIn(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    const emailNorm = (email || '').toLowerCase().trim();
    this.loading = true;

    try {
      const users = this.readUsers();
     

      if (!users.length) {
        this.snack.open('Nenhum usuário cadastrado. Crie um no Painel de Usuários.', 'Ok', { duration: 2500 });
        return;
      }

      const found = users.find(u =>
        (u.email || '').toLowerCase().trim() === emailNorm &&
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
        name: `${found.firstName || ''} ${found.lastName || ''}`.trim(),
        role: found.role || 'Professor'
      };

      localStorage.setItem(this.AUTH_KEY, JSON.stringify(session));

      this.snack.open('Login realizado!', 'Ok', { duration: 1200 });
      this.router.navigate(['/private/nova-prova']);
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
