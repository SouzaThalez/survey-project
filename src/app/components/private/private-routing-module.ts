import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Private } from './private';
import { NewExam } from './new-exam/new-exam';
import { AllExam } from './all-exam/all-exam';
import { AnswerExam } from './answer-exam/answer-exam';
import { ExamResults } from './exam-results/exam-results';

const routes: Routes = [
  {
    path:'',
    component: Private,
    children:[
      {
        path:'nova-prova',
        component: NewExam
      },
      {
        path: 'responder-prova',
        component: AnswerExam
      },
      {
        path:'todas-prova',
        component: AllExam
      },
      { 
        path: 'resultado-prova', 
        component: ExamResults 
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PrivateRoutingModule { }
