import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnswerExam } from './answer-exam';

describe('AnswerExam', () => {
  let component: AnswerExam;
  let fixture: ComponentFixture<AnswerExam>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnswerExam]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnswerExam);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
