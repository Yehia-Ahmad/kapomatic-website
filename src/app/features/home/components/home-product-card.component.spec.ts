import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartStore } from '../../../domains/cart/cart.store';
import { HomeProduct } from '../../../domains/home/home.models';
import { DEFAULT_STOREFRONT_SETTINGS } from '../../../domains/settings/settings.models';
import { StorefrontSettingsStore } from '../../../domains/settings/storefront-settings.store';
import { HomeProductCardComponent } from './home-product-card.component';

describe('HomeProductCardComponent', () => {
  let fixture: ComponentFixture<HomeProductCardComponent>;
  const add = jasmine.createSpy('add');
  const announce = jasmine.createSpy('announce');

  const product = (availability: HomeProduct['availability']): HomeProduct => ({
    kind: 'product',
    id: 'product-1',
    categoryId: 'category-1',
    name: 'Transmission filter',
    code: 'KAP-1',
    slug: 'transmission-filter',
    alternateSlugs: { ar: 'فلتر-فتيس', en: 'transmission-filter' },
    imageUrl: '',
    imageAlt: 'Transmission filter',
    price: { regular: 100, sale: null, discountPercentage: 0 },
    availability,
    availableQuantity: availability === 'in-stock' ? 2 : 0
  });

  beforeEach(async () => {
    add.calls.reset();
    announce.calls.reset();
    add.and.returnValue(true);
    await TestBed.configureTestingModule({
      imports: [HomeProductCardComponent],
      providers: [
        provideRouter([]),
        { provide: CartStore, useValue: { add, announce } },
        {
          provide: StorefrontSettingsStore,
          useValue: { settings: signal(DEFAULT_STOREFRONT_SETTINGS) }
        }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HomeProductCardComponent);
  });

  it('disables the single cart action for an out-of-stock product', () => {
    fixture.componentRef.setInput('product', product('out-of-stock'));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
    button.click();
    expect(add).not.toHaveBeenCalled();
  });

  it('adds an in-stock normalized product and announces success', () => {
    fixture.componentRef.setInput('product', product('in-stock'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(add).toHaveBeenCalledWith(
      'product-1',
      jasmine.objectContaining({ name: 'Transmission filter', unitPrice: 100 }),
      jasmine.objectContaining({ availability: 'in-stock', maximumQuantity: 2 })
    );
    expect(announce).toHaveBeenCalled();
  });
});
