import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeCategoryCardComponent } from './home-category-card.component';

describe('HomeCategoryCardComponent', () => {
  let fixture: ComponentFixture<HomeCategoryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeCategoryCardComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(HomeCategoryCardComponent);
  });

  it('renders the whole card as a localized semantic Category link', () => {
    fixture.componentRef.setInput('category', {
      id: 'category-1',
      name: 'Transmission Filters',
      imageUrl: null,
      imageAlt: 'Transmission Filters',
      activeSlug: 'transmission-filters',
      localizedSlugs: { ar: 'فلاتر-فتيس', en: 'transmission-filters' },
      productsCount: 24
    });
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/ar/categories/transmission-filters');
    expect(link.textContent).toContain('Transmission Filters');
    expect(link.textContent).toContain('24');
  });

  it('does not create a broken link when the backend has no slug', () => {
    fixture.componentRef.setInput('category', {
      id: 'category-1',
      name: 'Transmission Filters',
      imageUrl: null,
      imageAlt: 'Transmission Filters',
      activeSlug: '',
      localizedSlugs: {},
      productsCount: 0
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.querySelector('article')).not.toBeNull();
  });

  it('keeps an accessible link name when the Category-name setting hides the heading', () => {
    fixture.componentRef.setInput('category', {
      id: 'category-1',
      name: 'Transmission Filters',
      imageUrl: null,
      imageAlt: 'Transmission Filters',
      activeSlug: 'transmission-filters',
      localizedSlugs: { en: 'transmission-filters' },
      productsCount: 1
    });
    fixture.componentRef.setInput('showCategoryName', false);
    fixture.componentRef.setInput('imageShape', 'circle');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('aria-label')).toContain('Transmission Filters');
    expect(link.querySelector('h3')).toBeNull();
    expect(link.querySelector('.rounded-full')).not.toBeNull();
  });
});
