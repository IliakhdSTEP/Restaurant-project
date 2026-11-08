
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

import {
  Subject,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  Observable,
  switchMap,
  Subscription
} from 'rxjs';

import {
  Restaurant,
  Product,
  ProductFilters,
  ProductsResponse,
  Category
} from '../../shared/services/restaurant';

import { CartService } from '../cart/services/cart';
import { AuthService } from '../auth/services/auth';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './menu.html',
  styleUrl: './menu.scss'
})
export class Menu implements OnInit, OnDestroy {
  private restaurant = inject(Restaurant);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);

  private destroy$ = new Subject<void>();
  private searchChanges = new Subject<string>();
  private productsSubscription?: Subscription;
  private requestId = 0;

  private readonly pageSize = 10;

  products = signal<Product[]>([]);
  loading = signal(true);
  error = signal('');

  page = signal(1);
  hasMore = signal(false);

  search = signal('');
  vegetarianOnly = signal(false);
  spiciness = signal(0);
  minRating = signal(0);
  minPrice = signal(0);
  maxPrice = signal(500);

  selectedCategories = signal<number[]>([]);
  categories = signal<Category[]>([]);

  addingProductIds = signal<number[]>([]);
  cartMessage = signal('');

  mobileFiltersOpen = signal(false);

  ngOnInit() {
    this.restaurant.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const data = response.data;

          const categories = Array.isArray(data)
            ? data
            : data?.categories ?? [];

          this.categories.set(categories);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Categories error:', err);
        }
      });

    this.searchChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });

    this.loadProducts();
  }

  toggleMobileFilters() {
    this.mobileFiltersOpen.update(value => !value);
  }

  closeMobileFilters() {
    this.mobileFiltersOpen.set(false);
  }

  onSearch(value: string) {
    this.search.set(value);
    this.searchChanges.next(value);
  }

  applyFilters() {
    this.page.set(1);
    this.loadProducts();
  }

  private getFilters(): ProductFilters {
    const filters: ProductFilters = {
      Take: this.pageSize,
      Page: this.page()
    };

    if (this.search().trim()) {
      filters.Query = this.search().trim();
    }

    if (this.vegetarianOnly()) {
      filters.Vegetarian = true;
    }

    if (this.spiciness() > 0) {
      filters.Spiciness = this.spiciness();
    }

    if (this.minRating() > 0) {
      filters.Rate = this.minRating();
    }

    if (this.minPrice() > 0) {
      filters.MinPrice = this.minPrice();
    }

    if (this.maxPrice() < 500) {
      filters.MaxPrice = this.maxPrice();
    }

    return filters;
  }

  private hasActiveFilters(): boolean {
    return (
      this.search().trim() !== '' ||
      this.selectedCategories().length > 0 ||
      this.vegetarianOnly() ||
      this.spiciness() > 0 ||
      this.minRating() > 0 ||
      this.minPrice() > 0 ||
      this.maxPrice() < 500
    );
  }

  private getAllCategoryProducts(
    categoryId: number,
    filters: ProductFilters,
    page = 1
  ): Observable<Product[]> {
    return this.restaurant.getFilteredProducts({
      ...filters,
      CategoryId: categoryId,
      Take: 100,
      Page: page
    }).pipe(
      switchMap(response => {
        const products = response.data?.products ?? [];

        if (!response.data?.hasMore) {
          return of(products);
        }

        return this.getAllCategoryProducts(
          categoryId,
          filters,
          page + 1
        ).pipe(
          map(nextProducts => [
            ...products,
            ...nextProducts
          ])
        );
      })
    );
  }

  loadProducts() {
    const currentRequest = ++this.requestId;

    this.productsSubscription?.unsubscribe();

    this.loading.set(true);
    this.error.set('');

    const filters = this.getFilters();
    const selected = this.selectedCategories();

    let request: Observable<ProductsResponse>;

    if (selected.length > 1) {
      request = forkJoin(
        selected.map(categoryId =>
          this.getAllCategoryProducts(categoryId, filters)
        )
      ).pipe(
        map(results => {
          const groups = results.map(products => [...products]);
          const mixedProducts: Product[] = [];

          while (groups.some(group => group.length > 0)) {
            for (const group of groups) {
              const product = group.shift();

              if (product) {
                mixedProducts.push(product);
              }
            }
          }

          const uniqueProducts = Array.from(
            new Map(
              mixedProducts.map(product => [
                product.id,
                product
              ])
            ).values()
          );

          const start =
            (this.page() - 1) * this.pageSize;

          const end = start + this.pageSize;

          return {
            data: {
              products: uniqueProducts.slice(start, end),
              hasMore: uniqueProducts.length > end
            }
          };
        })
      );

    } else if (selected.length === 1) {
      request = this.restaurant.getFilteredProducts({
        ...filters,
        CategoryId: selected[0]
      });

    } else if (this.hasActiveFilters()) {
      request = this.restaurant.getFilteredProducts(filters);

    } else {
      request = this.restaurant.getProducts(
        this.pageSize,
        this.page()
      );
    }

    this.productsSubscription = request
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ProductsResponse) => {
          if (currentRequest !== this.requestId) return;

          this.products.set(response.data?.products ?? []);
          this.hasMore.set(response.data?.hasMore ?? false);
          this.loading.set(false);
        },

        error: (err: HttpErrorResponse) => {
          if (currentRequest !== this.requestId) return;

          console.error('Menu error:', err);
          this.error.set('Could not load menu products.');
          this.loading.set(false);
        }
      });
  }

  toggleCategory(categoryId: number) {
    this.selectedCategories.update(current =>
      current.includes(categoryId)
        ? current.filter(id => id !== categoryId)
        : [...current, categoryId]
    );

    this.applyFilters();
  }

  changeVegetarian(value: boolean) {
    this.vegetarianOnly.set(value);
    this.applyFilters();
  }

  changeSpiciness(value: number) {
    this.spiciness.set(value);
    this.applyFilters();
  }

  changeRating(value: number) {
    this.minRating.set(value);
    this.applyFilters();
  }

  changeMinPrice(value: number) {
    this.minPrice.set(value);
    this.applyFilters();
  }

  changeMaxPrice(value: number) {
    this.maxPrice.set(value);
    this.applyFilters();
  }

  clearFilters() {
    this.search.set('');
    this.selectedCategories.set([]);
    this.vegetarianOnly.set(false);
    this.spiciness.set(0);
    this.minRating.set(0);
    this.minPrice.set(0);
    this.maxPrice.set(500);

    this.applyFilters();
  }

  nextPage() {
    if (!this.hasMore() || this.loading()) return;

    this.page.update(p => p + 1);
    this.loadProducts();
    window.scrollTo(0, 0);
  }

  previousPage() {
    if (this.page() <= 1 || this.loading()) return;

    this.page.update(p => p - 1);
    this.loadProducts();
    window.scrollTo(0, 0);
  }

  addToCart(product: Product) {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.addingProductIds().includes(product.id)) {
      return;
    }

    this.cartMessage.set('');

    this.addingProductIds.update(ids => [
      ...ids,
      product.id
    ]);

    this.cartService.addToCart(product.id, 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cartMessage.set(
            `${product.name} added to cart!`
          );

          this.addingProductIds.update(ids =>
            ids.filter(id => id !== product.id)
          );
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
            ids.filter(id => id !== product.id)
          );
        }
      });
  }

  ngOnDestroy() {
    this.productsSubscription?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
