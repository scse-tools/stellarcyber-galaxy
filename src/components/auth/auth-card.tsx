"use client";

import type { ReactNode } from "react";

/** Centered card shell used by the login and first-run setup screens. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="galaxy-backdrop flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-sc-border bg-sc-surface/90 p-6 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-sc-text">
            Stellar Cyber <span className="text-sc-accent">Galaxy</span>
          </h1>
          <h2 className="mt-3 text-sm font-medium text-sc-text">{title}</h2>
          <p className="mt-1 text-xs text-sc-faint">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
