# packages/ — the shared skeleton

Code that every Whizz variant shares. Apps depend on these packages; they never
copy them. A fix here is instantly available to every app on the next build —
this is what replaces cherry-picking fixes between the OG and SaaS branches.

| Package | Purpose |
| --- | --- |
| `@whizz/core` | Shared models, controllers, services, UI components, business rules. |
| `@whizz/features` | Opt-in feature modules (routes + models + UI + tests per feature). |
| `@whizz/variant-config` | Per-variant manifests: enabled features, tenancy mode, branding, plans. |

## How variants differ, without branching

1. **Feature set** — a variant lists the features it wants in its manifest.
   Adding a feature to a client = one line; removing = delete the line.
2. **Tenancy** — `tenancyMode: "single"` makes the request-scoped tenant context
   return a constant (behaves like the OG); `"multi"` sources it from the
   logged-in company (SaaS). Same core code serves both.
3. **Config** — branding, allowed origins, plans live in the manifest.

These packages are stubs today. They are populated in steps 2–4 of the
migration (see the repo `README.md` / architecture notes).
