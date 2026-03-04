import { Injectable } from '@angular/core';
import env from './env';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  apiUrl: string = env.apiHost
  private confirmed = new BehaviorSubject<boolean>(false)

  constructor(private http: HttpClient) { }

  getConfirmedAsObservable(): Observable<boolean>{
    return this.confirmed.asObservable()
  }

  setConfirmed(confirmed: boolean): void {
    this.confirmed.next(confirmed)
  }

  codeVerify(code:string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/code-verify`, { code })
  }

  emailResend(): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/resend-email`, {})
  }
}
