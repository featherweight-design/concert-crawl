/*
 * The route × viewport inventory a contact sheet walks.
 *
 * One schema for every inventory under `docs/superpowers/inventories/`, parsed
 * with `.strict()` objects throughout: a misspelt key (`wiat` for `wait`) on a
 * non-strict schema is silently dropped, and the step it named then never
 * happens while the cell still counts as reached. That is the quiet pass the
 * contact sheet exists to prevent, so a typo fails the parse instead.
 */
import { z } from 'zod';

/** Who a row is photographed as. `admin` needs the E2E_AUDIT_ADMIN_* pair. */
export const AUTH_STATES = ['signed-in', 'signed-out', 'admin'] as const;
export type AuthState = (typeof AUTH_STATES)[number];

/** Every theme in `apps/web/src/theme/themes.ts`, by the key `cc-theme` stores. */
export const THEME_KEYS = [
  'electric',
  'jade',
  'light',
  'pulse',
  'forge',
  'bluenote',
  'drip',
  'cedar',
  'gloss',
] as const;

/**
 * The per-PR minimum (umbrella plan: Electric, Light and one genre theme).
 * Pulse because the handoff draws it at both widths (`03-themes/bp-t-pulse-*`
 * and `bp-td-pulse-*`), so its cells have boards to compare against.
 */
export const DEFAULT_THEMES = ['electric', 'light', 'pulse'] as const;

export const DEFAULT_WIDTHS = [
  { label: 'floor', width: 320, height: 640 },
  { label: 'phone', width: 390, height: 844 },
  { label: 'sm', width: 640, height: 900 },
  { label: 'desktop', width: 1300, height: 900 },
] as const;

const widthSchema = z
  .object({
    label: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

/**
 * One step: every key is optional and a step may combine several, applied in
 * the fixed order `runSteps` documents. A step with no recognised key fails the
 * parse rather than doing nothing.
 */
const stepSchema = z
  .object({
    mock: z.string().min(1).optional(),
    status: z.number().int().optional(),
    json: z.unknown().optional(),
    hold: z.string().min(1).optional(),
    ms: z.number().int().positive().optional(),
    unhold: z.string().min(1).optional(),
    goto: z.string().startsWith('/').optional(),
    ready: z.boolean().optional(),
    store: z.record(z.string(), z.string()).optional(),
    click: z.string().min(1).optional(),
    clickRole: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    clickDialog: z
      .object({
        dialog: z.string().min(1),
        role: z.string().min(1).optional(),
        name: z.string().min(1),
      })
      .strict()
      .optional(),
    fill: z.string().min(1).optional(),
    text: z.string().optional(),
    hover: z.string().min(1).optional(),
    openAccount: z.boolean().optional(),
    openSearch: z.boolean().optional(),
    wait: z.string().min(1).optional(),
    waitDialog: z.string().min(1).optional(),
    offline: z.boolean().optional(),
    pressKey: z.string().min(1).optional(),
    back: z.boolean().optional(),
    settle: z.number().int().nonnegative().optional(),
    scrollTo: z.string().min(1).optional(),
    scroll: z
      .union([z.number().int().nonnegative(), z.literal('bottom')])
      .optional(),
  })
  .strict()
  .refine((step) => Object.keys(step).length > 0, {
    message: 'a step must name at least one verb',
  })
  .refine((step) => step.clickRole === undefined || step.name !== undefined, {
    message: '`clickRole` needs a `name` (a regex source)',
  })
  .refine((step) => step.fill === undefined || step.text !== undefined, {
    message: '`fill` needs a `text`',
  });

export type Step = z.infer<typeof stepSchema>;

const rowSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'row ids are kebab-case'),
    label: z.string().min(1),
    /** The route PATTERN as `apps/web/src/app` spells it, for the inventory table. */
    route: z.string().startsWith('/'),
    auth: z.enum(AUTH_STATES).optional(),
    /** Handoff boards, relative to the inventory's `boardsDir`, extension included. */
    boards: z.array(z.string().min(1)).optional(),
    /** The component file the row is about, for reading the sheet against the diff. */
    view: z.string().optional(),
    widths: z.array(z.string().min(1)).nonempty().optional(),
    /**
     * `account`: the route draws the ACCOUNT's saved theme (`/me` mounts
     * `ThemeSync`), so the theme matrix cannot apply. Photographed once per
     * width, labelled with whatever theme the page drew.
     */
    theme: z.literal('account').optional(),
    /**
     * `public-browse`: reachable only once `NEXT_PUBLIC_PUBLIC_BROWSE` is true
     * (skipped otherwise, mirroring `helpers/launch-mode.ts`).
     * `manual`: no automated path reaches it; listed on the sheet as a named
     * hole for the staging walk, never counted as reached.
     */
    when: z.enum(['public-browse', 'manual']).optional(),
    fullPage: z.boolean().optional(),
    note: z.string().optional(),
    steps: z.array(stepSchema),
  })
  .strict()
  .refine((row) => row.when === 'manual' || row.steps.length > 0, {
    message: 'a row that is not `manual` needs steps',
  });

export type InventoryRow = z.infer<typeof rowSchema>;

export const inventorySchema = z
  .object({
    feature: z.string().min(1),
    /** The plan row this inventory belongs to, e.g. `B5`. */
    planRow: z.string().min(1),
    plan: z.string().min(1),
    note: z.string().optional(),
    out: z.string().optional(),
    boardsDir: z
      .string()
      .default('design/design_handoff_bplus_redesign/screens'),
    auth: z.enum(AUTH_STATES).default('signed-in'),
    widths: z.array(widthSchema).nonempty().optional(),
    themes: z.array(z.enum(THEME_KEYS)).nonempty().optional(),
    motion: z.enum(['reduce', 'no-preference']).default('reduce'),
    fullPage: z.boolean().optional(),
    shares: z
      .object({ binding: z.string().min(1), module: z.string().min(1) })
      .strict()
      .optional(),
    rows: z.array(rowSchema).nonempty(),
  })
  .strict()
  .superRefine((inventory, ctx) => {
    const labels = (inventory.widths ?? DEFAULT_WIDTHS).map((w) => w.label);
    const seen = new Set<string>();
    for (const row of inventory.rows) {
      if (seen.has(row.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate row id "${row.id}"`,
        });
      }
      seen.add(row.id);
      // A typo in a row's `widths` would skip it at every width, and a row
      // that produced no shot cannot fail the reachability check either.
      for (const label of row.widths ?? []) {
        if (!labels.includes(label)) {
          ctx.addIssue({
            code: 'custom',
            message: `row "${row.id}": width "${label}" is not one of ${labels.join(', ')}`,
          });
        }
      }
    }
  });

export type Inventory = z.infer<typeof inventorySchema>;
