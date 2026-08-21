import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: ':lang/products/:slug',
    renderMode: RenderMode.Server
  },
  {
    path: ':lang/categories/:slug',
    renderMode: RenderMode.Server
  },
  {
    path: ':lang/search',
    renderMode: RenderMode.Server
  },
  {
    path: 'products/:id',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
