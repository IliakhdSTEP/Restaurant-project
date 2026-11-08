
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import {
  ProfileService,
  UserProfile,
  ProfileResponse,
  EditProfile,
  ChangePassword
} from './services/profile';

import { AuthService } from '../auth/services/auth';
import { CartService } from '../cart/services/cart';

type ProfileTab = 'personal' | 'password' | 'account';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private router = inject(Router);

  activeTab = signal<ProfileTab>('personal');

  loading = signal(true);
  saving = signal(false);
  changingPassword = signal(false);
  deleting = signal(false);

  error = signal('');
  success = signal('');

  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  confirmDelete = signal(false);

  firstName = '';
  lastName = '';
  email = '';
  phoneNumber = '';
  picture = '';
  address = '';
  age: number | null = null;

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadProfile();
  }

  setTab(tab: ProfileTab) {
    this.activeTab.set(tab);
    this.error.set('');
    this.success.set('');
    this.confirmDelete.set(false);
  }

  loadProfile() {
    this.loading.set(true);
    this.error.set('');

    this.profileService.getProfile().pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: response => {
        const result = response as ProfileResponse;
        const profile: UserProfile | undefined =
          result.data ?? (response as UserProfile);

        if (!profile || !profile.firstName) {
          this.error.set('Could not read profile information.');
          return;
        }

        this.firstName = profile.firstName ?? '';
        this.lastName = profile.lastName ?? '';
        this.email = profile.email ?? '';
        this.phoneNumber = profile.phoneNumber ?? '';
        this.picture = profile.picture ?? '';
        this.address = profile.address ?? '';
        this.age = profile.age ?? null;
      },
      error: (err: HttpErrorResponse) => {
        this.handleError(err, 'Could not load your profile.');
      }
    });
  }

  saveProfile() {
    this.error.set('');
    this.success.set('');

    if (!this.firstName.trim() || !this.lastName.trim()) {
      this.error.set('First name and last name are required.');
      return;
    }

    if (
      this.age !== null &&
      this.age !== undefined &&
      (
        !Number.isInteger(Number(this.age)) ||
        Number(this.age) < 1 ||
        Number(this.age) > 120
      )
    ) {
      this.error.set('Age must be between 1 and 120.');
      return;
    }

    const phone = this.phoneNumber.trim();

    if (
      phone &&
      !/^\+?[0-9\s()-]{7,20}$/.test(phone)
    ) {
      this.error.set('Please enter a valid phone number.');
      return;
    }

    const payload: EditProfile = {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      phoneNumber: phone || null,
      picture: this.picture.trim(),
      address: this.address.trim(),
      age: this.age === null ? null : Number(this.age)
    };

    this.saving.set(true);

    this.profileService.editProfile(payload).pipe(
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: response => {
        if (response?.isSuccess === false) {
          this.error.set(
            response.message || 'Could not update profile.'
          );
          return;
        }

        this.success.set('Profile updated successfully!');
        this.loadProfile();
      },
      error: (err: HttpErrorResponse) => {
        this.handleError(err, 'Could not update your profile.');
      }
    });
  }

  updatePassword() {
    this.error.set('');
    this.success.set('');

    if (
      !this.oldPassword ||
      !this.newPassword ||
      !this.confirmPassword
    ) {
      this.error.set('Please fill in all password fields.');
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(this.newPassword)) {
      this.error.set(
        'Password needs 8 characters, uppercase, lowercase, number and special character.'
      );
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error.set('New passwords do not match.');
      return;
    }

    const data: ChangePassword = {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    };

    this.changingPassword.set(true);

    this.profileService.changePassword(data).pipe(
      finalize(() => this.changingPassword.set(false))
    ).subscribe({
      next: response => {
        if (response?.isSuccess === false) {
          this.error.set(
            response.message || 'Could not change password.'
          );
          return;
        }

        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';

        this.success.set('Password updated successfully!');
      },
      error: (err: HttpErrorResponse) => {
        this.handleError(err, 'Could not change your password.');
      }
    });
  }

  deleteAccount() {
    if (!this.confirmDelete()) {
      this.confirmDelete.set(true);
      return;
    }

    this.deleting.set(true);
    this.error.set('');

    this.profileService.deleteAccount().pipe(
      finalize(() => this.deleting.set(false))
    ).subscribe({
      next: response => {
        if (response?.isSuccess === false) {
          this.error.set(
            response.message || 'Could not delete account.'
          );
          return;
        }

        this.authService.logout();
        this.cartService.cartCount.set(0);
        this.cartService.closeCartNotification();

        this.router.navigate(['/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.handleError(err, 'Could not delete your account.');
      }
    });
  }

  private handleError(
    err: HttpErrorResponse,
    fallback: string
  ) {
    console.error('Profile error:', err);

    if (err.status === 401) {
      this.authService.logout();
      this.cartService.cartCount.set(0);
      this.router.navigate(['/login']);
      return;
    }

    const apiMessage =
      typeof err.error?.message === 'string'
        ? err.error.message
        : '';

    const validationErrors = err.error?.errors;

    if (validationErrors && typeof validationErrors === 'object') {
      const messages = Object.values(validationErrors)
        .flat()
        .filter((message): message is string =>
          typeof message === 'string'
        );

      if (messages.length > 0) {
        this.error.set(messages.join(' '));
        return;
      }
    }

    this.error.set(apiMessage || fallback);
  }
}
