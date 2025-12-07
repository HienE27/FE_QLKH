// src/services/auth.service.ts
import { apiFetch } from '@/lib/api-client';
import type { LoginRequest, LoginResponse } from '@/types/auth';

export interface UserProfile {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  country?: string;
  active?: boolean;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  country?: string;
  avatar?: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function getProfile(): Promise<UserProfile> {
  const response = await apiFetch<ApiResponse<UserProfile>>('/api/auth/profile', {
    method: 'GET',
  });
  return response.data;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  const response = await apiFetch<ApiResponse<UserProfile>>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deleteAccount(): Promise<void> {
  return apiFetch<void>('/api/auth/profile', {
    method: 'DELETE',
  });
}
