
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-verify-email',
  imports: [FormsModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss'
})
export class VerifyEmail {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  email = this.route.snapshot.queryParamMap.get('email') ?? '';
  code = '';

  loading = signal(false);
  resending = signal(false);
  error = signal('');
  success = signal('');
  resendMessage = signal('');

  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private getErrorMessage(
    err: HttpErrorResponse,
    fallback: string
  ): string {
    if (err.status === 429) {
      return 'Too many requests. Please try again later.';
    }

    const body = err.error;

    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);

        if (typeof parsed.detail === 'string') {
          return parsed.detail;
        }

        if (typeof parsed.message === 'string') {
          return parsed.message;
        }

        if (typeof parsed.title === 'string') {
          return parsed.title;
        }
      } catch {
        if (body.trim()) {
          return body;
        }
      }
    }

    if (body && typeof body === 'object') {
      if (typeof body.detail === 'string') {
        return body.detail;
      }

      if (typeof body.message === 'string') {
        return body.message;
      }

      if (typeof body.title === 'string') {
        return body.title;
      }
    }

    return fallback;
  }

  verifyEmail() {
    this.error.set('');
    this.success.set('');
    this.resendMessage.set('');

    const email = this.email.trim();
    const code = this.code.trim();

    if (!this.emailRegex.test(email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    if (!code) {
      this.error.set('Please enter your verification code.');
      return;
    }

    if (this.loading()) return;

    this.loading.set(true);

    this.authService.verifyEmail(email, code)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.success.set(
            'Email verified successfully! Redirecting to Login...'
          );

          this.code = '';

          this.router.navigate(['/login']);
        },

        error: (err: HttpErrorResponse) => {
          console.error('Verify email error:', err);

          this.error.set(
            this.getErrorMessage(
              err,
              'Verification failed. Please check your code and try again.'
            )
          );
        }
      });
  }

  resendCode() {
    this.error.set('');
    this.resendMessage.set('');

    const email = this.email.trim();

    if (!this.emailRegex.test(email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    if (this.resending()) return;

    this.resending.set(true);

    this.authService.resendEmailVerification(email)
      .pipe(finalize(() => this.resending.set(false)))
      .subscribe({
        next: () => {
          this.resendMessage.set(
            'A new verification code has been requested. Check your inbox.'
          );
        },

        error: (err: HttpErrorResponse) => {
          console.error('Resend verification error:', err);

          this.error.set(
            this.getErrorMessage(
              err,
              'Could not resend the verification code.'
            )
          );
        }
      });
  }
}
