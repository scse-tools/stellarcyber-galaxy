import { z } from "zod";

const jsonObject = z
  .string()
  .trim()
  .refine((value) => {
    if (value === "") return true;
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, "Tool arguments must be a JSON object.");

export const instanceInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  consoleUrl: z.url("Console URL must be a valid URL."),
  toolName: z.string().trim().max(120).optional(),
  toolArgs: jsonObject.optional(),
  tenantId: z.string().trim().max(120).optional(),
  apiKey: z.string().trim().min(1, "API key is required."),
});

/** On update every field is optional; omitted secrets keep their stored value. */
export const instanceUpdateSchema = instanceInputSchema.partial();

export type InstanceInput = z.infer<typeof instanceInputSchema>;
export type InstanceUpdate = z.infer<typeof instanceUpdateSchema>;
