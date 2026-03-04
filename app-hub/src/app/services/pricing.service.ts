import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import env from './env';

export interface PricingProduct {
  id: number;
  product_type: string;
  price: string;
  promotional_price: string | null;
  credito: number;
  description: string;
}

export interface PricingData {
  subscriptions: PricingProduct[];
  credits: PricingProduct[];
}

@Injectable({
  providedIn: 'root'
})
export class PricingService {
  private apiUrl = `${env.apiHost}/api/pricing/products`;

  constructor(private http: HttpClient) {}

  getPricingData(): Observable<PricingData> {
    return this.http.get<PricingData>(this.apiUrl);
  }
}
