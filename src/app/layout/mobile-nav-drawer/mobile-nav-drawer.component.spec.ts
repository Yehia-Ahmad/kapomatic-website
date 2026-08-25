import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LocaleService } from '../../core/i18n/locale.service';
import { MobileNavDrawerComponent } from './mobile-nav-drawer.component';

describe('MobileNavDrawerComponent', () => {
  let fixture: ComponentFixture<MobileNavDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileNavDrawerComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(MobileNavDrawerComponent);
    fixture.componentRef.setInput('navigation', []);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('opens as a named modal, focuses close, and locks body scrolling', () => {
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('[role="dialog"]');
    const close = element.querySelector('aside button') as HTMLButtonElement;
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(close);
    expect(document.body.style.overflow).toBe('hidden');
    expect(element.querySelector('aside > div:last-child button[aria-label]')).not.toBeNull();
  });

  it('closes on Escape', () => {
    const closeRequested = spyOn(fixture.componentInstance.closeRequested, 'emit');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closeRequested).toHaveBeenCalled();
  });

  it('keeps locale switching available inside the modal', () => {
    const locale = TestBed.inject(LocaleService);
    const switchLocale = spyOn(locale, 'switchLocale').and.resolveTo(true);
    const closeRequested = spyOn(fixture.componentInstance.closeRequested, 'emit');
    (fixture.nativeElement.querySelector('aside > div:last-child button') as HTMLButtonElement).click();

    expect(switchLocale).toHaveBeenCalledWith('en');
    expect(closeRequested).toHaveBeenCalled();
  });
});
