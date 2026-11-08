
import { Routes } from '@angular/router';

import { Home } from './features/home/home';
import { Menu } from './features/menu/menu';
import { Cart } from './features/cart/cart';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Profile } from './features/profile/profile';
import { ForgotPassword } from './features/auth/forgot-password/forgot-password';
import { ResetPassword } from './features/auth/reset-password/reset-password';
import { VerifyEmail } from './features/auth/verify-email/verify-email';
import { ProductDetails } from './features/product-details/product-details';
import { ProductManagement } from './features/product-management/product-management';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'menu', component: Menu },
  { path: 'product', component: ProductDetails },
  { path: 'cart', component: Cart },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
  { path: 'auth/reset-password', component: ResetPassword },
  { path: 'verify-email', component: VerifyEmail },
  {
    path: 'manage-products',
    component: ProductManagement,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];
