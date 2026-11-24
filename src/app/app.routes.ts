import { Routes } from '@angular/router';

/**
 * One page; everything else is query params (?category=…&art=…).
 * Unknown paths (served via 404.html on GitHub Pages) fall back to the home page.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', children: [] },
  { path: '**', redirectTo: '' },
];
