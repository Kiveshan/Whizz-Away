// @whizz/core — shared skeleton barrel.
//
// Re-exports every shared module so consumers import from a single specifier:
//
//   import { ROLES, dashboardForRole } from "@whizz/core";
//
// As more shared logic is extracted out of apps/client-whizz (step 2), add its
// re-export here. A fix in any of these reaches every variant on next build —
// no cherry-picking between the OG and SaaS branches.
export * from "./config/roles.js";
