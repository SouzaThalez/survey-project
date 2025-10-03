import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamResults } from './exam-results';

describe('ExamResults', () => {
  let component: ExamResults;
  let fixture: ComponentFixture<ExamResults>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExamResults]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamResults);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
