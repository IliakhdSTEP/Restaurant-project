
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  rate: number;
  image: string;
  vegetarian: boolean;
  vegeterian?: boolean;
  spiciness: number;
  canDelete: boolean;
  method?: string;
  ingredients?: string[];
  categoryId?: number;
}

export interface ProductsResponse {
  data: {
    products: Product[];
    hasMore: boolean;
  };
}

export interface ProductResponse {
  data: Product;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  vegetarian: boolean;
  spiciness: number;
  price: number;
  image: string;
  method: string;
  ingredients: string[];
  categoryId: number;
}

export interface DeleteProductResponse {
  isSuccess: boolean;
  error?: {
    message: string;
    statusCode: number;
  };
}

export interface Category {
  id: number;
  name: string;
}

export interface CategoriesResponse {
  data: Category[] | {
    categories: Category[];
  };
}

export interface CreateCategoryRequest {
  name: string;
}

export interface ProductFilters {
  Query?: string;
  Vegetarian?: boolean;
  Spiciness?: number;
  Rate?: number;
  MinPrice?: number;
  MaxPrice?: number;
  CategoryId?: number;
  Take?: number;
  Page?: number;
}

@Injectable({
  providedIn: 'root'
})
export class Restaurant {
  private http = inject(HttpClient);

  private apiUrl =
    'https://restaurantapi.stepacademy.ge/api';

  getProducts(take = 6, page = 1) {
    return this.http.get<ProductsResponse>(
      `${this.apiUrl}/products`,
      {
        params: new HttpParams()
          .set('Take', take)
          .set('Page', page)
      }
    );
  }

  getProductById(id: number) {
    return this.http.get<ProductResponse>(
      `${this.apiUrl}/products/${id}`
    );
  }

  createProduct(product: CreateProductRequest) {
    return this.http.post(
      `${this.apiUrl}/products`,
      product
    );
  }

  updateProduct(id: number, product: CreateProductRequest) {
    return this.http.put(
      `${this.apiUrl}/products/${id}`,
      product
    );
  }

  deleteProduct(id: number) {
    return this.http.delete<DeleteProductResponse>(
      `${this.apiUrl}/products/${id}`
    );
  }

  getCategories() {
    return this.http.get<CategoriesResponse>(
      `${this.apiUrl}/categories`
    );
  }

  createCategory(category: CreateCategoryRequest) {
    return this.http.post(
      `${this.apiUrl}/categories`,
      category
    );
  }

  updateCategory(id: number, category: CreateCategoryRequest) {
    return this.http.put(
      `${this.apiUrl}/categories/${id}`,
      category
    );
  }

  deleteCategory(id: number) {
    return this.http.delete<DeleteProductResponse>(
      `${this.apiUrl}/categories/${id}`
    );
  }

  getFilteredProducts(filters: ProductFilters) {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ProductsResponse>(
      `${this.apiUrl}/products/filter`,
      { params }
    );
  }
}
