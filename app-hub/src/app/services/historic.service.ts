import { Injectable } from '@angular/core';
import env from './env';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class HistoricService {
  apiUrl: string = env.apiHost
  constructor(private http: HttpClient, private authService: AuthService) { }

  getHistoric(offset:number, limit:number): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/historic?offset=${offset}&limit=${limit}`)
  }

  getBalance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/balance`)
  }

  getDetailedBalance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/balance/detailed`)
  }

  getUserHistoric(id:string, offset:number, limit:number): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/historic-system/${id}?offset=${offset}&limit=${limit}`)
  }

  getUserBalance(id:string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/balance-system/${id}`)
  }

  getUserByEmail(email:string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/user-by-email`, { email })
  }

  setUserBalance(id:string, balance:any, description:string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/balance-system/${id}`, { balance, description })
  }
}
