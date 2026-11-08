
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, switchMap } from 'rxjs';

export interface CartProduct {
  id: number;
  name: string;
  description: string;
  vegeterian: boolean;
  spiciness: number;
  rate: number;
  price: number;
  image: string;
  canDelete: boolean;
}

export interface CartItem {
  id: number;
  quantity: number;
  product: CartProduct;
}

export interface CartResponse {
  data: {
    totalItems: number;
    totalPrice: number;
    items: CartItem[];
  };
}

export interface CartActionResponse {
  isSuccess?: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);

  private apiUrl =
    'https://restaurantapi.stepacademy.ge/api/cart';

  cartCount = signal(0);
  cartNotification = signal(false);

  private updateCartCount(response: CartResponse) {
    this.cartCount.set(response.data?.totalItems ?? 0);
  }

  loadCartCount() {
    this.getCart().subscribe({
      error: err => console.error('Cart count error:', err)
    });
  }

  showCartNotification() {
    this.cartNotification.set(true);
  }

  closeCartNotification() {
    this.cartNotification.set(false);
  }

  addToCart(productId: number, quantity = 1) {
    return this.http.post<CartActionResponse>(
      `${this.apiUrl}/add-to-cart`,
      { productId, quantity }
    ).pipe(
      switchMap(response => {
        if (response?.isSuccess === false) {
          throw new Error(
            response.message || 'Could not add product.'
          );
        }

        return this.getCart();
      }),
      tap(() => this.showCartNotification())
    );
  }

  getCart() {
    return this.http.get<CartResponse>(this.apiUrl).pipe(
      tap(response => this.updateCartCount(response))
    );
  }

  editQuantity(itemId: number, quantity: number) {
    return this.http.put<CartActionResponse>(
      `${this.apiUrl}/edit-quantity`,
      { itemId, quantity }
    );
  }

  removeFromCart(itemId: number) {
    return this.http.delete<CartActionResponse>(
      `${this.apiUrl}/remove-from-cart/${itemId}`
    );
  }

  checkout() {
    return this.http.post<CartActionResponse>(
      `${this.apiUrl}/checkout`,
      {}
    );
  }
}
