import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component').then(c => c.HomeComponent),
    title: 'WardConnect - Home'
  },
  {
    path: 'my-bill',
    loadComponent: () => import('./pages/my-bill/my-bill.component').then(c => c.MyBillComponent),
    title: 'WardConnect - My Bill'
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(c => c.AboutComponent),
    title: 'WardConnect - About Us'
  },
  {
    path: 'support',
    loadComponent: () => import('./pages/support/support.component').then(c => c.SupportComponent),
    title: 'WardConnect - Support'
  },
  {
    path: 'utility/electricitybill',
    loadComponent: () => import('./pages/utility-bill/utility-bill.component').then(c => c.UtilityBillComponent),
    data: { utilityType: 'Electricity' },
    title: 'WardConnect - Electricity Bill'
  },
  {
    path: 'utility/waterbill',
    loadComponent: () => import('./pages/utility-bill/utility-bill.component').then(c => c.UtilityBillComponent),
    data: { utilityType: 'Water' },
    title: 'WardConnect - Water Bill'
  },
  {
    path: 'utility/gasbooking',
    loadComponent: () => import('./pages/gas-booking/gas-booking.component').then(c => c.GasBookingComponent),
    title: 'WardConnect - Gas Booking'
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
