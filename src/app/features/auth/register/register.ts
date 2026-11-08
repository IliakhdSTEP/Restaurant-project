
import { Component, inject, signal } from '@angular/core';
import {
  FormField,
  form,
  required,
  email,
  pattern
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  private http = inject(HttpClient);
  private router = inject(Router);

  model = signal({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  registerForm = form(this.model, (field) => {
    required(field.firstName);
    required(field.lastName);

    required(field.email);
    email(field.email);

    required(field.password);
    pattern(
      field.password,
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
    );
  });

  showPassword = signal(false);
  submitted = signal(false);
  loading = signal(false);
  error = signal('');

  togglePassword() {
    this.showPassword.update(value => !value);
  }

  register() {
    this.submitted.set(true);
    this.error.set('');

    if (this.registerForm().invalid() || this.loading()) {
      return;
    }

    const data = this.model();

    if (
      !data.firstName.trim() ||
      !data.lastName.trim() ||
      !data.email.trim()
    ) {
      return;
    }

    this.loading.set(true);

    this.http.post(
      'https://restaurantapi.stepacademy.ge/api/auth/register',
      {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        password: data.password
      }
    ).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: () => {
        this.router.navigate(['/verify-email'], {
          queryParams: {
            email: data.email.trim()
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        const validationErrors = err.error?.errors;

        if (validationErrors && typeof validationErrors === 'object') {
          const messages = Object.values(validationErrors)
            .flat()
            .filter((message): message is string =>
              typeof message === 'string'
            );

          if (messages.length) {
            this.error.set(messages.join(' '));
            return;
          }
        }

        this.error.set(
          typeof err.error?.message === 'string'
            ? err.error.message
            : 'Registration failed. Please try again.'
        );
      }
    });
  }
}
