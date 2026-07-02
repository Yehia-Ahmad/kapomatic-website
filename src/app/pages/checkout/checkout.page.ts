import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import { CartService } from '../../services/cart.service';
import { CheckoutService, GovernmentShipping, PaymentMethod } from '../../services/checkout.service';
import { GeneralSettingsService } from '../../services/general-settings.service';

type PaymentOption = {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: string;
};

type ToastState = {
  type: 'success' | 'error';
  message: string;
};

const PHONE_PATTERN = /^[0-9+()\-\s]{8,20}$/;
const IMAGE_DATA_PATTERN = /^data:image\/(png|jpe?g|webp);base64,/i;

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './checkout.page.html'
})
export class CheckoutPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly checkoutService = inject(CheckoutService);
  protected readonly generalSettings = inject(GeneralSettingsService);
  protected readonly cart = inject(CartService);

  protected readonly governments = signal<GovernmentShipping[]>([]);
  protected readonly freeShippingMinimum = computed(
    () => this.generalSettings.settings().freeShippingMinimumAmount
  );
  protected readonly loadingGovernments = signal(true);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly invoiceReference = signal('');
  protected readonly submittedPaymentMethod = signal<PaymentMethod>(PaymentMethod.Cash);
  protected readonly toast = signal<ToastState | null>(null);
  protected readonly PaymentMethod = PaymentMethod;
  protected readonly paymentOptions: PaymentOption[] = [
    {
      value: PaymentMethod.Cash,
      label: 'الدفع عند الاستلام',
      description: 'ادفع قيمة الطلب عند وصوله إليك',
      icon: 'fa-solid fa-money-bill-wave'
    },
    {
      value: PaymentMethod.EWallet,
      label: 'محفظة إلكترونية',
      description: 'حوّل المبلغ من محفظتك ثم أرسل بيانات التحويل',
      icon: 'fa-solid fa-wallet'
    },
    {
      value: PaymentMethod.InstaPay,
      label: 'تحويل InstaPay',
      description: 'حوّل عبر InstaPay ثم أرفق صورة التحويل',
      icon: 'fa-solid fa-building-columns'
    }
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(3)]],
    customerPhone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    government: ['', Validators.required],
    shippingLocation: ['', [Validators.required, Validators.minLength(5)]],
    paymentMethod: [PaymentMethod.Cash, Validators.required],
    transferPhone: ['', Validators.pattern(PHONE_PATTERN)],
    transferImage: ['']
  });

  protected readonly selectedGovernment = signal('');
  protected readonly selectedPaymentMethod = signal<PaymentMethod>(PaymentMethod.Cash);
  protected readonly successMessage = computed(() =>
    this.submittedPaymentMethod() === PaymentMethod.Cash
      ? 'Your order has been placed successfully.'
      : 'Your order has been received successfully. Your payment will be reviewed by our team before processing the order.'
  );
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
        },
        error: () => this.errorMessage.set('تعذر تحميل المحافظات. يرجى المحاولة مرة أخرى.')
      });

    this.form.controls.paymentMethod.valueChanges.subscribe((method) => {
      this.selectedPaymentMethod.set(method);
      this.applyPaymentValidators(method);
    });
  }

  protected onGovernmentChange(value: string) {
    this.selectedGovernment.set(value);
  }

  protected submit() {
    this.errorMessage.set('');
    this.toast.set(null);
    this.applyPaymentValidators(this.form.controls.paymentMethod.value);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showToast('error', 'يرجى إكمال البيانات المطلوبة.');
      return;
    }
    if (this.cart.items().length === 0) {
      this.errorMessage.set('سلة التسوق فارغة. أضف منتجات قبل إتمام الطلب.');
      this.showToast('error', 'سلة التسوق فارغة.');
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();
    const {
      customerName,
      customerPhone,
      government,
      shippingLocation,
      paymentMethod,
      transferPhone,
      transferImage
    } = value;
    this.checkoutService
      .checkout({
        customerName,
        customerPhone,
        government,
        shippingLocation,
        paymentMethod,
        products: this.cart.items().map((item) => ({
          productId: item.id,
          price: item.price,
          quantity: item.qty
        })),
        transferPhone: this.transferPhoneValue(paymentMethod, transferPhone),
        transferImage: this.transferImageValue(paymentMethod, transferImage)
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (result) => {
          this.invoiceReference.set(String(result.orderId || result.invoiceId || result._id || ''));
          this.submittedPaymentMethod.set(paymentMethod);
          this.submitted.set(true);
          this.cart.clear();
          this.showToast('success', 'تم استلام طلبك بنجاح.');
        },
        error: (error: HttpErrorResponse) => {
          const message = error.error?.message;
          this.errorMessage.set(
            typeof message === 'string' && message.trim()
              ? message
              : 'تعذر إتمام الطلب. تحقق من البيانات وحاول مرة أخرى.'
          );
          this.showToast('error', this.errorMessage());
        }
      });
  }

  protected invalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  protected onTransferImageChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const control = this.form.controls.transferImage;
    control.markAsTouched();

    if (!file) {
      control.setValue('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      control.setValue('');
      control.setErrors({ imageType: true });
      this.showToast('error', 'يرجى رفع صورة صحيحة لإثبات التحويل.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      control.setValue(result);
      control.updateValueAndValidity();
    };
    reader.onerror = () => {
      control.setValue('');
      control.setErrors({ readError: true });
      this.showToast('error', 'تعذر قراءة صورة التحويل. حاول رفع صورة أخرى.');
    };
    reader.readAsDataURL(file);
  }

  private applyPaymentValidators(method: PaymentMethod) {
    const transferPhone = this.form.controls.transferPhone;
    const transferImage = this.form.controls.transferImage;
    const manualPayment = method !== PaymentMethod.Cash;

    transferPhone.setValidators(
      manualPayment
        ? [Validators.required, Validators.pattern(PHONE_PATTERN)]
        : [Validators.pattern(PHONE_PATTERN)]
    );
    transferImage.setValidators(
      manualPayment
        ? [Validators.required, Validators.pattern(IMAGE_DATA_PATTERN)]
        : [Validators.pattern(IMAGE_DATA_PATTERN)]
    );

    transferPhone.updateValueAndValidity({ emitEvent: false });
    transferImage.updateValueAndValidity({ emitEvent: false });
  }

  private transferPhoneValue(method: PaymentMethod, transferPhone: string): string {
    return method === PaymentMethod.Cash ? '' : transferPhone.trim();
  }

  private transferImageValue(method: PaymentMethod, transferImage: string): string {
    return method === PaymentMethod.Cash ? '' : transferImage;
  }

  private showToast(type: ToastState['type'], message: string) {
    this.toast.set({ type, message });
  }
}
