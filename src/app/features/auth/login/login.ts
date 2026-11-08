
import { Component, inject, signal } from '@angular/core';
import {
  FormField,
  form,
  required,
  email
} from '@angular/forms/signals';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  model = signal({
    email: '',
    password: '',
    rememberMe: false
  });

  loginForm = form(this.model, (field) => {
    required(field.email);
    email(field.email);
    required(field.password);
  });

  showPassword = signal(false);
  loading = signal(false);
  submitted = signal(false);
  error = signal('');

  login() {
    this.submitted.set(true);
    this.error.set('');

    if (this.loginForm().invalid() || this.loading()) {
      return;
    }

    const data = this.model();

    this.loading.set(true);

    this.authService.login(
      data.email.trim(),
      data.password
    ).subscribe({
      next: () => {
        this.loading.set(false);

        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl');

        const destination =
          returnUrl &&
          returnUrl.startsWith('/') &&
          !returnUrl.startsWith('//')
            ? returnUrl
            : '/';

        this.router.navigateByUrl(destination);
      },
      error: (err) => {
        this.loading.set(false);

        this.error.set(
          err.status === 401
            ? 'Invalid email or password.'
            : err.error?.message || err.message || 'Login failed.'
        );
      }
    });
  }
}
