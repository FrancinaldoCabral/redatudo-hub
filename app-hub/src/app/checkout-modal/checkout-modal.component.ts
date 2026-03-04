import { Component, Input } from '@angular/core';
import { PaymentService, Breakdown } from '../payment.service';
import { loadStripe } from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-checkout-modal',
  templateUrl: './checkout-modal.component.html',
})
export class CheckoutModalComponent {
  credit = 10;
  loading = false;
  breakdown?: Breakdown;
  showDetails = false;

  constructor(private paymentService: PaymentService) {}

  displayPrice(): string {
    this.breakdown = this.paymentService.calculate(this.credit);
    return this.breakdown.priceWithTaxes.toLocaleString('en-US', {
      style: 'currency', currency: 'USD'
    });
  }

  async pay() {
    this.loading = true;
    try {
      await this.paymentService.createCheckout(this.credit);
      this.loading = false;
    } catch (err) {
      console.error(err);
      this.loading = false;
    }
  }
}
