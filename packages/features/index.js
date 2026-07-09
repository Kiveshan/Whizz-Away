// @whizz/features — registry of opt-in feature modules.
//
// Empty for now. In step 2+ each feature (instructions, wages, subcontractors,
// billing, vat-recon, ...) becomes a self-contained folder here holding its own
// routes + models + UI + tests. A variant turns a feature on or off with a
// single line in its variant-config manifest — no dead code shipped, no
// per-variant branch.
export const featureRegistry = {};
