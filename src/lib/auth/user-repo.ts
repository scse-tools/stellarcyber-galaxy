import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import type { Role, User } from "@/lib/auth/types";

interface UserDbRow {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  must_change_password: number;
  created_at: string;
  updated_at: string;
}

const toUser = (row: UserDbRow): User => ({
  id: row.id,
  username: row.username,
  role: row.role === "admin" ? "admin" : "user",
  mustChangePassword: row.must_change_password === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function countUsers(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as unknown as { n: number };
  return row.n;
}

export function listUsers(): User[] {
  const rows = getDb()
    .prepare("SELECT * FROM users ORDER BY username ASC")
    .all() as unknown as UserDbRow[];
  return rows.map(toUser);
}

export function getUserById(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as
    | UserDbRow
    | undefined;
  return row ? toUser(row) : null;
}

/** Returns the row including the password hash — for login verification only. */
export function getUserRecordByUsername(username: string): UserDbRow | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
    .get(username) as unknown as UserDbRow | undefined;
  return row ?? null;
}

export function createUser(input: {
  username: string;
  password: string;
  role: Role;
  mustChangePassword?: boolean;
}): User {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, username, password_hash, role, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.username,
    hashPassword(input.password),
    input.role,
    input.mustChangePassword ? 1 : 0,
    now,
    now,
  );
  return getUserById(id)!;
}

export function setUserPassword(id: string, password: string, mustChange = false): void {
  getDb()
    .prepare(
      "UPDATE users SET password_hash = ?, must_change_password = ?, updated_at = ? WHERE id = ?",
    )
    .run(hashPassword(password), mustChange ? 1 : 0, new Date().toISOString(), id);
}

export function setUserRole(id: string, role: Role): void {
  getDb()
    .prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?")
    .run(role, new Date().toISOString(), id);
}

export function deleteUser(id: string): boolean {
  return getDb().prepare("DELETE FROM users WHERE id = ?").run(id).changes > 0;
}

/** Number of admins, so the last admin cannot be demoted or deleted. */
export function countAdmins(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'")
    .get() as unknown as { n: number };
  return row.n;
}
