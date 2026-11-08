
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import { AuthService } from '../services/auth';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPassword {
  private authService = inject(AuthService);

  email = '';

  loading = signal(false);
  error = signal('');
  success = signal('');

  sendResetLink() {
    this.error.set('');
    this.success.set('');

    const email = this.email.trim();

    if (!email) {
      this.error.set('Email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    if (this.loading()) return;

    this.loading.set(true);

    this.authService.forgotPassword(email).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response: any) => {
        if (response?.isSuccess === false) {
          this.error.set(
            response.message || 'Could not send reset link.'
          );
          return;
        }

        this.success.set(
          'If this email is registered, please check your inbox for a password reset link.'
        );
      },

      error: (err: HttpErrorResponse) => {
        console.error('Forgot password error:', err);

        if (err.status === 429) {
          this.error.set(
            'Too many requests. Please try again later.'
          );
          return;
        }

        this.error.set(
          'Could not send reset link. Please try again.'
        );
      }
    });
  }
}
