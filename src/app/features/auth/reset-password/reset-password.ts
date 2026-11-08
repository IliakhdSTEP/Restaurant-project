
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  token = this.route.snapshot.queryParamMap.get('token') ?? '';
  newPassword = '';
  confirmPassword = '';

  showPassword = signal(false);
  loading = signal(false);
  error = signal('');
  success = signal('');

  resetPassword() {
    this.error.set('');
    this.success.set('');

    if (this.loading()) return;

    if (!this.token.trim()) {
      this.error.set('Please enter your reset token.');
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(this.newPassword)) {
      this.error.set(
        'Password must have at least 8 characters, an uppercase letter, a lowercase letter, a number and a special character.'
      );
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);

    this.authService.resetPassword(
      this.token.trim(),
      this.newPassword
    ).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: () => {
        this.success.set(
          'Password reset successfully! You can now sign in.'
        );

        this.newPassword = '';
        this.confirmPassword = '';
        this.token = '';
      },
      error: (err: HttpErrorResponse) => {
        console.error('Reset password error:', err);

        this.error.set(
          err.status === 429
            ? 'Too many attempts. Please try again later.'
            : 'Could not reset password. Your token may be invalid or expired.'
        );
      }
    });
  }
}
