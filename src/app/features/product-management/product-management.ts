
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import {
  Restaurant,
  Product,
  Category,
  CreateProductRequest
} from '../../shared/services/restaurant';

interface ApiResult {
  isSuccess?: boolean;
  error?: {
    message?: string;
    statusCode?: number;
  } | null;
}

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './product-management.html',
  styleUrl: './product-management.scss'
})
export class ProductManagement implements OnInit {
  private restaurant = inject(Restaurant);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);

  loading = signal(false);
  loadingProduct = signal(false);
  saving = signal(false);
  deletingId = signal<number | null>(null);

  error = signal('');
  success = signal('');

  showForm = signal(false);
  editingId = signal<number | null>(null);

  search = signal('');
  ingredientsText = '';

  filteredProducts = computed(() =>
    this.products().filter(product =>
      product.name.toLowerCase().includes(this.search().toLowerCase())
    )
  );

  form: CreateProductRequest = this.emptyForm();

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  private emptyForm(): CreateProductRequest {
    return {
      name: '',
      description: '',
      vegetarian: false,
      spiciness: 0,
      price: 0,
      image: '',
      method: '',
      ingredients: [],
      categoryId: 0
    };
  }

  private getErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Unable to connect to the server. Check your internet connection.';
    }

    if (err.status === 400) {
      return 'Invalid product information. Please check the fields.';
    }

    if (err.status === 401) {
      return 'Your session has expired. Please log in again.';
    }

    if (err.status === 403) {
      return 'You do not have permission to perform this action.';
    }

    if (err.status === 404) {
      return 'The requested product could not be found.';
    }

    if (err.status >= 500) {
      return 'Server error. Please try again later.';
    }

    return 'Something went wrong. Please try again.';
  }

  loadProducts() {
    this.loading.set(true);
    this.error.set('');

    this.restaurant.getProducts(100, 1).subscribe({
      next: response => {
        this.products.set(response.data?.products ?? []);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.error.set(this.getErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  loadCategories() {
    this.restaurant.getCategories().subscribe({
      next: response => {
        const data = response.data;

        this.categories.set(
          Array.isArray(data) ? data : data?.categories ?? []
        );
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  openCreateForm() {
    if (this.saving()) return;

    this.editingId.set(null);
    this.form = this.emptyForm();
    this.ingredientsText = '';
    this.showForm.set(true);
    this.error.set('');
    this.success.set('');
  }

  openEditForm(product: Product) {
    if (this.loadingProduct() || this.saving()) return;

    this.loadingProduct.set(true);
    this.error.set('');
    this.success.set('');
    this.showForm.set(false);

    this.restaurant.getProductById(product.id).subscribe({
      next: response => {
        const details = response.data;

        if (
          !details ||
          !details.method ||
          !Array.isArray(details.ingredients) ||
          !details.categoryId
        ) {
          this.error.set(
            'This product is missing information required for safe editing.'
          );
          this.loadingProduct.set(false);
          return;
        }

        this.editingId.set(product.id);

        this.form = {
          name: details.name,
          description: details.description,
          vegetarian: details.vegeterian ?? details.vegetarian ?? false,
          spiciness: details.spiciness,
          price: details.price,
          image: details.image,
          method: details.method,
          ingredients: [...details.ingredients],
          categoryId: details.categoryId
        };

        this.ingredientsText = details.ingredients.join(', ');

        this.showForm.set(true);
        this.loadingProduct.set(false);

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.error.set(this.getErrorMessage(err));
        this.loadingProduct.set(false);
      }
    });
  }

  closeForm() {
    if (this.saving()) return;

    this.showForm.set(false);
    this.editingId.set(null);
    this.ingredientsText = '';
  }

  onIngredientsChange(value: string) {
    this.ingredientsText = value;

    this.form.ingredients = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  saveProduct() {
    if (this.saving()) return;

    this.error.set('');
    this.success.set('');

    if (
      !this.form.name.trim() ||
      !this.form.description.trim() ||
      !this.form.image.trim() ||
      !this.form.method.trim() ||
      this.form.categoryId <= 0 ||
      this.form.ingredients.length === 0
    ) {
      this.error.set('Please fill in all required fields.');
      return;
    }

    if (
      !Number.isFinite(this.form.price) ||
      this.form.price < 0 ||
      !Number.isInteger(this.form.spiciness) ||
      this.form.spiciness < 0 ||
      this.form.spiciness > 5
    ) {
      this.error.set('Enter a valid price and spiciness between 0 and 5.');
      return;
    }

    this.saving.set(true);

    const id = this.editingId();

    const request = id === null
      ? this.restaurant.createProduct(this.form)
      : this.restaurant.updateProduct(id, this.form);

    request.subscribe({
      next: (response: unknown) => {
        const result = response as ApiResult | null;

        this.saving.set(false);

        if (!result || result.isSuccess === false) {
          this.error.set(
            result?.error?.message || 'The API could not save this product.'
          );
          return;
        }

        this.closeForm();

        this.success.set(
          id === null
            ? 'Product created successfully!'
            : 'Product updated successfully!'
        );

        this.loadProducts();
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.error.set(this.getErrorMessage(err));
        this.saving.set(false);
      }
    });
  }

  deleteProduct(product: Product) {
    if (!product.canDelete || this.deletingId() !== null) {
      return;
    }

    if (!confirm(`Delete ${product.name}?`)) {
      return;
    }

    this.deletingId.set(product.id);
    this.error.set('');
    this.success.set('');

    this.restaurant.deleteProduct(product.id).subscribe({
      next: response => {
        this.deletingId.set(null);

        if (response.isSuccess === false) {
          this.error.set(
            response.error?.message || 'Could not delete product.'
          );
          return;
        }

        this.success.set('Product deleted successfully!');
        this.loadProducts();
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.error.set(this.getErrorMessage(err));
        this.deletingId.set(null);
      }
    });
  }
}
