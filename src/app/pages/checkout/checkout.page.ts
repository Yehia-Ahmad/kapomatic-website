import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import { CartService } from '../../services/cart.service';
import { CheckoutService, GovernmentShipping } from '../../services/checkout.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './checkout.page.html'
})
export class CheckoutPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly checkoutService = inject(CheckoutService);
  protected readonly cart = inject(CartService);

  protected readonly governments = signal<GovernmentShipping[]>([]);
  protected readonly freeShippingMinimum = signal<number | null>(null);
  protected readonly loadingGovernments = signal(true);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly invoiceReference = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(3)]],
    customerPhone: ['', [Validators.required, Validators.pattern(/^[0-9+()\-\s]{8,20}$/)]],
    government: ['', Validators.required],
    shippingLocation: ['', [Validators.required, Validators.minLength(5)]]
  });

  protected readonly selectedGovernment = signal('');
  protected readonly shippingFee = computed(() => {
    const minimum = this.freeShippingMinimum();
    if (minimum !== null && minimum > 0 && this.cart.subtotal() >= minimum) return 0;
    return this.governments().find((item) => item.name === this.selectedGovernment())?.fee ?? 0;
  });
  protected readonly total = computed(() => this.cart.subtotal() + this.shippingFee());

  constructor() {
    this.checkoutService
      .getShippingSettings()
      .pipe(finalize(() => this.loadingGovernments.set(false)))
      .subscribe({
        next: (settings) => {
          this.governments.set(settings.governments);
          this.freeShippingMinimum.set(settings.freeShippingMinimum);
        },
        error: () => this.errorMessage.set('تعذر تحميل المحافظات. يرجى المحاولة مرة أخرى.')
      });
  }

  protected onGovernmentChange(value: string) {
    this.selectedGovernment.set(value);
  }

  protected submit() {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.cart.items().length === 0) {
      this.errorMessage.set('سلة التسوق فارغة. أضف منتجات قبل إتمام الطلب.');
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.checkoutService
      .checkout({
        ...value,
        products: this.cart.items().map((item) => ({
          productId: item.id,
          price: item.price,
          quantity: item.qty
        }))
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (result) => {
          this.invoiceReference.set(String(result.invoiceId || result._id || ''));
          this.submitted.set(true);
          this.cart.clear();
        },
        error: (error: HttpErrorResponse) => {
          const message = error.error?.message;
          this.errorMessage.set(
            typeof message === 'string' && message.trim()
              ? message
              : 'تعذر إتمام الطلب. تحقق من البيانات وحاول مرة أخرى.'
          );
        }
      });
  }

  protected invalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}
