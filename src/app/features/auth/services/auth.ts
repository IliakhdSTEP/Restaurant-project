
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

interface LoginResponse {
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    isVerified: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'https://restaurantapi.stepacademy.ge/api/auth';
  private sessionVersion = 0;

  isLoggedIn = signal(!!localStorage.getItem('accessToken'));

  getSessionVersion() {
    return this.sessionVersion;
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      { email, password }
    ).pipe(
      tap(response => {
        const accessToken =
          response.data?.accessToken ?? response.accessToken;

        const refreshToken =
          response.data?.refreshToken ?? response.refreshToken;

        if (!accessToken) {
          throw new Error('Login response did not contain an access token.');
        }

        this.sessionVersion++;

        localStorage.setItem('accessToken', accessToken);

        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        } else {
          localStorage.removeItem('refreshToken');
        }

        this.isLoggedIn.set(true);
      })
    );
  }

  forgotPassword(email: string) {
    return this.http.post(
      `${this.apiUrl}/forgot-password/${encodeURIComponent(email)}`,
      {},
      { responseType: 'text' }
    );
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.put(
      `${this.apiUrl}/reset-password`,
      {
        token,
        newPassword
      },
      { responseType: 'text' }
    );
  }

  verifyEmail(email: string, code: string) {
    return this.http.put(
      `${this.apiUrl}/verify-email`,
      {
        email: email.trim(),
        code: code.trim()
      },
      { responseType: 'text' }
    );
  }

  resendEmailVerification(email: string) {
    return this.http.post(
      `${this.apiUrl}/resend-email-verification/${encodeURIComponent(email.trim())}`,
      null,
      { responseType: 'text' }
    );
  }

  refreshAccessToken(refreshToken: string) {
    return this.http.post<RefreshTokenResponse>(
      `${this.apiUrl}/refresh-access-token/${encodeURIComponent(refreshToken)}`,
      null
    );
  }

  applyRefreshedTokens(
    response: RefreshTokenResponse,
    originalRefreshToken: string,
    originalSessionVersion: number
  ) {
    if (
      this.sessionVersion !== originalSessionVersion ||
      localStorage.getItem('refreshToken') !== originalRefreshToken
    ) {
      throw new Error('Session changed during token refresh.');
    }

    const accessToken = response.data?.accessToken;
    const refreshToken = response.data?.refreshToken;

    if (!accessToken) {
      throw new Error('Refresh response did not contain an access token.');
    }

    localStorage.setItem('accessToken', accessToken);

    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    this.isLoggedIn.set(true);

    return accessToken;
  }

  logout() {
    this.sessionVersion++;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.isLoggedIn.set(false);
  }
}
