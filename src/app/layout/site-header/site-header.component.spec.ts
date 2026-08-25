import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fallbackHeaderConfig } from '../../domains/header/header.normalizer';
import { SiteHeaderComponent } from './site-header.component';

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.componentRef.setInput('config', fallbackHeaderConfig('ar'));
    fixture.componentRef.setInput('navigation', []);
    fixture.detectChanges();
  });

  it('has a stable neutral logo fallback and named search/cart/menu controls', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('form[role="search"] input')?.getAttribute('type')).toBe('search');
    expect(element.querySelector('button[aria-haspopup="dialog"]')?.getAttribute('aria-label')).toBeTruthy();
    expect(element.querySelector('a[href="/ar/cart"]')?.getAttribute('aria-label')).toContain('0');
  });

  it('trims and normalizes whitespace before routing a search', () => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const input = fixture.nativeElement.querySelector('#site-search') as HTMLInputElement;
    input.value = '  transmission   oil  ';
    input.dispatchEvent(new Event('input'));
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(navigate).toHaveBeenCalledWith(['/', 'ar', 'search'], { queryParams: { q: 'transmission oil' } });
  });

  it('does not navigate for an empty search', () => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const input = fixture.nativeElement.querySelector('#site-search') as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(navigate).not.toHaveBeenCalled();
  });
});
