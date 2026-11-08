
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  effect,
  HostListener
} from '@angular/core';

import {
  Router,
  RouterLink,
  NavigationEnd
} from '@angular/router';

import { filter, Subscription } from 'rxjs';

import { CartService } from '../../../features/cart/services/cart';
import { AuthService } from '../../../features/auth/services/auth';

import {
  ProfileService,
  UserProfile,
  ProfileResponse
} from '../../../features/profile/services/profile';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit, OnDestroy {
  cartService = inject(CartService);
  authService = inject(AuthService);

  private router = inject(Router);
  private profileService = inject(ProfileService);

  profileOpen = signal(false);
  mobileMenuOpen = signal(false);
  userFirstName = signal('');

  private notificationTimer?: ReturnType<typeof setTimeout>;
  private routerSubscription?: Subscription;

  constructor() {
    effect(() => {
      if (this.cartService.cartNotification()) {
        clearTimeout(this.notificationTimer);

        this.notificationTimer = setTimeout(() => {
          this.cartService.closeCartNotification();
        }, 3000);
      }
    });

    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.loadUserName();
      } else {
        this.userFirstName.set('');
        this.profileOpen.set(false);
        this.mobileMenuOpen.set(false);
      }
    });
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.cartService.loadCartCount();
    }

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMenus();
      });
  }

  loadUserName() {
    this.profileService.getProfile().subscribe({
      next: response => {
        const result = response as ProfileResponse;
        const profile =
          result.data ?? (response as UserProfile);

        this.userFirstName.set(profile?.firstName ?? '');
      },
      error: err => {
        console.error('Could not load user name:', err);
      }
    });
  }

  toggleProfile() {
    this.mobileMenuOpen.set(false);
    this.profileOpen.update(value => !value);

    if (this.profileOpen() && this.authService.isLoggedIn()) {
      this.loadUserName();
    }
  }

  toggleMobileMenu() {
    this.profileOpen.set(false);
    this.mobileMenuOpen.update(value => !value);
  }

  closeMenus() {
    this.profileOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenus();
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768) {
      this.mobileMenuOpen.set(false);
    }
  }

  logout() {
    this.authService.logout();
    this.cartService.cartCount.set(0);
    this.cartService.closeCartNotification();
    this.userFirstName.set('');
    this.closeMenus();

    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    clearTimeout(this.notificationTimer);
    this.routerSubscription?.unsubscribe();
  }
}
