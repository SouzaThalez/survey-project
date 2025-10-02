import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewExam } from './new-exam';

describe('NewExam', () => {
  let component: NewExam;
  let fixture: ComponentFixture<NewExam>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NewExam]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewExam);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
