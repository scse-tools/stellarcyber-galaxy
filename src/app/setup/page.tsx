"use client";

import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function SetupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Setup failed.");
      window.location.href = "/";
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Setup failed.");
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create administrator"
      subtitle="This is the first run. Create the administrator account to secure the app."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Username">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </Field>
        {error ? (
          <p className="rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? "Creating…" : "Create administrator"}
        </Button>
      </form>
    </AuthCard>
  );
}
