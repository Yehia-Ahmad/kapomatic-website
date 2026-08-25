import { UrlSegment } from '@angular/router';
import { localeMatcher } from './locale.matcher';

describe('localeMatcher', () => {
  it('matches only Arabic and English locale segments', () => {
    expect(localeMatcher([new UrlSegment('ar', {})], null as never, null as never)?.consumed.length).toBe(1);
    expect(localeMatcher([new UrlSegment('en', {})], null as never, null as never)?.consumed.length).toBe(1);
    expect(localeMatcher([new UrlSegment('fr', {})], null as never, null as never)).toBeNull();
    expect(localeMatcher([new UrlSegment('products', {})], null as never, null as never)).toBeNull();
  });

  it('exposes the locale as the lang positional parameter', () => {
    const result = localeMatcher([new UrlSegment('ar', {})], null as never, null as never);
    expect(result?.posParams?.['lang']?.path).toBe('ar');
  });
});
