import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-left-panel',
  standalone: false,
  templateUrl: './left-panel.html',
  styleUrls: ['./left-panel.scss']
})
export class LeftPanel implements OnInit, OnDestroy {
  private readonly COLLAPSE_KEY = 'leftPanelCollapsed';
  private subs: Subscription[] = [];

  isHandset = false;   // true em telefones (overlay)
  isNarrow = false;    // true quando width <= 800px
  panelOpen = true;    // só relevante no handset overlay
  collapsed = false;   // recolhido (não-handset)

  constructor(private bp: BreakpointObserver) {}

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
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    try {
      localStorage.setItem(this.COLLAPSE_KEY, String(this.collapsed));
    } catch { /* ignore */ }
  }
}
