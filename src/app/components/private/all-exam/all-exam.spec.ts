import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllExam } from './all-exam';

describe('AllExam', () => {
  let component: AllExam;
  let fixture: ComponentFixture<AllExam>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AllExam]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllExam);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
