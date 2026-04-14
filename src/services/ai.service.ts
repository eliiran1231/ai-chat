import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = 'http://localhost:1234/v1/chat/completions';

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<any> {
    return this.http.post(this.apiUrl, {
      model: 'google/gemma-3-4b', // name shown in LM Studio
      messages: [
        { role: 'user', content: message }
      ],
      temperature: 0.7
    });
  }
}