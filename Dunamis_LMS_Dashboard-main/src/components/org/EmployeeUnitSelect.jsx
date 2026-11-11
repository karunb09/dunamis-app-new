import React, { useEffect } from "react";
import { useActiveUnits } from "../../hooks/useEmployeeUnits";

// Active units only. A pick that isn't one (e.g. DSM was deactivated) moves to
// the first active unit, or to the `placeholder` option ("") when there is one,
// so the form never submits a value the user can't see.
const EmployeeUnitSelect = ({ value, onChange, className, placeholder, exclude }) => {
  const { units, isLoading } = useActiveUnits();
  const options = units.filter((unit) => unit.code !== exclude);
  const known = options.some((unit) => unit.code === value) || (placeholder && value === "");

  useEffect(() => {
    if (isLoading || known) return;
    if (placeholder) onChange("");
    else if (options.length) onChange(options[0].code);
  }, [isLoading, known, options, placeholder, onChange]);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={isLoading} className={className}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((unit) => (
        <option key={unit.code} value={unit.code}>
          {unit.code} — {unit.name}
        </option>
      ))}
    </select>
  );
};

export default EmployeeUnitSelect;
