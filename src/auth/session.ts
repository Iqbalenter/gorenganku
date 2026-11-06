export type UserRole = 'admin' | 'user';

export interface AppUser {
  username: string;
  role: UserRole;
  displayName: string;
}

let currentUser: AppUser | null = null;

export function setCurrentUser(user: AppUser | null) {
  currentUser = user;
}

export function getCurrentUser() {
  return currentUser;
}

export function canManageStore() {
  return currentUser?.role === 'admin';
}

export function isAdmin() {
  return currentUser?.role === 'admin';
}
