
import {
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  switchMap,
  finalize,
  forkJoin,
  catchError,
  of,
  map
} from 'rxjs';

import {
  Restaurant,
  Product
} from '../../shared/services/restaurant';
import { CartService } from '../cart/services/cart';
import { AuthService } from '../auth/services/auth';

interface DetailedProduct extends Product {
  vegeterian?: boolean;
  method?: string;
  ingredients?: string[];
}

@Component({
  selector: 'app-product-details',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss'
})
export class ProductDetails {
  private restaurant = inject(Restaurant);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  product = signal<DetailedProduct | null>(null);
  recommendations = signal<Product[]>([]);
  quantity = signal(1);
  loading = signal(true);
  adding = signal(false);
  error = signal('');
  message = signal('');

  constructor() {
    this.route.queryParamMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));

        this.loading.set(true);
        this.error.set('');
        this.message.set('');
        this.product.set(null);
        this.recommendations.set([]);
        this.quantity.set(1);

        if (!Number.isInteger(id) || id <= 0) {
          this.error.set('Invalid product ID.');
          this.loading.set(false);
          return of(null);
        }

        return forkJoin({
          product: this.restaurant.getProductById(id),
          recommendations: this.restaurant.getProducts(10, 1).pipe(
            catchError(err => {
              console.error('Recommendations error:', err);

              return of({
                data: {
                  products: [] as Product[],
                  hasMore: false
                }
              });
            })
          )
        }).pipe(
          map(response => ({
            product: response.product.data as DetailedProduct | null,
            recommendations: response.recommendations.data?.products ?? []
          })),
          catchError(err => {
            console.error('Product details error:', err);

            this.error.set(
              err.status === 404
                ? 'Product not found.'
                : 'Could not load product details.'
            );

            this.loading.set(false);
            return of(null);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(response => {
      if (!response) return;

      const product = response.product;

      if (!product) {
        this.error.set('Product not found.');
        this.loading.set(false);
        return;
      }

      this.product.set(product);

      this.recommendations.set(
        response.recommendations
          .filter(item => item.id !== product.id)
          .slice(0, 4)
      );

      this.loading.set(false);
    });
  }

  isVegetarian() {
    const product = this.product();

    return product?.vegeterian ?? product?.vegetarian ?? false;
  }

  changeQuantity(change: number) {
    this.quantity.update(current =>
      Math.max(1, Math.min(99, current + change))
    );
  }

  addToCart() {
    const product = this.product();

    if (!product || this.adding()) return;

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.adding.set(true);
    this.message.set('');

    this.cartService.addToCart(product.id, this.quantity())
      .pipe(
        finalize(() => this.adding.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.message.set('Product added to cart!');
        },
        error: err => {
          console.error('Add to cart error:', err);
          this.message.set('Could not add product to cart.');
        }
      });
  }
}
