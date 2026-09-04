"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PlugZap, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { McpTestPanel } from "@/components/mcp-test-panel";
import { ConsoleControls } from "@/components/console-controls";
import { InstanceFormFields, type InstanceFormValues } from "@/components/instance-form-fields";
import { useConnectionTest } from "@/hooks/use-connection-test";
import { useGalaxyStore } from "@/store/instances-store";
import { resolveTimeRange } from "@/lib/time-range";
import type { AuthMode, InstanceSummary } from "@/lib/types";

const BLANK: InstanceFormValues = {
  name: "",
  consoleUrl: "",
  mcpUrl: "",
  authMode: "bearer" as AuthMode,
  username: "",
  password: "",
  apiKey: "",
  tenantId: "",
  consoleBuildHash: "",
  toolName: "",
  toolArgs: "",
};

interface FormModalProps {
  open: boolean;
  instance: InstanceSummary | null;
  onClose: () => void;
  onDelete?: (instance: InstanceSummary) => void;
}

export function InstanceFormModal({ open, instance, onClose, onDelete }: FormModalProps) {
  const saveInstance = useGalaxyStore((state) => state.saveInstance);
  const range = useGalaxyStore((state) => state.range);
  const [form, setForm] = useState<InstanceFormValues>(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const test = useConnectionTest();
  const editing = Boolean(instance);

  useEffect(() => {
    if (!open) return;
    setError(null);
    test.reset();
    setForm(
      instance
        ? {
            ...BLANK,
            name: instance.name,
            consoleUrl: instance.consoleUrl,
            mcpUrl: instance.mcpUrl,
            authMode: instance.authMode,
            username: instance.username,
            tenantId: instance.tenantId ?? "",
            consoleBuildHash: instance.consoleBuildHash ?? "",
            toolName: instance.toolName ?? "",
          }
        : BLANK,
    );
    // `test.reset` is stable; re-seeding on every render would wipe the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, instance]);

  const change = (key: keyof InstanceFormValues, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  /** Secrets left blank while editing mean "keep what is already encrypted on disk". */
  function payload(): Record<string, string> {
    const fields: Record<string, string> = {
      name: form.name,
      consoleUrl: form.consoleUrl,
      mcpUrl: form.mcpUrl,
      authMode: form.authMode,
      username: form.username,
      tenantId: form.tenantId,
      consoleBuildHash: form.consoleBuildHash,
      toolName: form.toolName,
      toolArgs: form.toolArgs,
    };
    if (form.password || !editing) fields.password = form.password;
    if (form.apiKey || !editing) fields.apiKey = form.apiKey;
    return fields;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveInstance(payload() as never, instance?.id);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? `Configure ${instance?.name}` : "Add instance"}
      description="Server, MCP endpoint, and credentials — editable and re-testable. Secrets are encrypted with AES-256-GCM."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <InstanceFormFields values={form} editing={editing} onChange={change} />

        {error ? (
          <p className="rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical">
            {error}
          </p>
        ) : null}

        <div className="space-y-2">
          <McpTestPanel running={test.running} result={test.result} error={test.error} />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              onClick={() =>
                void test.run({
                  ...payload(),
                  instanceId: instance?.id,
                  ...resolveTimeRange(range),
                })
              }
              disabled={test.running || !form.mcpUrl}
            >
              <PlugZap size={15} />
              {test.running ? "Testing…" : "Test connection"}
            </Button>
            <p className="text-[11px] text-sc-faint">Tests the values above before saving.</p>
          </div>
        </div>

        {editing && instance ? <ConsoleControls instance={instance} /> : null}

        <div className="flex items-center justify-between gap-2 border-t border-sc-border-soft pt-4">
          {editing && instance && onDelete ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => onDelete(instance)}
              disabled={saving}
            >
              <Trash2 size={15} />
              Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add instance"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
