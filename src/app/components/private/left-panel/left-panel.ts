import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

type Session = {
  id: number;
  email: string;
  name?: string;
  role?: string;
};

@Component({
  selector: 'app-left-panel',
  standalone: false,
  templateUrl: './left-panel.html',
  styleUrls: ['./left-panel.scss']
})
export class LeftPanel implements OnInit, OnDestroy {
  private readonly COLLAPSE_KEY = 'leftPanelCollapsed';
  private readonly AUTH_KEY = 'authUser';
  private readonly LOGOUT_REDIRECT = '/login'; // ajuste aqui se sua rota de login for diferente

  private subs: Subscription[] = [];

  isHandset = false;   // true em telefones (overlay)
  isNarrow = false;    // true quando width <= 800px
  panelOpen = true;    // só relevante no handset overlay
  collapsed = false;   // recolhido (não-handset)

  user?: Session;

  constructor(
    private bp: BreakpointObserver,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Handset: usa overlay e inicia fechado
    this.subs.push(
      this.bp.observe([Breakpoints.Handset]).subscribe(state => {
        this.isHandset = state.matches;
        if (this.isHandset) {
          this.panelOpen = false; // overlay fechado por padrão
        }
      })
    );

    // Largura <= 800px: recolhe por padrão (se usuário não tiver preferência)
    this.subs.push(
      this.bp.observe(['(max-width: 800px)']).subscribe(state => {
        this.isNarrow = state.matches;

        const stored = localStorage.getItem(this.COLLAPSE_KEY);
        if (stored !== null) {
          // respeita a preferência do usuário
          this.collapsed = stored === 'true';
        } else {
          // sem preferência salva: padrão é recolher quando <= 800px
          this.collapsed = this.isNarrow;
        }
      })
    );

    this.loadSession();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadSession(): void {
    try {
      const raw = localStorage.getItem(this.AUTH_KEY);
      this.user = raw ? JSON.parse(raw) as Session : undefined;
    } catch {
      this.user = undefined;
    }
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    try {
      localStorage.setItem(this.COLLAPSE_KEY, String(this.collapsed));
    } catch { /* ignore */ }
  }

  logout(): void {
    try {
      localStorage.removeItem(this.AUTH_KEY);
    } catch { /* ignore */ }

    // Fecha overlay no mobile por consistência
    if (this.isHandset) this.panelOpen = false;

    // Redireciona para login
    this.router.navigate([this.LOGOUT_REDIRECT]);
  }
}
