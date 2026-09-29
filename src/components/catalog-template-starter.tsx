"use client";

import { useEffect, useMemo, useState } from "react";
import { BookPlus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TemplateModal } from "@/components/template-modal";
import type { ConnectorTemplate } from "@/lib/connector-templates";
import type { DefinitionSummary, ConnectorDefinition } from "@/lib/connector-definitions";
import type { Row } from "@/lib/table-export";
import type { InstanceSummary } from "@/lib/types";

interface CatalogTemplateStarterProps {
  instances: InstanceSummary[];
  onSaved: (template: ConnectorTemplate) => void;
}

/** Builds a synthetic connector Row from a catalog definition, for the template modal. */
function connectorFromDefinition(def: ConnectorDefinition): Row {
  const conf: Record<string, unknown> = {};
  for (const field of def.fields) conf[field.fieldName] = field.default;
  return {
    type: def.type,
    category: def.category,
    name: "",
    is_collect: def.isCollect,
    is_respond: def.isRespond,
    run_on: "dp",
    filter_list: [],
    advanced_setting: false,
    configuration: JSON.stringify(conf),
  };
}

/** "New template from catalog": pick a connector type + server, then define the template. */
export function CatalogTemplateStarter({ instances, onSaved }: CatalogTemplateStarterProps) {
  const [defs, setDefs] = useState<DefinitionSummary[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [defKey, setDefKey] = useState("");
  const [serverId, setServerId] = useState("");
  const [connector, setConnector] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/connector-definitions")
      .then((response) => response.json())
      .then((body) => setDefs(body.definitions ?? []))
      .catch(() => setDefs([]));
  }, []);

  const typeOptions = useMemo(
    () => defs.map((d) => ({ value: `${d.category}/${d.type}`, label: `${d.displayName} · ${d.category}` })),
    [defs],
  );
  const serverOptions = useMemo(
    () =>
      [...instances]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((instance) => ({ value: instance.id, label: instance.name })),
    [instances],
  );
  const serverName = instances.find((i) => i.id === serverId)?.name ?? "";

  const reset = () => {
    setConnector(null);
    setDefKey("");
    setServerId("");
    setError(null);
  };

  const proceed = async () => {
    const [category, type] = defKey.split("/");
    if (!category || !type || !serverId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/connector-definitions/${encodeURIComponent(category)}/${encodeURIComponent(type)}`);
      const body = await response.json();
      if (!response.ok || !body.definition) throw new Error(body.error ?? "Could not load the definition.");
      setConnector(connectorFromDefinition(body.definition as ConnectorDefinition));
      setPickerOpen(false);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="primary" onClick={() => setPickerOpen(true)}>
        <BookPlus size={15} /> New template from catalog
      </Button>

      {pickerOpen ? (
        <Modal open title="New template from catalog" description="Pick a connector type and the target server." onClose={() => { setPickerOpen(false); reset(); }} className="max-w-[min(94vw,560px)]">
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">Connector type</span>
            <SearchableSelect
              value={defKey}
              onChange={setDefKey}
              ariaLabel="Connector type"
              className="mt-1 w-full rounded-md border border-sc-border bg-sc-surface px-2 py-1.5 text-sm text-sc-text hover:bg-sc-active"
              options={[{ value: "", label: "Select a connector type…" }, ...typeOptions]}
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">Target server</span>
            <SearchableSelect
              value={serverId}
              onChange={setServerId}
              ariaLabel="Target server"
              className="mt-1 w-full rounded-md border border-sc-border bg-sc-surface px-2 py-1.5 text-sm text-sc-text hover:bg-sc-active"
              options={[{ value: "", label: "Select a server…" }, ...serverOptions]}
            />
          </label>
          {error ? <p className="mt-3 text-xs text-critical">{error}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => { setPickerOpen(false); reset(); }}>Cancel</Button>
            <Button variant="primary" onClick={() => void proceed()} disabled={loading || !defKey || !serverId}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Continue
            </Button>
          </div>
        </Modal>
      ) : null}

      {connector ? (
        <TemplateModal
          connector={connector}
          instanceId={serverId}
          instanceName={serverName}
          onClose={reset}
          onSaved={(template) => {
            onSaved(template);
            reset();
          }}
        />
      ) : null}
    </>
  );
}
