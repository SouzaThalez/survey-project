import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-left-panel',
  standalone: false,
  templateUrl: './left-panel.html',
   styleUrls: ['./left-panel.scss'] 
})
export class LeftPanel {
   isHandset = false;
  panelOpen = true; // desktop: abre; mobile: fecha (ajustado no ngOnInit)

  private sub?: Subscription;

  constructor(private bp: BreakpointObserver) {}

  ngOnInit(): void {
    this.sub = this.bp.observe([Breakpoints.Handset]).subscribe(state => {
      this.isHandset = state.matches;
      // comportamento: no mobile inicia fechado; no desktop aberto
      this.panelOpen = this.isHandset ? false : true;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
  }

  // Fecha ao clicar no conteúdo/scrim quando estiver no mobile
  closeOnHandset(): void {
    if (this.isHandset && this.panelOpen) {
      this.panelOpen = false;
    }
  }
}
