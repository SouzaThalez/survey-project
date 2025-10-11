// src/app/services/exam.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ExamCreateDTO, ExamGroupCreateDTO } from '../models/dtos';

@Injectable({ providedIn: 'root' })
export class ExamService {
  private base = `${environment.apiUrl}/exams`;

  constructor(private http: HttpClient) {}

  // cria 1 prova
  createOne(dto: ExamCreateDTO): Observable<any> {
    return this.http.post<any>(this.base, dto);
  }

  // cria um grupo com N provas
  createGroup(dto: ExamGroupCreateDTO): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/exam-groups`, dto);
  }
}
