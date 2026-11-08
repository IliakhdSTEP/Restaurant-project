
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, switchMap } from 'rxjs';

import {
  CartService,
  CartItem,
  CartResponse,
  CartActionResponse
} from './services/cart';

import { AuthService } from '../auth/services/auth';

@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.scss'
})
export class Cart implements OnInit {
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);

  items = signal<CartItem[]>([]);
  apiTotal = signal<number | null>(null);

  loading = signal(true);
  processing = signal(false);
  checkoutLoading = signal(false);
  checkoutCompleted = signal(false);

  error = signal('');
  successMessage = signal('');

  totalItems = computed(() =>
    this.items().reduce(
      (total, item) => total + item.quantity,
      0
    )
  );

  subtotal = computed(() =>
    this.items().reduce(
      (total, item) =>
        total + item.product.price * item.quantity,
      0
    )
  );

  total = computed(() =>
    this.apiTotal() ?? this.subtotal()
  );

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadCart();
  }

  private updateCart(response: CartResponse) {
    this.items.set(response.data?.items ?? []);
    this.apiTotal.set(response.data?.totalPrice ?? null);
  }

  loadCart() {
    this.loading.set(true);
    this.error.set('');

    this.cartService.getCart()
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: response => {
          this.updateCart(response);
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err, 'Could not load your cart.');
        }
      });
  }

  changeQuantity(item: CartItem, change: number) {
    if (
      this.processing() ||
      this.checkoutLoading() ||
      this.checkoutCompleted()
    ) {
      return;
    }

    const newQuantity = item.quantity + change;

    if (newQuantity < 1) return;

    this.processing.set(true);
    this.error.set('');

    this.cartService.editQuantity(item.id, newQuantity)
      .pipe(
        switchMap(response => {
          if (response?.isSuccess === false) {
            throw new Error(
              response.message || 'Could not update quantity.'
            );
          }

          return this.cartService.getCart();
        }),
        finalize(() => this.processing.set(false))
      )
      .subscribe({
        next: response => {
          this.updateCart(response);
        },
        error: err => {
          this.handleError(err, 'Could not update quantity.');
        }
      });
  }

  removeItem(item: CartItem) {
    if (
      this.processing() ||
      this.checkoutLoading() ||
      this.checkoutCompleted()
    ) {
      return;
    }

    this.processing.set(true);
    this.error.set('');

    this.cartService.removeFromCart(item.id)
      .pipe(
        switchMap(response => {
          if (response?.isSuccess === false) {
            throw new Error(
              response.message || 'Could not remove product.'
            );
          }

          return this.cartService.getCart();
        }),
        finalize(() => this.processing.set(false))
      )
      .subscribe({
        next: response => {
          this.updateCart(response);
        },
        error: err => {
          this.handleError(err, 'Could not remove product.');
        }
      });
  }

  checkout() {
    if (
      this.checkoutLoading() ||
      this.checkoutCompleted() ||
      this.processing() ||
      this.loading() ||
      this.items().length === 0
    ) {
      return;
    }

    this.checkoutLoading.set(true);
    this.error.set('');
    this.successMessage.set('');

    this.cartService.checkout().subscribe({
      next: (response: CartActionResponse) => {
        this.checkoutLoading.set(false);

        if (response?.isSuccess === false) {
          this.error.set(
            response.message || 'Checkout failed.'
          );
          return;
        }

        this.checkoutCompleted.set(true);

        this.successMessage.set(
          'Thank you for your purchase! Your order has been placed and is being processed.'
        );

        this.cartService.getCart().subscribe({
          next: cartResponse => {
            this.updateCart(cartResponse);
          },
          error: (err: HttpErrorResponse) => {
            console.error('Cart refresh error:', err);
            this.items.set([]);
            this.apiTotal.set(null);
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.checkoutLoading.set(false);

        if (err.status === 0 || err.status >= 500) {
          console.error('Checkout status uncertain:', err);
          this.error.set(
            'Could not confirm whether your order was placed. Please check your cart before trying again.'
          );
          return;
        }

        this.handleError(
          err,
          'Checkout failed. Please try again.'
        );
      }
    });
  }

  closeMessage() {
    this.successMessage.set('');
  }

  private handleError(
    err: HttpErrorResponse | Error,
    fallback: string
  ) {
    console.error('Cart error:', err);

    if (
      err instanceof HttpErrorResponse &&
      err.status === 401
    ) {
      this.authService.logout();
      this.router.navigate(['/login']);
      return;
    }

    this.error.set(
      err instanceof HttpErrorResponse
        ? fallback
        : err.message || fallback
    );
  }
}
