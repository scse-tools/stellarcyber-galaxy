"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { Role, User } from "@/lib/auth/types";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? "Request failed.");
  return body as T;
}

export function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers((await api<{ users: User[] }>("/api/users")).users);
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Action failed.");
    }
  };

  async function addUser(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await act(async () => {
      await api("/api/users", { method: "POST", body: JSON.stringify({ username, password, role }) });
      setUsername("");
      setPassword("");
      setRole("user");
    });
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-sc-faint">
          <Loader2 size={14} className="animate-spin" /> Loading users…
        </p>
      ) : (
        <ul className="divide-y divide-sc-border-soft rounded-lg border border-sc-border-soft">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-sc-text">
                {user.username}
                {user.id === currentUserId ? <span className="text-sc-faint"> (you)</span> : null}
              </span>
              <Select
                aria-label={`${user.username} role`}
                className="w-28 py-1 text-xs"
                value={user.role}
                onChange={(e) => void act(() =>
                  api(`/api/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ role: e.target.value }) }),
                )}
              >
                <option value="admin">admin</option>
                <option value="user">user</option>
              </Select>
              <button
                type="button"
                title="Reset password"
                className="rounded-md px-2 py-1 text-xs text-sc-muted hover:bg-sc-active hover:text-sc-text"
                onClick={() => {
                  const next = window.prompt(`New password for ${user.username} (min 8 chars):`);
                  if (next) void act(() =>
                    api(`/api/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ password: next }) }),
                  );
                }}
              >
                Reset password
              </button>
              <button
                type="button"
                aria-label={`Delete ${user.username}`}
                disabled={user.id === currentUserId}
                className={cn(
                  "rounded-md p-1.5 text-sc-faint transition-colors",
                  "hover:bg-critical/10 hover:text-critical disabled:cursor-not-allowed disabled:opacity-40",
                )}
                onClick={() => {
                  if (window.confirm(`Delete user ${user.username}?`)) {
                    void act(() => api(`/api/users/${user.id}`, { method: "DELETE" }));
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addUser} className="space-y-3 rounded-lg border border-sc-border-soft p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">Add user</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="user">user (read only)</option>
              <option value="admin">admin (full)</option>
            </Select>
          </Field>
        </div>
        <Field label="Password" hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Adding…" : "Add user"}
          </Button>
        </div>
      </form>
    </div>
  );
}
