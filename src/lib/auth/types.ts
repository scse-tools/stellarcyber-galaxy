export type Role = "admin" | "user";

export const ROLES: Role[] = ["admin", "user"];

export interface User {
  id: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The identity attached to a request; never carries the password hash. */
export interface SessionUser {
  id: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
}
