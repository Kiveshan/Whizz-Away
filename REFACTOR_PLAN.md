# Instruction Forms — Full Refactoring Plan

> **Scope:** `ControllerInstructions.jsx` (create) and `FCcontrollerinstructions.jsx` (update)
>
> **Goal:** Break both god-components into a shared utility / service / hook / UI-component
> stack so each file becomes a thin orchestrator of ~200 lines.
>
> **Rule:** Do not change any behaviour. Every step must leave all existing tests green.
> Write new tests for each extracted piece before moving on.
>
> **Working copies:** All work is done in `-refactored` files until Phase 12. The originals
> are never touched. Tests import originals directly and stay green throughout.

---

## Table of Contents

1. [Interface Flag Resolutions](#1-interface-flag-resolutions)
2. [Critical Functionality Checklist](#2-critical-functionality-checklist)
3. [Pure Utility Extraction](#3-pure-utility-extraction)
4. [Service Module](#4-service-module)
5. [Custom Hooks](#5-custom-hooks)
6. [UI Component Extraction](#6-ui-component-extraction)
7. [Resulting File Tree](#7-resulting-file-tree)
8. [Phased Execution Plan](#8-phased-execution-plan)
9. [Appendix — Known UNCLEAR Behaviours](#9-appendix--known-unclear-behaviours)

---

## 1. Interface Flag Resolutions

These are **pre-conditions**. Resolve all five before any extraction begins — the
existing characterization tests will catch regressions at each step.

---

### Flag 1 — Validation return shape

**Problem.** `validateForm` (create) returns a boolean and calls `setFieldErrors` as a
side-effect. `validateAllFields` (update) also returns a boolean and calls
`setFieldErrors` / `setContainerFieldErrors` as side-effects.

**Resolution.** The shared function in `validation.js` always returns a unified shape:

```js
{ isValid: boolean, fieldErrors: object, containerErrors: object }
```

The function never touches React state. Each component applies state at its own call site:

```js
// Create form
const { isValid, fieldErrors } = validateForm(formData, flags);
if (!isValid) setFieldErrors(fieldErrors);

// Update form
const { isValid, fieldErrors, containerErrors } = validateForm(formData, flags);
if (!isValid) {
  setFieldErrors(fieldErrors);
  setContainerFieldErrors(containerErrors);
}
return isValid;
```

> **Note:** The two forms have different required field sets. The create form requires
> `task`, `pickupTime`, `pickupDate` and restricts shipment types to Import/Export only.
> The update form requires `ksmFileRef`, `clientFileRef`, `bookingRef`, `description` and
> allows all shipment types. The shared function must accept a `mode` or `flags` argument
> to branch on these differences.

---

### Flag 2 — `checkRateCountMismatch` return contract

**Problem.** Create form returns `{ needsConfirmation, message }`. Update form returns a
boolean and calls `setConfirmationModal` inside the function body.

**Resolution.** The shared function in `rateCountMismatch.js` always returns
`{ needsConfirmation, message }`. The update form's `handleSaveChanges` owns the
side-effect at the call site:

```js
const { needsConfirmation, message } = checkRateCountMismatch(formData, flags);
if (needsConfirmation) {
  setConfirmationModal({ isOpen: true, message, action: "save" });
  return;
}
// proceed with save
```

---

### Flag 3 — Loading gate key count (4 vs 5 keys)

**Problem.** Create form `isLoading` has 4 keys. Update form adds `instruction`
(for `fetchInitialData`).

**Resolution.** `useInstructionData` always exposes all five keys. It accepts options:

```js
useInstructionData({ fetchExisting: false })               // create form
useInstructionData({ fetchExisting: true, instructionId }) // update form
```

When `fetchExisting: false` the hook sets `isLoading.instruction = false` on mount and
never changes it. The `isLoadingComplete` expression is identical in both callers.

---

### Flag 4 — `initializeContainers` closure over `containers` state

**Problem.** Both forms close over `containers` state inside `initializeContainers`,
creating render-loop risk. The update form already has `containersRef` as a fix; the
create form has the same pattern (dep array includes `containers` at line 385).

**Resolution.** `initializeContainers` inside `useContainerManagement` takes the current
containers as an explicit parameter — no closure over state:

```js
initializeContainers(currentContainers, counts)
```

The `useCallback` dependency array becomes stable. The calling `useEffect` passes
`containersRef.current` explicitly.

---

### Flag 5 — `ErrorTooltip` intentionally null in create form

**Problem.** Create form has `const ErrorTooltip = () => null` at line 1831. Update form
defines `InstructionErrorTooltip` (top-level, line 10) and `ErrorTooltip` (inner, line ~4290,
different CSS class). These two different tooltip styles must not be silently merged.

**Resolution (Option B).** Extract to a shared component with a `disabled` prop:

```jsx
// src/components/instructions/ErrorTooltip.jsx
export function ErrorTooltip({ message, disabled = false }) {
  if (disabled || !message) return null;
  return (
    <div className="controller-instructions-error-tooltip">
      {message}
      <div className="controller-instructions-tooltip-arrow" />
    </div>
  );
}
```

- **Update form** imports it with no `disabled` prop — tooltips active.
- **Create form** imports it and passes `disabled` — tooltips suppressed as before.
- The top-level `ErrorTooltip` in the update form (line 10, uses `error-tooltip` CSS class)
  is a different component entirely — see Appendix for details. It must be removed and
  the update form's JSX that uses it must be migrated to `InstructionErrorTooltip` style.

---

## 2. Critical Functionality Checklist

Read this before starting any phase. Every item below is behaviour that must survive
the refactor unchanged.

---

### 2a — Create Form (ControllerInstructions.jsx)

| Behaviour | Location | Notes |
|---|---|---|
| Does NOT save to API — navigates to `/FCcontrollerInstructionDetails` on submit | `handleSubmit` | The detail/container entry page is a third component. The create form only collects top-level fields. |
| `isImport`, `isExport`, `isCrossHaul`, `isWeightBased` as explicit React state | ~line 122 | Derived via `useEffect` from `formData.rateWeight` / `formData.shipmentTypeId`. These are NOT just computed inline. |
| Rate field names `sixMeterRate` / `twelveMeterRate` / `abnormalRate` | formData | Create form uses different field names from update form (`rateper_6` etc). Must survive into the detail page's state. |
| `rateLockStatus` + `rateFieldsEnabled` states | ~line 224 | Rates auto-lock when fetched from DB; only editable if DB has no value. |
| `clientStartingPoints` / `clientDestinations` (separate from `startingPoints` / `destinations`) | ~line 143 | Create form fetches into these local arrays on client change. |
| `showNoRatesModal` when client has no configured rates | ~line 146 | Opens if starting-points fetch returns 404. |
| `showConfirmationPopup` + `confirmationMessage` | ~line 138 | String-based confirmation, different shape from FC's `confirmationModal` object. |
| `initializeContainers` preserves existing container data when count changes | ~line 301 | Uses `getOrCreateContainer` helper to keep entered data when user increases count. |
| `showContainerDetails` boolean | ~line 165 | Set false when container list is empty or weight-based; hides the container table entirely. |
| `containersRef` + `weightRowsRef` | ~line 164, 169 | Both forms use refs to protect against stale closures. Must be exposed by hooks. |
| `isAddOn` derived from `shipmentTypeId === "5"` | ~line 678 | Inline computed on each render — does not need state. |
| `allowVgmUI = shipmentTypeId !== "4"` | ~line 683 | VGM disabled for type 4. Same in both forms. |
| Restricted shipment types: `validateForm` errors if not Import/Export | ~line 3963 | Create form deliberately prevents saving Cross-Haul/Add-On at this stage. |
| `handleRetryFetch` data reload | ~line 4255 | Re-triggers all fetch functions. |

---

### 2b — Update Form (FCcontrollerinstructions.jsx)

| Behaviour | Location | Notes |
|---|---|---|
| Saves directly to API via `performSave` (PUT) | ~line 1351 | Two-step: `handleSaveChanges` validates, `performSave` calls API. |
| `warningModal` state (separate from `confirmationModal`) | ~line 383 | Fires when user tries to switch to type 4 with non-zero container counts. Uses `ErrorModal` component with `type="warning"` and an `onConfirm` callback stored in state. |
| `isReadOnly = formData.status === "Completed"` | ~line 267 | Locks entire form when instruction is completed. |
| `isInvoiced` checked on mount via `checkIfInvoiced` | ~line 409, 936 | Hides Invoice button once invoice exists. |
| `prevContainerCounts` + rate auto-population | ~line 159, 2205 | When a container count goes from 0 to >0, the corresponding rate auto-fills from the selected client's default rate — but only if the current rate is empty/zero. |
| `containersRef` used in `performSave` | ~line 397, 1612 | Avoids stale closure: `containersRef.current` is read at save-time, not `containers` state. **CRITICAL — must be exposed by `useContainerManagement`**. |
| `fetchFreshAmounts` inside `performSave` | ~line 1446 | Right before save, re-fetches surcharge/hazardous/VGM amounts for all flagged containers to prevent race conditions. Must be preserved in the save service function. |
| `historicalSetRate` + `showSetRateWarning` | ~line 118, 363 | Loaded from DB; compared against current set rate to show amber warning. |
| `isSetRate` (checkbox boolean) vs `isSetRateMode` (kept in sync via `useEffect`) | ~line 115, 351 | Two separate pieces of state. `isSetRateMode` is derived from `isSetRate` but both must exist. |
| Route sync effects — auto-correct pickup/dropoff if DB renamed them | ~line 2671, 2747 | After starting points load, if current pickup doesn't match any option, try fuzzy-match and auto-update. Respect `routeEditMode === "locked"`. |
| `routeEditMode` + `hasRouteMismatch` | ~line 286 | When a legacy route exists that no longer matches any client rates, show it read-only with an "unlock" confirmation. |
| `updatePreservedContainers` | ~line 3837 | Keeps `preservedContainers` in sync when the user changes container counts. |
| `rateUpdateMessage` transient feedback | ~line 114 | "Rates updated" toast shown for 3s after route change triggers rate fetch. |
| `handleConfirmAction` routes 6 action types | ~line 1834 | `save`, `delete`, `invoice`, `delete-container`, `delete-weight`, `unlock-route`. |
| `validateForm` + `handleSubmit` (lines ~3919, ~4136) | ~line 3919 | These appear to be legacy create-form code still present in the file. Verify whether they are dead code before extraction — see Appendix. |
| Break bulk cost calculation in `performSave` matches `recalculateTotalCost` | ~line 1424, 2929 | Both must use `weightRows × unitRate` for type 4. Bug-fixed. |
| `checkIfInvoiced` calls `fetchOriginalData` to get `m1key` | ~line 936 | Two-step: get instruction data, then check invoice table. |
| Delete instruction + Create invoice flows | ~line 1268, 1311 | Both go through `confirmationModal` before executing. |

---

## 3. Pure Utility Extraction

No React dependencies. Safest to extract first; easiest to unit-test in isolation.

---

### `src/utils/instructions/validation.js`

**Responsibility.** All field-level and form-level validation rules.

**Exports:**
| Export | Signature | Notes |
|---|---|---|
| `isFieldValid` | `(fieldName, value, flags)` → `boolean` | Single-field rule. `flags = { isCrossHaul, isWeightBased, isSetRate }` |
| `validateForm` | `(formData, containers, flags)` → `{ isValid, fieldErrors, containerErrors }` | Unified return shape — see Flag 1. `flags.mode = "create" | "update"` controls required fields and shipment-type restriction. |

**Depends on:** nothing outside this file.

---

### `src/utils/instructions/costCalculation.js`

**Responsibility.** All cost arithmetic. No API calls, no state.

**Exports:**
| Export | Signature | Notes |
|---|---|---|
| `calcContainerBasedCost` | `(formData, containers, { isCrossHaul })` → `number` | Create-form variant — no surcharge/hazardous/VGM |
| `calculateTotalCostFromRates` | `(rate6, rate12, rateAbnormal, count6, count12, countAbnormal, containers)` → `number` | Update-form variant for container-based shipments (types 1, 2, 3). Includes surcharge, hazardous, VGM per container. |
| `calcBreakBulkCost` | `(weightRows, unitRate, { isSetRateMode, setRateAmount })` → `number` | For type 4 (break bulk). Set rate mode: `setRateAmount × rowCount`. Otherwise: `sum(rowWeights) × unitRate`. **Added to fix a bug where `performSave` fell through to container-based formula for type 4, yielding 0.** |

> ⚠️ `recalculateTotalCost` and `performSave` must use identical branching for type 4.
> Do not let them diverge.

> **Note:** These remain separate exports because their inputs and included charges
> differ. Do not merge into one function with a flag until the product difference is
> intentionally reconciled.

**Depended on by:** `useRateManagement.js`, both form files.

---

### `src/utils/instructions/rateCountMismatch.js`

**Responsibility.** Detect whether a rate count vs container count mismatch needs user
confirmation.

**Exports:**
| Export | Signature | Notes |
|---|---|---|
| `checkRateCountMismatch` | `(formData, { isAddOn })` → `{ needsConfirmation, message }` | Unified shape — see Flag 2. Returns `{ needsConfirmation: false }` when `isAddOn` is true (skip check). Does NOT check break-bulk — see Appendix. |

**Depended on by:** both form files (call sites own the modal side-effect).

---

### `src/utils/instructions/dateFormatting.js`

**Responsibility.** Date string normalization.

**Exports:**
| Export | Signature | Notes |
|---|---|---|
| `formatDateForDB` | `(dateString)` → `string \| null` (ISO YYYY-MM-DD) | Used in `performSave`. |
| `formatDateForInput` | `(dateString)` → `string` (YYYY-MM-DD) | Used when loading data into `<input type="date">` fields. |

> ⚠️ **UNCLEAR — timezone behaviour depends on runtime locale.** Both functions use
> `new Date(dateString)` which varies by environment. Annotate with
> `// UNCLEAR — verify timezone behaviour before widening usage`.

**Depended on by:** `FCcontrollerinstructions.jsx` save handler and data load.

---

## 4. Service Module

---

### `src/services/instructionService.js`

**Responsibility.** All HTTP calls to the instructions API. One function per endpoint.
No state, no React.

**Exports:**
| Export | Endpoint | Returns |
|---|---|---|
| `fetchClients()` | `GET /api/instructions/active-clients` | `Promise<Client[]>` |
| `fetchShipmentTypes()` | `GET /api/instructions/shipment-types` | `Promise<ShipmentType[]>` |
| `fetchStartingPoints(clientId)` | `GET /api/…/starting-points` | `Promise<StartingPoint[]>` |
| `fetchDestinations(clientId, pickup)` | `GET /api/…/destinations/…` | `Promise<Destination[]>` |
| `fetchRates(clientId, pickup, dropoff)` | `GET /api/…/rates` | `Promise<RateData>` |
| `fetchSetRate(clientId, pickup, dropoff)` | `GET /api/…/set-rate/…/…` | `Promise<{ set_rate: number }>` |
| `fetchInstructionData(instructionId)` | `GET /api/instructions/fc/instruction/:id` | `Promise<Instruction>` |
| `saveInstruction(payload)` | Used indirectly — create form navigates, does not POST | N/A — see note below |
| `updateInstruction(instructionId, payload)` | `PUT /api/instructions/fc/update/:id` | `Promise<Response>` |
| `deleteInstruction(instructionId)` | `DELETE /api/instructions/fc/instruction/:id` | `Promise<Response>` |
| `createInvoice(m1key)` | `POST /generate-invoice/:m1key` | `Promise<Response>` |
| `checkContainerLegsExist(instructionId, containerNum)` | `GET /api/instructions/fc/container/:id/:num/legs-exists` | `Promise<{ hasLegs: boolean }>` |
| `checkIfInvoiced(m1key)` | `GET /api/invoice/check/:m1key` | `Promise<{ exists: boolean }>` |
| `fetchClientRates(clientId, pickup, dropoff)` | `GET /api/instructions/client/:id/rates` | `Promise<Rates>` — used by surcharge/hazardous/VGM fetches |

> **Create form submit flow:** `ControllerInstructions.jsx` does NOT call a save API.
> On submit it navigates to `/FCcontrollerInstructionDetails` with `controllerData` in
> `location.state`. The actual instruction creation happens in that third component.
> `instructionService.js` does not need a `saveInstruction` function for the create form.

> **`fetchFreshAmounts` race-condition fix:** Before `performSave` sends the PUT request,
> it re-fetches surcharge/hazardous/VGM amounts from `fetchClientRates` for every
> container that has those flags enabled. This prevents stale amounts when the user clicks
> Save before the async fetches triggered by checkboxes have settled. The service module
> must expose `fetchClientRates` so this logic can be called from the save handler.

**Depended on by:** `useInstructionData.js`, `useRateManagement.js`, `useContainerManagement.js`, both form files.

---

## 5. Custom Hooks

---

### `src/hooks/useInstructionData.js`

**Responsibility.** Data fetching lifecycle — clients, shipment types, starting points,
destinations, and optionally an existing instruction record. Owns all `isLoading` flags.
Also owns route-mismatch detection.

**Options:** `{ fetchExisting: boolean, instructionId?: string }` — see Flag 3.

**Exports:**
```js
{
  clients,
  shipmentTypes,
  startingPoints,
  destinations,
  isLoading: { clients, shipmentTypes, startingPoints, destinations, instruction },
  isLoadingComplete,
  hasRouteMismatch,       // update form: true when current route not in API results
  routeEditMode,          // "editable" | "locked"
  setRouteEditMode,       // called when user confirms route unlock
  refetch,
}
```

**Route sync behaviour to preserve (update form only):** After starting points load, if
`formData.pickup` is not in the list, attempt a fuzzy match and auto-update. Same for
`dropoff` after destinations load. Skip sync entirely when `routeEditMode === "locked"`.

**Depended on by:** `ControllerInstructions.jsx`, `FCcontrollerinstructions.jsx`.

---

### `src/hooks/useContainerManagement.js`

**Responsibility.** Container list state — initialisation, per-field changes, uniqueness
validation, deletion (including legs check for the update form).

**Exports:**
| Export | Type | Notes |
|---|---|---|
| `containers` | `Container[]` | Current container array |
| `containersRef` | `React.MutableRefObject<Container[]>` | **Must be exposed.** Used by `performSave` to read latest containers synchronously and avoid stale closure. |
| `containerFieldErrors` | `object` | Per-container validation state |
| `isContainerLoading` | `boolean` | True during API container fetch |
| `isContainerDataModified` | `boolean` | True after any container field edit |
| `containerSuccessMessage` | `string` | Set after successful save |
| `containerToDelete` | `Container \| null` | Pending deletion, set by `handleRequestDeleteContainer` |
| `initializeContainers` | `(currentContainers, counts) => void` | Explicit parameter — see Flag 4 |
| `handleContainerChange` | `(id, field, value) => void` | |
| `validateContainerUniqueness` | `(isAddOn) => boolean` | |
| `handleRequestDeleteContainer` | `(container, instructionId) => Promise<void>` | Checks legs via service, sets `containerToDelete`, returns `{ message }` |
| `confirmDeleteContainer` | `() => void` | Executes queued deletion |
| `cancelDeleteContainer` | `() => void` | Clears `containerToDelete` |

> **`preservedContainers`** is tightly coupled to navigation state (`location.state`) and
> is updated by `updatePreservedContainers` when counts change. Keep it in the orchestrator
> rather than the hook to avoid hidden coupling to React Router.

---

### `src/hooks/useRateManagement.js`

**Responsibility.** Rate fetching, lock state, surcharge lookups, total cost recalculation.
Handles both the create form's `rateLockStatus`/`rateFieldsEnabled` pattern and the update
form's set-rate + historical-rate pattern.

**Exports:**
| Export | Type | Notes |
|---|---|---|
| `rateFieldsEnabled` | `object` | Which rate inputs are active (driven by container counts > 0) |
| `rateLockStatus` | `object` | Create form: rates locked when fetched from DB |
| `isSetRate` | `boolean` | Checkbox state |
| `isSetRateMode` | `boolean` | Derived from `isSetRate`, kept in sync |
| `setRateValue` | `number` | Current set rate from DB |
| `historicalSetRate` | `number \| null` | Update form only: stored at last save, used for warning |
| `showSetRateWarning` | `boolean` | True when historical ≠ current and status is New/In Progress |
| `rateUpdateMessage` | `string` | Transient "Rates updated" feedback message |
| `fetchRates` | `(clientId, pickup, dropoff) => Promise<void>` | Fetches and applies rates to formData |
| `fetchSurchargeAmount` | `(containerId) => Promise<void>` | Fetches surcharge for a single container |
| `fetchFreshAmounts` | `(containers, formData) => Promise<Container[]>` | Pre-save race-condition fix: re-fetches surcharge/hazardous/VGM for all flagged containers |
| `recalculateTotalCost` | `(formData, containers, weightRows) => void` | Branches by shipment type — see table below |

**`recalculateTotalCost` branching (must be preserved exactly):**
| Condition | Calculation |
|---|---|
| `isAddOn` (type 5) | Forces total_cost = 0, zeroes all rate fields |
| `shipmentTypeId === "4"` + `isSetRateMode` | `setRateAmount × weightRows.length` |
| `shipmentTypeId === "4"` + `rateWeight` is `"kg"` or `"ton"` | `sum(weightRows[].weight) × unitRate` |
| All other shipment types | `calculateTotalCostFromRates(rates, counts, containers)` |

**Depended on by:** both form files.

---

### `src/hooks/useWeightRows.js`

**Responsibility.** Weight row state for Cross-Haul Weight (`shipmentTypeId === "4"`).

**Exports:**
| Export | Type | Notes |
|---|---|---|
| `weightRows` | `WeightRow[]` | |
| `weightRowsRef` | `React.MutableRefObject<WeightRow[]>` | Create form uses this for stale-closure protection (mirrors `containersRef`) |
| `weightRowToDelete` | `WeightRow \| null` | Pending deletion |
| `addWeightRow` | `() => void` | |
| `updateWeightRow` | `(id, field, value) => void` | |
| `handleRequestDeleteWeightRow` | `(row) => void` | Sets `weightRowToDelete` |
| `confirmDeleteWeightRow` | `() => void` | Executes queued deletion |
| `cancelDeleteWeightRow` | `() => void` | |

**Depended on by:** both form files.

---

## 6. UI Component Extraction

Pure presenters: receive props, render markup, call callbacks. No direct API calls,
no `useEffect` with fetches.

---

### `src/components/instructions/ErrorTooltip.jsx`

See Flag 5 resolution. `disabled` prop suppresses tooltip in create form.

---

### `src/components/instructions/InstructionLoadingGate.jsx`

**Props:** `{ isLoadingComplete, hasDataFailure, failureMessage, onRetry, children }`

Renders: loading spinner, failure message + Retry button, or children.

---

### `src/components/instructions/InstructionBanners.jsx`

**Update form only.** Renders the amber read-only banner and red break-bulk set-rate
warning banner.

**Props:** `{ isReadOnly, status, showSetRateWarning, historicalSetRate, setRateValue }`

---

### `src/components/instructions/ClientInfoSection.jsx`

**Props:** `{ formData, clients, fieldErrors, fieldRefs, isReadOnly, clientLocked, readOnlyStyle, nonEditableStyle, onClientChange, onChange, showCreationDate }`

> Update form passes `clientLocked={true}` — Client dropdown is always `disabled`.

---

### `src/components/instructions/ContainerCountsSection.jsx`

**Props:** `{ formData, fieldErrors, fieldRefs, isWeightBased, isSetRateMode, isReadOnly, readOnlyStyle, onCountChange, onRateChange }`

---

### `src/components/instructions/UnitPerSection.jsx`

**Props:** `{ formData, isWeightBased, isSetRateMode, isAddOn, isSetRate, setRateValue, historicalSetRate, isReadOnly, fieldErrors, fieldRefs, readOnlyStyle, onUnitChange, onWeightChange, onRateChange, onSetRateToggle }`

---

### `src/components/instructions/BookingDetailsSection.jsx`

**Props:** `{ formData, shipmentTypes, startingPoints, destinations, fieldErrors, fieldRefs, isReadOnly, readOnlyStyle, routeEditMode, hasRouteMismatch, onChange, onShipmentTypeChange, onPickupChange, onDropoffChange, onRouteMismatchClick }`

**Conditional rendering:**
- ETA vs Stack Date label based on `shipmentTypeId === "1"`
- Vessel Name hidden when `shipmentTypeId === "4"`
- Locked-route read-only inputs when `routeEditMode === "locked" && hasRouteMismatch`

---

### `src/components/instructions/WeightDetailsTable.jsx`

**Props:** `{ weightRows, rateWeight, isReadOnly, onUpdate, onDelete, onAdd }`

---

### `src/components/instructions/ContainerDetailsTable.jsx`

**Props:** `{ containers, formData, containerFieldErrors, isReadOnly, isImport, allowVgmUI, readOnlyStyle, onContainerChange, onHazardousChange, onSurchargesChange, onVGMChange, onDeleteRequest }`

---

### `src/components/instructions/CostSummary.jsx`

**Props:** `{ totalCost, vat }`

---

### `src/components/instructions/ActionButtons.jsx`

**Props:** `{ mode, isReadOnly, isInvoiced, isSubmitting, status, onSave, onDelete, onInvoice, onBack }`

---

### `src/components/instructions/ConfirmationModal.jsx`

**Generic confirmation dialog.** Replaces the inline JSX confirmation block in both
files AND the `warningModal` that the update form currently sends through `ErrorModal`.

**Props:**
| Prop | Type | Default |
|---|---|---|
| `isOpen` | `boolean` | — |
| `title` | `string` | `"Confirm"` |
| `message` | `string` | — |
| `onConfirm` | `() => void` | — |
| `onCancel` | `() => void` | — |
| `confirmText` | `string` | `"Yes, Continue"` |
| `cancelText` | `string` | `"No, Let Me Edit"` |

**Update form action types routed through `handleConfirmAction`:**
| `action` | Triggered by | Confirm behaviour |
|---|---|---|
| `"save"` | Rate/count mismatch | `performSave()` |
| `"delete"` | Delete Instruction | `performDelete()` |
| `"invoice"` | Invoice button | `performInvoiceCreation()` |
| `"delete-container"` | Container Delete (post legs-check) | Removes container, recalculates counts |
| `"delete-weight"` | Weight row Delete | Removes row from `weightRows` |
| `"unlock-route"` | Click locked pickup/dropoff | Clears route lock, resets pickup + dropoff |

**`warningModal` (update form — currently a separate `ErrorModal` call):**
The "switch to type 4 with non-zero containers" warning is currently handled via a
separate `warningModal` state with an `onConfirm` callback stored in state. During
`ConfirmationModal` extraction, collapse this into `confirmationModal` with
`action: "reset-counts"` and the callback handled by `handleConfirmAction`.

> ⚠️ **BUG (line 6222):** Modal title is hardcoded `"Confirm Save"` for all 6 action
> types. Fix during extraction: derive from `action` or accept `title` as prop from caller.

---

## 7. Resulting File Tree

```
src/
├── utils/
│   └── instructions/
│       ├── validation.js
│       ├── costCalculation.js
│       ├── rateCountMismatch.js
│       └── dateFormatting.js
│
├── services/
│   └── instructionService.js
│
├── hooks/
│   ├── useInstructionData.js
│   ├── useContainerManagement.js
│   ├── useRateManagement.js
│   └── useWeightRows.js
│
├── components/
│   └── instructions/
│       ├── ErrorTooltip.jsx
│       ├── InstructionLoadingGate.jsx
│       ├── InstructionBanners.jsx
│       ├── ClientInfoSection.jsx
│       ├── ContainerCountsSection.jsx
│       ├── UnitPerSection.jsx
│       ├── BookingDetailsSection.jsx
│       ├── WeightDetailsTable.jsx
│       ├── ContainerDetailsTable.jsx
│       ├── CostSummary.jsx
│       ├── ActionButtons.jsx
│       └── ConfirmationModal.jsx
│
└── pages/
    └── instructions/
        ├── createInstruction/
        │   └── views/
        │       └── ControllerInstructions.jsx        ← orchestrator ~200 lines
        └── updateInstruction/
            └── views/
                └── FCcontrollerinstructions.jsx      ← orchestrator ~200 lines
```

---

## 8. Phased Execution Plan

Each phase is scoped to be completable in one session. **Entry condition:** previous
phase's tests are all green. **Exit condition:** all existing tests still green +
any new tests written for that phase also green.

Work is always done on `-refactored` files. Originals are untouched until Phase 12.

---

### Phase 1 — Interface normalization

**Scope:** Resolve Flags 2, 4, 5. Create the three working-copy files. Update `index.js`.

**New files:**
- `src/components/instructions/ErrorTooltip.jsx` — shared tooltip component
- `ControllerInstructions-refactored.jsx` — full copy with: Flag 4 (use `containersRef.current` in `initializeContainers`, remove `containers` from dep array) + Flag 5 (import shared `ErrorTooltip` with `disabled`)
- `FCcontrollerinstructions-refactored.jsx` — full copy with: Flag 2 (`checkRateCounterMismatch` returns `{ needsConfirmation, message }`, call site updated in `handleSaveChanges`) + Flag 5 (remove top-level `ErrorTooltip` and inner `InstructionErrorTooltip`, import shared `ErrorTooltip`)

**Updated files:**
- `index.js` — point both exports to `-refactored` files

**Verify:** All existing characterization tests pass (they import originals directly).

---

### Phase 2 — Pure utility extraction

**Scope:** Extract `validation.js`, `costCalculation.js`, `rateCountMismatch.js`,
`dateFormatting.js`. Update both `-refactored` files to import from them.

**New files:** 4 utility modules under `src/utils/instructions/`

**New tests:** Unit tests for each utility (pure functions — easy to test in isolation).

**Verify:** All existing tests pass + new utility tests pass.

---

### Phase 3 — Service module

**Scope:** Extract all `api.get/put/delete/post` calls into `instructionService.js`.
Update both `-refactored` files to call the service. Keep `fetchFreshAmounts` logic
in the service or as a helper called by the save handler — do not lose it.

**New files:** `src/services/instructionService.js`

**New tests:** Service tests (mock `api`).

**Verify:** All tests pass.

---

### Phase 4 — `useInstructionData` hook

**Scope:** Extract all loading logic — clients, shipment types, starting points,
destinations, and (update form) existing instruction data. Includes route sync effects
(`hasRouteMismatch`, `routeEditMode`) and `isLoadingComplete` calculation.

**New files:** `src/hooks/useInstructionData.js`

**New tests:** Hook tests with mocked service.

**Verify:** All tests pass.

---

### Phase 5 — `useContainerManagement` hook

**Scope:** Extract container state, `initializeContainers` (explicit-parameter version),
`handleContainerChange`, `validateContainerUniqueness`, deletion flow (legs check +
confirmation). **Must expose `containersRef`.**

**New files:** `src/hooks/useContainerManagement.js`

**New tests:** Hook tests.

**Verify:** All tests pass.

---

### Phase 6 — `useRateManagement` hook

**Scope:** Extract rate fetching, `rateLockStatus`, `rateFieldsEnabled`, set-rate logic
(`isSetRate`/`isSetRateMode`/`setRateValue`/`historicalSetRate`/`showSetRateWarning`),
surcharge/hazardous/VGM fetches, `fetchFreshAmounts`, `recalculateTotalCost` (all
branches, using `calcBreakBulkCost` for type 4), `rateUpdateMessage`.

**New files:** `src/hooks/useRateManagement.js`

**New tests:** Hook tests.

**Verify:** All tests pass.

---

### Phase 7 — `useWeightRows` hook

**Scope:** Extract weight row CRUD. Expose `weightRowsRef`.

**New files:** `src/hooks/useWeightRows.js`

**New tests:** Hook tests.

**Verify:** All tests pass.

---

### Phase 8 — Atomic UI components

**Scope:** `ErrorTooltip` (already done in Phase 1), `ConfirmationModal` (unify
`confirmationModal` + `warningModal`, fix hardcoded title bug), `InstructionLoadingGate`,
`InstructionBanners`, `CostSummary`, `ActionButtons`.

**New files:** 5 components under `src/components/instructions/`

**Verify:** All tests pass. Visual check of both forms in browser.

---

### Phase 9 — Section components (Part 1)

**Scope:** `ClientInfoSection`, `ContainerCountsSection`.

Before extraction: move any anonymous `onChange` handlers to named functions so they
can be passed as props.

**New files:** 2 components.

**Verify:** All tests pass. Visual check.

---

### Phase 10 — Section components (Part 2)

**Scope:** `UnitPerSection`, `BookingDetailsSection`.

**New files:** 2 components.

**Verify:** All tests pass. Visual check.

---

### Phase 11 — Table components

**Scope:** `WeightDetailsTable`, `ContainerDetailsTable`. These are the most complex
presenters — extract last when everything else is stable.

**New files:** 2 components.

**Verify:** All tests pass. Visual check of container entry and weight rows.

---

### Phase 12 — Final orchestrators + cleanup

**Scope:** Slim both page files to ~200-line orchestrators. Replace originals with
`-refactored` versions. Remove `-refactored` suffix. Update all imports. Delete dead
code (see Appendix — `validateForm` and `handleSubmit` in FC file if confirmed dead).

**Verify:** Full test suite green. Full visual + functional regression check of both
forms (create instruction, update instruction, type 4, set rate, invoice, delete,
locked route).

---

## 9. Appendix — Known UNCLEAR Behaviours

| Function | File | Flag | Approx. Line |
|---|---|---|---|
| `validateForm` + `handleSubmit` | `FCcontrollerinstructions.jsx` | These appear to be dead code — legacy from when the FC file contained create-form logic. `handleSubmit` navigates to `/FCcontrollerInstructionDetails` but no JSX button in the update form calls it. Verify by searching for `handleSubmit` call sites in JSX before Phase 12. If confirmed dead, delete in Phase 12. | ~3919, ~4136 |
| `calcContainerBasedCost` | `ControllerInstructions.jsx` | Set-rate mode + add-on interaction: `isSetRateMode` branch runs before `!isAddOn` check — order may be intentional or a bug | ~1492 |
| `checkRateCounterMismatch` | `FCcontrollerinstructions.jsx` | Does NOT check break-bulk — unclear if omission is intentional | ~1082 |
| `formatDateForDB` / `formatDateForInput` | `FCcontrollerinstructions.jsx` | ISO string parsing is timezone-dependent | ~1354, ~3454 |
| `isCrossHaulShipment` | `FCcontrollerinstructions.jsx` | Checks name "cross-haul" OR hardcodes id `"4"` — dual check may cause divergence | ~3443 |
| Confirmation modal title | `FCcontrollerinstructions.jsx` | Title hardcoded as `"Confirm Save"` for all 6 action types — fix during `ConfirmationModal` extraction | ~6222 |
| Top-level `ErrorTooltip` (line 10) vs inner `InstructionErrorTooltip` (~line 4290) | `FCcontrollerinstructions.jsx` | Two different tooltip implementations with different CSS classes (`error-tooltip` vs `controller-instructions-error-tooltip`). The top-level one is used in some JSX; the inner one in others. Unify to the `controller-instructions-error-tooltip` style during Phase 1. | 10, ~4290 |
| `recalculateTotalCost` / `performSave` type-4 branch | `FCcontrollerinstructions.jsx` | Bug-fixed: both now use `weightRows × unitRate`. Edge case: if `rateWeight === "Container"` for type 4 (should not happen — UI defaults to "ton"), `performSave` else branch yields 0. Verify before extraction. | ~2929, ~1424 |
| `task` field name (create) vs `ksmFileRef` (update) | Both files | Create form uses `task`; update form uses `ksmFileRef`. These likely map to the same DB column. Confirm the mapping before writing `instructionService.js` to ensure the payload field names are correct for each form. | — |
