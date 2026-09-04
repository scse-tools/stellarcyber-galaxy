"use client";

import { useCallback, useState } from "react";
import { testConnection, type TestConnectionPayload } from "@/lib/test-connection";
import type { McpTestResult } from "@/lib/types";

/** Local state for a "Test" button: one run at a time, with its steps or its error. */
export function useConnectionTest() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<McpTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(async (payload: TestConnectionPayload) => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      setResult(await testConnection(payload));
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "The connection test failed.");
    } finally {
      setRunning(false);
    }
  }, []);

  return { running, result, error, run, reset };
}
