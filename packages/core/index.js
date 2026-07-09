// @whizz/core — shared skeleton barrel.
//
// Re-exports side-effect-free shared modules so consumers import from a single
// specifier:
//
//   import { ROLES, dashboardForRole, validate, errorHandler } from "@whizz/core";
//
// Modules with import-time side effects (e.g. config/secrets.js runs
// dotenv.config() and may throw) are intentionally NOT re-exported here — they
// are exposed as explicit subpaths (e.g. "@whizz/core/secrets") so importing the
// barrel for one thing never triggers unrelated side effects. See package.json
// "exports".
//
// A fix in any of these reaches every variant on next build — no cherry-picking
// between the OG and SaaS branches.
export * from "./config/roles.js";
export * from "./middleware/errorHandler.js";
export * from "./middleware/validate.js";
export * from "./utils/passwordValidator.js";
