import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Private } from './private';

describe('Private', () => {
  let component: Private;
  let fixture: ComponentFixture<Private>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Private]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Private);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
