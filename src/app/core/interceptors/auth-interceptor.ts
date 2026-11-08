
import {
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';

import { inject } from '@angular/core';

import {
  Observable,
  catchError,
  finalize,
  map,
  shareReplay,
  switchMap,
  throwError
} from 'rxjs';

import { AuthService } from '../../features/auth/services/auth';

interface RefreshState {
  sessionVersion: number;
  refreshToken: string;
  request$: Observable<string>;
}

let refreshState: RefreshState | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const apiUrl = 'https://restaurantapi.stepacademy.ge/api';
  const apiKey = 'b3c8276d-b6ce-41ca-a441-3cfdd7e2e5ed';

  if (!req.url.startsWith(`${apiUrl}/`)) {
    return next(req);
  }

  const accessToken = localStorage.getItem('accessToken');
  const requestSessionVersion = auth.getSessionVersion();

  const request = req.clone({
    setHeaders: {
      'X-STEP-KEY': apiKey,
      ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {})
    }
  });

  const isRefreshRequest =
    req.url.startsWith(`${apiUrl}/auth/refresh-access-token/`);

  const isPublicAuthRequest =
    req.url.startsWith(`${apiUrl}/auth/login`) ||
    req.url.startsWith(`${apiUrl}/auth/register`) ||
    req.url.startsWith(`${apiUrl}/auth/forgot-password`) ||
    req.url.startsWith(`${apiUrl}/auth/reset-password`) ||
    req.url.startsWith(`${apiUrl}/auth/verify-email`) ||
    req.url.startsWith(`${apiUrl}/auth/resend-email-verification`);

  if (isRefreshRequest || isPublicAuthRequest) {
    return next(request);
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (auth.getSessionVersion() !== requestSessionVersion) {
        return throwError(() => error);
      }

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        return throwError(() => error);
      }

      const currentToken = localStorage.getItem('accessToken');

      if (currentToken && currentToken !== accessToken) {
        const retryRequest = req.clone({
          setHeaders: {
            'X-STEP-KEY': apiKey,
            Authorization: `Bearer ${currentToken}`
          }
        });

        return next(retryRequest);
      }

      const sessionVersion = auth.getSessionVersion();

      if (
        !refreshState ||
        refreshState.sessionVersion !== sessionVersion ||
        refreshState.refreshToken !== refreshToken
      ) {
        const state: RefreshState = {
          sessionVersion,
          refreshToken,
          request$: null as unknown as Observable<string>
        };

        state.request$ = auth.refreshAccessToken(refreshToken).pipe(
          map(response =>
            auth.applyRefreshedTokens(
              response,
              refreshToken,
              sessionVersion
            )
          ),
          catchError(refreshError => {
            if (
              auth.getSessionVersion() === sessionVersion &&
              localStorage.getItem('refreshToken') === refreshToken
            ) {
              auth.logout();
            }

            return throwError(() => refreshError);
          }),
          finalize(() => {
            if (refreshState === state) {
              refreshState = null;
            }
          }),
          shareReplay({
            bufferSize: 1,
            refCount: false
          })
        );

        refreshState = state;
      }

      return refreshState.request$.pipe(
        switchMap(newAccessToken => {
          if (
            auth.getSessionVersion() !== sessionVersion ||
            localStorage.getItem('accessToken') !== newAccessToken
          ) {
            return throwError(
              () => new Error('Session changed during token refresh.')
            );
          }

          const retryRequest = req.clone({
            setHeaders: {
              'X-STEP-KEY': apiKey,
              Authorization: `Bearer ${newAccessToken}`
            }
          });

          return next(retryRequest);
        })
      );
    })
  );
};
