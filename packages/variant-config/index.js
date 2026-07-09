// @whizz/variant-config — per-variant manifests.
//
// Each variant declares WHAT it is here; the shared core reads the manifest at
// boot to decide which features to mount and how tenancy behaves.
//
// Target shape (populated in step 3):
//
//   export const clientWhizz = {
//     id: "client-whizz",
//     tenancyMode: "single",            // single -> tenant context is a constant
//     features: ["instructions", "wages", "subcontractors", "vat-recon"],
//     branding: { name: "Whizz Away", ... },
//   };
//
//   export const saas = {
//     id: "saas",
//     tenancyMode: "multi",             // multi -> tenant context from logged-in company
//     features: ["instructions", "wages", "subcontractors", "vat-recon",
//                "billing", "saas-admin"],
//     plans: [...],
//   };
export const variants = {};
