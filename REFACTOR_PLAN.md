# Instruction Forms — Full Refactoring Plan

> **Scope:** `ControllerInstructions.jsx` (create) and `FCcontrollerinstructions.jsx` (update)
>
> **Goal:** Break both god-components into a shared utility / service / hook / UI-component
> stack so each file becomes a thin orchestrator of ~200 lines.
>
> **Rule:** Do not change any behaviour. Every step must leave all existing tests green.
> Write new tests for each extracted piece before moving on.

---

## Table of Contents

1. [Interface Flag Resolutions](#1-interface-flag-resolutions) ← do these first
2. [Pure Utility Extraction](#2-pure-utility-extraction)
3. [Service Module](#3-service-module)
4. [Custom Hooks](#4-custom-hooks)
5. [UI Component Extraction](#5-ui-component-extraction)
6. [Resulting File Tree](#6-resulting-file-tree)
7. [Recommended Extraction Order](#7-recommended-extraction-order)

---

## 1. Interface Flag Resolutions

These are **pre-conditions**. Resolve all five before any extraction begins — the
existing characterization tests will catch regressions at each step.

---

### Flag 1 — Validation return shape

**Problem.** `validateForm` (create) returns an errors object (empty = valid).
`validateAllFields` (update) returns a boolean and calls `setFieldErrors` /
`setContainerFieldErrors` as side-effects inside the function body.

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

The utility detects. The component decides what to open.

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
never changes it. The `isLoadingComplete` expression is identical in both callers — the
create form's `instruction` flag is always false from the start.

---

### Flag 4 — `initializeContainers` closure over `containers` state

**Problem.** The create form closes over `containers` state in `initializeContainers`
via `useCallback`, creating the same render-loop risk that was already fixed in the
update form.

**Resolution.** `initializeContainers` inside `useContainerManagement` takes the current
containers as an explicit parameter — no closure over state:

```js
initializeContainers(currentContainers, counts)
```

The `useCallback` dependency array becomes stable. The calling `useEffect` passes
`containers` explicitly.

---

### Flag 5 — `ErrorTooltip` intentionally null in create form

**Problem.** Create form has `const ErrorTooltip = () => null` at line 1831. Update form
has a real implementation (`InstructionErrorTooltip`). Sharing without care silently
enables suppressed UI.

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
- Enabling tooltips on the create form later = remove `disabled` from those JSX call
  sites. That is a product decision, not a refactor decision — it stays visible and
  one-word traceable in the JSX.

---

## 2. Pure Utility Extraction

No React dependencies. Safest to extract first; easiest to unit-test in isolation.

---

### `src/utils/instructions/validation.js`

**Responsibility.** All field-level and form-level validation rules.

**Exports:**
| Export | Signature | Notes |
|---|---|---|
| `isFieldValid` | `(fieldName, value, { isCrossHaul, isWeightBased, isSetRate })` → `boolean` | Single-field rule |
| `validateForm` | `(formData, flags)` → `{ isValid, fieldErrors, containerErrors }` | Unified return shape — see Flag 1 |

**Depends on:** nothing outside this file.

**Depended on by:** `ControllerInstructions.jsx`, `FCcontrollerinstructions.jsx` (and
their future hook wrappers).

---

### `src/utils/instructions/costCalculation.js`

**Responsibility.** All cost arithmetic. No API calls, no state.

**Exports:**
| Export | Signature | Notes |
|---|---|---|
| `calcContainerBasedCost` | `(formData, containers, { isCrossHaul })` → `number` | Create-form variant — no surcharge/hazardous/VGM |
| `calculateTotalCostFromRates` | `(rate6, rate12, rateAbnormal, count6, count12, countAbnormal, containers)` → `number` | Update-form variant — includes surcharge, hazardous, VGM per container |

> **Note:** These remain separate exports because their inputs and included charges
> differ. Do not merge them into one function with a flag until the product difference is
> intentionally reconciled.

**Depended on by:** `useRateManagement.js`, both form files.

---

### `src/utils/instructions/rateCountMismatch.js`

**Responsibility.** Detect whether a rate count vs container count mismatch needs user
confirmation.

**Exports:**
| Export | Signature | Notes |
|---|---|---|
| `checkRateCountMismatch` | `(formData, flags)` → `{ needsConfirmation, message }` | Unified shape — see Flag 2 |

**Depended on by:** both form files (call sites own the modal side-effect).

---

### `src/utils/instructions/dateFormatting.js`

**Responsibility.** Date string normalization for DB persistence.

**Exports:**
| Export | Signature | Notes |
|---|---|---|
| `formatDateForDB` | `(dateString)` → `string` (ISO) | Timezone-dependent — see warning below |

> ⚠️ **UNCLEAR — timezone behaviour depends on runtime locale.** ISO string parsing
> varies by environment. Add `// UNCLEAR — verify timezone behaviour before relying on
> this in other contexts` and test with explicit UTC offsets before widening usage.

**Depended on by:** `FCcontrollerinstructions.jsx` save handler (and the future save
service).

---

## 3. Service Module

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
| `fetchInstructionData(instructionId)` | `GET /api/instructions/:id` | `Promise<Instruction>` |
| `saveInstruction(payload)` | `POST /api/instructions` | `Promise<Response>` |
| `updateInstruction(instructionId, payload)` | `PUT /api/instructions/:id` | `Promise<Response>` |
| `deleteInstruction(instructionId)` | `DELETE /api/instructions/:id` | `Promise<Response>` |

**Depended on by:** `useInstructionData.js`, both form files (save/delete handlers).

---

## 4. Custom Hooks

---

### `src/hooks/useInstructionData.js`

**Responsibility.** Data fetching lifecycle — clients, shipment types, starting points,
destinations, and optionally an existing instruction record. Owns all `isLoading` flags.

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
  refetch,
}
```

**Depended on by:** `ControllerInstructions.jsx`, `FCcontrollerinstructions.jsx`.

---

### `src/hooks/useContainerManagement.js`

**Responsibility.** Container list state — initialisation, per-field changes, uniqueness
validation, deletion.

**Exports:**
| Export | Type | Notes |
|---|---|---|
| `containers` | `Container[]` | Current container array |
| `containerFieldErrors` | `object` | Per-container validation state |
| `initializeContainers` | `(currentContainers, counts) => void` | Explicit parameter — see Flag 4 |
| `handleContainerChange` | `(id, field, value) => void` | |
| `validateContainerUniqueness` | `(isAddOn) => boolean` | |
| `removeContainer` | `(id) => void` | |

**Depended on by:** both form files.

---

### `src/hooks/useRateManagement.js`

**Responsibility.** Rate fetching, lock state, surcharge lookups, total cost
recalculation.

**Exports:**
| Export | Type |
|---|---|
| `rateFieldsEnabled` | `object` |
| `rateLockStatus` | `object` |
| `setRateValue` | `number \| null` |
| `isSetRateMode` | `boolean` |
| `totalCost` | `number` |
| `fetchRates` | `(clientId, pickup, dropoff, shipmentTypeId) => Promise<void>` |
| `fetchSurchargeAmount` | `(containerId) => Promise<number>` |
| `recalculateTotalCost` | `(formData, containers) => void` |

**Depended on by:** both form files.

---

### `src/hooks/useWeightRows.js`

**Responsibility.** Weight row state for Cross-Haul Weight (break bulk) shipments.
Only active when `shipmentTypeId === "4"`.

**Exports:**
| Export | Type |
|---|---|
| `weightRows` | `WeightRow[]` |
| `addWeightRow` | `() => void` |
| `updateWeightRow` | `(id, field, value) => void` |
| `handleRequestDeleteWeightRow` | `(row) => void` — triggers confirmation before deletion |

**Depended on by:** both form files.

---

## 5. UI Component Extraction

Pure presenters: receive props, render markup, call callbacks. No direct API calls,
no `useEffect` with fetches.

---

### `src/components/instructions/ErrorTooltip.jsx`

**Responsibility.** Inline validation tooltip. Can be disabled at the call site.

**Props:**
| Prop | Type | Default | Notes |
|---|---|---|---|
| `message` | `string` | — | Tooltip text |
| `disabled` | `boolean` | `false` | Create form passes `disabled`; update form does not |

**See Flag 5 resolution.**

---

### `src/components/instructions/InstructionLoadingGate.jsx`

**Responsibility.** Render the loading spinner, the data-failure message + Retry button,
or the children when loading is complete. Keeps all conditional rendering logic out of
both form files.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `isLoadingComplete` | `boolean` | |
| `hasDataFailure` | `boolean` | |
| `failureMessage` | `string` | Passed as prop — the two forms have different copy |
| `onRetry` | `() => void` | |
| `children` | `ReactNode` | Rendered when `isLoadingComplete && !hasDataFailure` |

**Current duplication:** the loading/failure block appears verbatim in both files
(copy-paste with slightly different error text). Extract once; pass text as a prop.

---

### `src/components/instructions/InstructionBanners.jsx`

**Responsibility.** Status banners at the top of the form. Update form only — create
form passes all flags as false/null and the component renders nothing.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `isReadOnly` | `boolean` | Shows amber read-only banner |
| `status` | `string` | Instruction status displayed in the banner |
| `showSetRateWarning` | `boolean` | Shows red Break Bulk Set Rate mismatch warning |
| `historicalSetRate` | `number \| null` | Displayed in the warning |
| `setRateValue` | `number \| null` | Displayed in the warning |

---

### `src/components/instructions/ClientInfoSection.jsx`

**Responsibility.** The client info row: Client dropdown, Representative, Contact
Details, Email, and (update form) Creation Date.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `formData` | `object` | |
| `clients` | `Client[]` | Dropdown options |
| `fieldErrors` | `object` | |
| `fieldRefs` | `object` | |
| `isReadOnly` | `boolean` | |
| `clientLocked` | `boolean` | Update form passes `true` — Client dropdown always disabled |
| `readOnlyStyle` | `object` | |
| `nonEditableStyle` | `object` | |
| `onClientChange` | `fn` | |
| `onChange` | `fn` | Generic field handler |
| `showCreationDate` | `boolean` | Update form passes `true` |

> **Note:** The update form currently hardcodes `disabled={true}` on the Client
> dropdown. Extract this as `clientLocked` prop rather than duplicating the condition.

---

### `src/components/instructions/ContainerCountsSection.jsx`

**Responsibility.** "Trailer Size / No. of Containers" panel: 6m, 12m, and Abnormal
rows — count input paired with rate-per-container input.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `formData` | `object` | |
| `fieldErrors` | `object` | |
| `fieldRefs` | `object` | |
| `isWeightBased` | `boolean` | Disables counts |
| `isSetRateMode` | `boolean` | Disables counts |
| `isReadOnly` | `boolean` | |
| `readOnlyStyle` | `object` | |
| `onCountChange` | `(name, value) => void` | |
| `onRateChange` | `(e) => void` | |

> **Note:** Both forms embed anonymous `onChange` handlers on the rate inputs. Move
> these to named functions before extraction so they can be passed as props.

---

### `src/components/instructions/UnitPerSection.jsx`

**Responsibility.** "Unit per" row: unit dropdown (Container / kg / ton), conditional
weight and rate inputs for weight-based shipments, Break Bulk Set Rate checkbox + value.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `formData` | `object` | |
| `isWeightBased` | `boolean` | |
| `isSetRateMode` | `boolean` | |
| `isAddOn` | `boolean` | |
| `isSetRate` | `boolean` | Checkbox state |
| `setRateValue` | `number \| null` | |
| `historicalSetRate` | `number \| null` | Update form only — `null` in create form |
| `isReadOnly` | `boolean` | |
| `fieldErrors` | `object` | |
| `fieldRefs` | `object` | |
| `readOnlyStyle` | `object` | |
| `onUnitChange` | `fn` | |
| `onWeightChange` | `fn` | |
| `onRateChange` | `fn` | |
| `onSetRateToggle` | `(checked: boolean) => void` | |

> **Note:** The update form shows `historicalSetRate` in read-only mode; the create form
> does not. The component branches on `historicalSetRate !== null` internally.

---

### `src/components/instructions/BookingDetailsSection.jsx`

**Responsibility.** Right-hand column of the main section: Shipment Type, Pickup/Dropoff
(with optional locked-route state), Booking Ref, Client File Ref, KSM File Ref, VAT
toggle, ETA/Stack Date, Vessel Name, and Description.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `formData` | `object` | |
| `shipmentTypes` | `ShipmentType[]` | |
| `startingPoints` | `StartingPoint[]` | |
| `destinations` | `Destination[]` | |
| `fieldErrors` | `object` | |
| `fieldRefs` | `object` | |
| `isReadOnly` | `boolean` | |
| `readOnlyStyle` | `object` | |
| `routeEditMode` | `"editable" \| "locked"` | Create form always passes `"editable"` |
| `hasRouteMismatch` | `boolean` | Create form always passes `false` |
| `onChange` | `fn` | Generic field handler |
| `onShipmentTypeChange` | `fn` | |
| `onPickupChange` | `fn` | |
| `onDropoffChange` | `fn` | |
| `onRouteMismatchClick` | `fn` | Called when user clicks a locked route field |

**Conditional rendering inside this component:**
- ETA Date vs Stack Date label: `shipmentTypeId === "1"` → "ETA Date", else "Stack Date"
- Vessel Name: hidden when `shipmentTypeId === "4"` (break bulk)
- Locked-route read-only inputs: rendered when `routeEditMode === "locked" && hasRouteMismatch`

---

### `src/components/instructions/WeightDetailsTable.jsx`

**Responsibility.** Editable Weight Details table for Cross-Haul Weight (break bulk,
`shipmentTypeId === "4"`). Not rendered otherwise.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `weightRows` | `WeightRow[]` | |
| `rateWeight` | `string` | Shown in column header |
| `isReadOnly` | `boolean` | |
| `onUpdate` | `(id, field, value) => void` | |
| `onDelete` | `(row) => void` | |
| `onAdd` | `() => void` | |

**Current state:** inline JSX in both files. Both should use this extracted component.

---

### `src/components/instructions/ContainerDetailsTable.jsx`

**Responsibility.** Per-container data entry table: container number, optional file
reference, optional weight, cargo description, hazardous checkbox, surcharges, VGM.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `containers` | `Container[]` | |
| `formData` | `object` | Drives conditional columns |
| `containerFieldErrors` | `object` | |
| `isReadOnly` | `boolean` | |
| `isImport` | `boolean` | Drives Weight column visibility |
| `readOnlyStyle` | `object` | |
| `onContainerChange` | `(id, field, value) => void` | |
| `onHazardousChange` | `(id, checked) => void` | |
| `onSurchargesChange` | `(id, value) => void` | |
| `onVGMChange` | `(id, checked) => void` | |

**Conditional columns:**
| Column | Condition |
|---|---|
| File Reference | `shipmentTypeId === "2"` (Export only) |
| Weight | `isImport \|\| shipmentTypeId === "2" \|\| shipmentTypeId === "3"` |
| Hazardous / Surcharges / VGM | Always present (update form); verify create form behaviour before enabling |

---

### `src/components/instructions/CostSummary.jsx`

**Responsibility.** Total cost display block at the bottom of the form.

**Props:**
| Prop | Type |
|---|---|
| `totalCost` | `number` |
| `vat` | `number` |

**Renders:** base cost, VAT line, grand total.

---

### `src/components/instructions/ActionButtons.jsx`

**Responsibility.** Form action bar. Buttons differ by mode and status.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `mode` | `"create" \| "update"` | |
| `isReadOnly` | `boolean` | |
| `isInvoiced` | `boolean` | Hides Invoice button when true |
| `isSubmitting` | `boolean` | Disables Save button during submission |
| `onSave` | `() => void` | |
| `onDelete` | `() => void` | Update form only |
| `onInvoice` | `() => void` | Update form only |

**Renders by combination:**
| Mode | State | Renders |
|---|---|---|
| `create` | — | Submit button (disabled while `isSubmitting`) |
| `update` | editable | Save Changes + Delete Instruction + Invoice (if `!isInvoiced`) |
| `update` | read-only | Status badge: "This instruction is {status} and cannot be edited" |

---

### `src/components/instructions/ConfirmationModal.jsx`

**Responsibility.** Generic confirmation dialog. Currently inlined in both files as
separate JSX blocks, and partially handled via the imported `ErrorModal` in the update
form.

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

**Current duplication to collapse:**
- Update form inline `confirmationModal` block (line 6161)
- Update form `warningModal` via `ErrorModal` for Reset Counts confirmations
- Create form `showConfirmationPopup` inline block
- Create form `showNoRatesModal` inline block

All can use this one component with different prop sets. The `ErrorModal` import in the
update form can then be reserved for actual error display only.

---

## 6. Resulting File Tree

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
        │       └── ControllerInstructions.jsx      ← orchestrator only; target ~200 lines
        └── updateInstruction/
            └── views/
                └── FCcontrollerinstructions.jsx    ← orchestrator only; target ~200 lines
```

---

## 7. Recommended Extraction Order

Work strictly top-to-bottom. Each step must leave all existing tests green before
proceeding. Write new unit/component tests for each extracted piece before moving on.

| Step | What | Why first |
|------|------|-----------|
| 1 | **Resolve all 5 interface flags** | Pre-condition for everything else. Existing tests catch regressions. |
| 2 | **Pure utilities** (`validation`, `costCalculation`, `rateCountMismatch`, `dateFormatting`) | No React, no side-effects. Safest to extract and easiest to test in isolation. Update logic test imports to new paths. |
| 3 | **Service module** (`instructionService`) | No React. After extraction, update component tests to mock the service rather than `api` directly. |
| 4 | **`useInstructionData` hook** | Highest leverage — removes most of the `useEffect` / `isLoading` boilerplate from both forms at once. |
| 5 | **`useContainerManagement` hook** | Second-highest boilerplate removal. Apply Flag 4 fix (explicit parameter) as part of this step. |
| 6 | **`useRateManagement` hook** | Rate fetching and surcharge logic. |
| 7 | **`useWeightRows` hook** | Smallest hook; isolated to type-4 shipments only. |
| 8 | **`ErrorTooltip` and `ConfirmationModal`** | Atomic, no dependencies on any extracted piece yet. Apply Flag 5 (Option B) as part of `ErrorTooltip`. |
| 9 | **`InstructionLoadingGate`, `InstructionBanners`, `CostSummary`, `ActionButtons`** | No internal state; simple prop-in / JSX-out. |
| 10 | **`ClientInfoSection`, `ContainerCountsSection`, `UnitPerSection`, `BookingDetailsSection`** | Section components. Before extraction, move any anonymous `onChange` handlers to named functions so they can be passed as props. |
| 11 | **`WeightDetailsTable`, `ContainerDetailsTable`** | Most complex; extract last when everything else is stable. |
| 12 | **Final cleanup** | Both page files become thin orchestrators. Run full test suite. Write component tests for any extracted component that does not yet have them. |

---

## Appendix — Known UNCLEAR Behaviours

These were flagged during characterization testing. Verify manually before refactoring
the relevant function.

| Function | File | Flag | Line |
|---|---|---|---|
| `calcContainerBasedCost` | `ControllerInstructions.jsx` | Set-rate mode + add-on interaction: `isSetRateMode` branch runs before `!isAddOn` branch — order may be intentional or a bug | ~1492 |
| `checkRateCounterMismatch` | `FCcontrollerinstructions.jsx` | Does NOT check breakbulk — unclear if omission is intentional | ~1082 |
| `formatDateForDB` | `FCcontrollerinstructions.jsx` | ISO string parsing is timezone-dependent | ~1354 |
| `isCrossHaulShipment` | `FCcontrollerinstructions.jsx` | Checks name "cross-haul" OR hardcodes id `"4"` — dual check may cause divergence | ~3410 |
