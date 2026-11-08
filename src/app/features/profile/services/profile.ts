
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  picture: string | null;
  address: string | null;
  age: number | null;
}

export interface CurrentUser extends UserProfile {
  id: number;
}

export interface ProfileResponse {
  data?: UserProfile;
  isSuccess?: boolean;
  message?: string;
}

export interface EditProfile {
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  picture: string;
  address: string;
  age: number | null;
}

export interface ChangePassword {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserActionResponse {
  isSuccess?: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private http = inject(HttpClient);

  private apiUrl = 'https://restaurantapi.stepacademy.ge/api/users';

  getProfile() {
    return this.http.get<ProfileResponse | UserProfile>(
      `${this.apiUrl}/profile`
    );
  }

  getCurrentUser() {
    return this.http.get<CurrentUser>(
      `${this.apiUrl}/me`
    );
  }

  editProfile(data: EditProfile) {
    return this.http.put<UserActionResponse>(
      `${this.apiUrl}/edit`,
      data
    );
  }

  changePassword(data: ChangePassword) {
    return this.http.put<UserActionResponse>(
      `${this.apiUrl}/change-password`,
      data
    );
  }

  deleteAccount() {
    return this.http.delete<UserActionResponse>(
      `${this.apiUrl}/delete`
    );
  }
}
