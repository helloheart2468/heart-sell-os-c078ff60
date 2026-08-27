import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AGENTS, type AgentId, type StructuredField } from "@/lib/heart-sell";

export function StructuredForm({
  agent,
  fields: fieldsProp,
  initialValues,
  submitLabel,
  onSubmit,
  secondaryAction,
}: {
  agent: AgentId;
  fields?: StructuredField[];
  initialValues?: Record<string, string>;
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  secondaryAction?: { label: string; onClick: (values: Record<string, string>) => void | Promise<void> };
}) {
  const fields = fieldsProp ?? AGENTS[agent].fields;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const field of fields) base[field.name] = initialValues?.[field.name] ?? "";
    return base;
  });
  const [busy, setBusy] = useState(false);

  const set = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const run = async (fn: (v: Record<string, string>) => void | Promise<void>) => {
    setBusy(true);
    try {
      await fn(values);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void run(onSubmit);
      }}
    >
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={`${agent}-${field.name}`}>
            {field.label}
            {field.required ? <span className="text-destructive"> *</span> : null}
          </Label>
          {field.help ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{field.help}</p>
          ) : null}

          {field.type === "textarea" ? (
            <Textarea
              id={`${agent}-${field.name}`}
              rows={3}
              required={field.required}
              placeholder={field.placeholder}
              value={values[field.name] ?? ""}
              onChange={(e) => set(field.name, e.target.value)}
            />
          ) : field.type === "select" ? (
            <Select
              value={values[field.name] ?? ""}
              onValueChange={(value) => set(field.name, value)}
            >
              <SelectTrigger id={`${agent}-${field.name}`}>
                <SelectValue placeholder="Choose one" />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`${agent}-${field.name}`}
              required={field.required}
              placeholder={field.placeholder}
              value={values[field.name] ?? ""}
              onChange={(e) => set(field.name, e.target.value)}
            />
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Working…" : submitLabel}
        </Button>
        {secondaryAction ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void run(secondaryAction.onClick)}
          >
            {secondaryAction.label}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
