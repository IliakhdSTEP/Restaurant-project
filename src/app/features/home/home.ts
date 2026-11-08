
import {
  Component,
  inject,
  OnInit,
  signal,
  ChangeDetectorRef
} from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import {
  Restaurant,
  Product
} from '../../shared/services/restaurant';

import { CartService } from '../cart/services/cart';
import { AuthService } from '../auth/services/auth';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  private restaurant = inject(Restaurant);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  popularDishes = signal<Product[]>([]);
  loading = signal(true);
  error = signal('');

  addingProductIds = signal<number[]>([]);
  cartMessage = signal('');

  ngOnInit() {
    this.restaurant.getProducts(6, 1).subscribe({
      next: response => {
        this.popularDishes.set(response.data?.products ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Failed to load products:', err);
        this.error.set('Could not load products.');
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  addToCart(dish: Product) {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.addingProductIds().includes(dish.id)) {
      return;
    }

    this.cartMessage.set('');

    this.addingProductIds.update(ids => [
      ...ids,
      dish.id
    ]);

    this.cartService.addToCart(dish.id, 1).subscribe({
      next: () => {
        this.cartMessage.set(
          `${dish.name} added to cart!`
        );

        this.addingProductIds.update(ids =>
          ids.filter(id => id !== dish.id)
        );

        this.cdr.markForCheck();
      },

      error: (err: HttpErrorResponse) => {
        console.error('Add to cart error:', err);

        if (err.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        } else {
          this.cartMessage.set(
            'Could not add product to cart.'
          );
        }

        this.addingProductIds.update(ids =>
          ids.filter(id => id !== dish.id)
        );

        this.cdr.markForCheck();
      }
    });
  }
}
