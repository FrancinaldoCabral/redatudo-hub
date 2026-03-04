// src/app/services/payment.service.ts
import { Injectable } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';
import env from './services/env';
import { Observable } from 'rxjs';

export interface Breakdown {
  credit: number;
  iofRate: number;
  feeRate: number;
  fixedFee: number;
  marginRate: number;
  taxRate: number;
  priceNet: number;      // P_eq
  priceGross: number;    // finalPrice antes de impostos
  priceWithTaxes: number;// finalPrice + impostos
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private stripePromise: Promise<Stripe | null>;
  // Parâmetros fixos (pode vir de env ou endpoint)
  readonly iofRate = 0.0638;
  readonly feeRate = 0.0399;
  readonly fixedFee = 0.39;
  readonly marginRate = 0.02;
  readonly taxRate = 0.325; // 32.5%

  constructor(private http: HttpClient) {
    this.stripePromise = loadStripe(env.stripePublicKey);
  }

  /** Calcula o breakdown completo para N créditos */
  calculate(credit: number): Breakdown {
    const N = credit;
    // Preço de equilíbrio
    const priceNet = (N + this.fixedFee * (1 - this.feeRate))
                     / (1 - this.feeRate - this.iofRate);
    // Preço bruto (com margem)
    const priceGross = priceNet * (1 + this.marginRate);
    // Preço final incluindo impostos
    const priceWithTaxes = priceGross * (1 + this.taxRate);

    return {
      credit: N,
      iofRate: this.iofRate,
      feeRate: this.feeRate,
      fixedFee: this.fixedFee,
      marginRate: this.marginRate,
      taxRate: this.taxRate,
      priceNet,
      priceGross,
      priceWithTaxes
    };
  }

  /** Chama seu backend para criar um Checkout Session no Stripe */
  async createCheckout(credit: number) {
    const breakdown = this.calculate(credit);
    // envia para o servidor criar session
    this.http.post(`${env.apiHost}/payment/create-checkout-session`, {
      credit,
      amount: Math.round(breakdown.priceWithTaxes * 100) // em cents
    }).subscribe(
      async (sessionId:any) => {
        const stripe = await this.stripePromise;
        if (!stripe) throw new Error('Stripe não inicializado');
    
        // redireciona para o checkout
        await stripe.redirectToCheckout(sessionId);
      }
    )
  }

  checkSessionId(sessionId: string): Observable<any>{
    return this.http.get(`${env.apiHost}/payment/checkout-session/${sessionId}`)
  }
}
