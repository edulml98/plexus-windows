---
name: add-quota-checker
description: Step-by-step checklist for adding a new quota checker to Plexus. Use whenever asked to implement a new quota checker type — covers backend registration, frontend components, display integration, and common pitfalls.
---

# Adding a New Quota Checker

Every item in this checklist is required. The provider edit modal will not show the new checker type if any registration is missed.

## Backend

### `packages/backend/src/config.ts`
- Add the lowercase checker type string to `VALID_QUOTA_CHECKER_TYPES` array — this drives the `/v0/management/quota-checker-types` API endpoint.

### `packages/backend/src/services/quota/quota-checker-factory.ts`
- Register the checker class in `CHECKER_REGISTRY`.

### `packages/backend/drizzle/schema/postgres/enums.ts`
- Add the type to `quotaCheckerTypeEnum`. (SQLite uses plain `text` and doesn't enforce enum values — Postgres deployments will reject inserts without this.)
- After your PR merges, CI auto-generates the migration. Do **not** create or edit migration files manually.

## Frontend — Components (`packages/frontend/src/components/quota/`)

### Config component — `{Name}QuotaConfig.tsx`
- Props: `options: Record<string, unknown>`, `onChange: (options: Record<string, unknown>) => void`
- Do **not** add an `apiKey` field — it is auto-inherited from the provider config.
- Call `onChange` whenever any option changes.

### Display component — `{Name}QuotaDisplay.tsx`
- Props: `result: QuotaCheckResult`, `isCollapsed: boolean`
- Rate-limit checkers → progress bar (`QuotaProgressBar`)
- Balance checkers → `Wallet` icon + dollar/points display

### `index.ts`
- Export both `{Name}QuotaConfig` and `{Name}QuotaDisplay`.

## Frontend — Providers.tsx (`packages/frontend/src/pages/Providers.tsx`)

1. Import the config component at the top.
2. Add the lowercase type string to `QUOTA_CHECKER_TYPES_FALLBACK`.
3. Add a conditional rendering block after the quota checker type/interval selector:

```tsx
{selectedQuotaCheckerType && selectedQuotaCheckerType === 'checkername' && (
  <div className="mt-3 p-3 border border-border-glass rounded-md bg-bg-subtle">
    <CheckerNameQuotaConfig
      options={editingProvider.quotaChecker?.options || {}}
      onChange={(options) =>
        setEditingProvider({
          ...editingProvider,
          quotaChecker: {
            ...editingProvider.quotaChecker,
            options,
          } as Provider['quotaChecker'],
        })
      }
    />
  </div>
)}
```

## Frontend — Quotas.tsx (`packages/frontend/src/pages/Quotas.tsx`)

- Add to the display name map (e.g. `neuralwatt: 'Neuralwatt'`).
- Add the display component to the per-checker rendering map.

## Frontend — `packages/frontend/src/lib/api.ts`

- Add the lowercase type string to `FALLBACK_QUOTA_CHECKER_TYPES` Set.
- This is used when `/v0/management/quota-checker-types` hasn't responded yet or fails. If missing, the type won't appear in the dropdown until the API responds (or at all if the API fails).

## Frontend — Shared display components

### `CompactQuotasCard.tsx`
- Add checker ID detection, display name, icon prefix, and rendering logic.

### `CombinedBalancesCard.tsx`
- Add to `CHECKER_DISPLAY_NAMES` map (balance-type checkers only).

---

## Hybrid Balance + Rate-Limit Checkers

Some checkers (e.g. neuralwatt) return **both** a dollar balance and a rate-limit window (e.g. monthly kWh). These require extra steps:

1. **Backend** — set `category: 'balance'` (the dollar balance window drives the category).
2. **Display component** — render both the `Wallet`/dollar balance and a progress bar for the monthly window. Follow the `ApertisCodingPlanQuotaDisplay` pattern for the rate-limit part.
3. **Quotas.tsx** — add the type to `BALANCE_CHECKERS_WITH_RATE_LIMIT` so it appears in the rate-limit section as well as the balance card.
4. **Sidebar.tsx** — add the type to `BALANCE_CHECKERS_WITH_RATE_LIMIT` so it appears in both sidebar sections.
5. **CompactQuotasCard.tsx** — add a case to `getTrackedWindowsForChecker` returning the appropriate window types (e.g. `['monthly']`).

---

## Common Mistakes

- **Missing `FALLBACK_QUOTA_CHECKER_TYPES` in `api.ts`**: Provider edit modal uses `getQuotaCheckerTypes()` which falls back to this Set — if the type is absent the dropdown is empty until the API responds (or permanently if the API fails).
- **Missing `VALID_QUOTA_CHECKER_TYPES` in `config.ts`**: The backend API will never return the type to the frontend, even if all frontend registrations are correct.
- **Missing Postgres enum**: SQLite ignores enum enforcement; Postgres deployments will reject inserts.
