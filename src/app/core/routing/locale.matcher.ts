import { UrlMatcher, UrlSegment } from '@angular/router';

export const localeMatcher: UrlMatcher = (segments) => {
  const locale = segments[0]?.path;
  if (locale !== 'ar' && locale !== 'en') return null;

  return {
    consumed: [segments[0] as UrlSegment],
    posParams: { lang: segments[0] as UrlSegment }
  };
};
