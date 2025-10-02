import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PrivateRoutingModule } from './private-routing-module';
import { Private } from './private';
import { LeftPanel } from './left-panel/left-panel';
import { NewExam } from './new-exam/new-exam';
import { AllExam } from './all-exam/all-exam';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AnswerExam } from './answer-exam/answer-exam';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';


@NgModule({
  declarations: [
    Private,
    LeftPanel,
    NewExam,
    AllExam,
    AnswerExam
  ],
  imports: [
    CommonModule,
    PrivateRoutingModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    MatDividerModule,
    ReactiveFormsModule,
    MatRadioModule
  ]
})
export class PrivateModule { }
