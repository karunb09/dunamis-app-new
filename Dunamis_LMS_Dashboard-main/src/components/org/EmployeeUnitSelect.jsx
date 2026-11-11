import React, { useEffect } from "react";
import { useActiveUnits } from "../../hooks/useEmployeeUnits";

// Active units only. If the current pick isn't one (e.g. DSM was deactivated),
// it moves to the first active unit so the form never submits a hidden value.
const EmployeeUnitSelect = ({ value, onChange, className }) => {
  const { units, isLoading } = useActiveUnits();
  const known = units.some((unit) => unit.code === value);

  useEffect(() => {
    if (!isLoading && !known && units.length) onChange(units[0].code);
  }, [isLoading, known, units, onChange]);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={isLoading} className={className}>
      {units.map((unit) => (
        <option key={unit.code} value={unit.code}>
          {unit.code} — {unit.name}
        </option>
      ))}
    </select>
  );
};

export default EmployeeUnitSelect;
