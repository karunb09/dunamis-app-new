import { DESIGNATIONS, SCOPE_FIELDS, SCOPE_KEYS, scopeKeysFor } from "../constants/orgStructure";

// Form helpers for components/org/OrgPlacementFields.jsx.

export const emptyPlacement = () => ({
  designation: "",
  workMode: "offline",
  reportsTo: "",
  ...Object.fromEntries(SCOPE_KEYS.map((key) => [key, []])),
});

// Server-side placement (services/orgPlacement.js) is the authority; this only
// catches the obvious gaps before a round trip.
export const placementProblem = (placement) => {
  const designation = DESIGNATIONS[placement.designation];
  if (!designation) return "Pick a designation.";
  if (!designation.scopeRequired) return null;
  const missing = scopeKeysFor(placement.designation, placement.workMode).find(
    (key) => !(placement[key] || []).length
  );
  return missing ? `Pick at least one of: ${SCOPE_FIELDS[missing].toLowerCase()}.` : null;
};

export const toPlacementPayload = (placement) => {
  const designation = DESIGNATIONS[placement.designation];
  const allowed = scopeKeysFor(placement.designation, placement.workMode);
  return {
    designation: placement.designation,
    reportsTo: placement.designation === "ceo" ? null : placement.reportsTo || null,
    ...(designation?.scope ? { workMode: placement.workMode } : {}),
    ...Object.fromEntries(SCOPE_KEYS.map((key) => [key, allowed.includes(key) ? placement[key] : []])),
  };
};

