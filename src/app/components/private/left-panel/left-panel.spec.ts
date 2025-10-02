import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftPanel } from './left-panel';

describe('LeftPanel', () => {
  let component: LeftPanel;
  let fixture: ComponentFixture<LeftPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LeftPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeftPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
