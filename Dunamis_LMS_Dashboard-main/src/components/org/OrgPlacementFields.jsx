import React, { useEffect, useMemo } from "react";
import ReactSelect from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllBranches } from "../../redux/Branch/branchSlice";
import { getAllCities } from "../../redux/City/CitySlice";
import { useStaffDirectory, useZones } from "../../hooks/useOrg";
import { useCategoriesQuery } from "../../hooks/useCategories";
import { useCoursesQuery } from "../../hooks/useCourses";
import {
  DESIGNATIONS,
  SCOPE_FIELDS,
  SCOPE_KEYS,
  SELECT_STYLES,
  WORK_MODES,
  designationLabel,
  designationsByDepartment,
  scopeKeysFor,
  withArticle,
} from "../../constants/orgStructure";
import { emptyPlacement } from "../../utils/orgPlacement";

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const idOf = (value) => String(value?._id || value || "");

const FIELD =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

const personName = (person) =>
  `${person.name?.firstName || ""} ${person.name?.lastName || ""}`.trim() || person.email;

// Designation, work mode, manager and responsibility for an admin. The parent
// owns the job title (it lives on the Admin record, not in the org chart).
const OrgPlacementFields = ({ value, onChange, targetUserId }) => {
  const dispatch = useDispatch();
  const { branches, listStatus: branchStatus } = useSelector((state) => state.branch);
  const { cities, listStatus: cityStatus } = useSelector((state) => state.city);
  const { data: staff = [] } = useStaffDirectory();
  const { data: zones = [] } = useZones();
  const { data: categoryData } = useCategoriesQuery();
  const { data: courses = [] } = useCoursesQuery();

  useEffect(() => {
    if (branchStatus === "idle") dispatch(fetchAllBranches());
    if (cityStatus === "idle") dispatch(getAllCities());
  }, [branchStatus, cityStatus, dispatch]);

  const designation = DESIGNATIONS[value.designation];
  const scopeKeys = scopeKeysFor(value.designation, value.workMode);

  const managerOptions = useMemo(() => {
    const allowed = designation?.managers || [];
    return staff.filter(
      (person) => allowed.includes(person.org?.designation) && idOf(person._id) !== idOf(targetUserId)
    );
  }, [staff, designation, targetUserId]);

  const scopeOptions = useMemo(() => {
    const categories = categoryData?.categories || [];
    const categoryName = new Map(categories.map((category) => [idOf(category._id), category.name]));
    return {
      branches: branches.map((branch) => ({
        value: idOf(branch._id),
        label: [branch.branchName, branch.city?.cityName].filter(Boolean).join(" · "),
      })),
      zones: zones.map((zone) => ({
        value: idOf(zone._id),
        label: [zone.name, zone.city?.cityName].filter(Boolean).join(" · "),
      })),
      cities: cities.map((city) => ({ value: idOf(city._id), label: city.cityName })),
      courses: courses
        .filter((course) => course.mode === "online")
        .map((course) => ({ value: idOf(course._id), label: course.name })),
      subCategories: (categoryData?.subCategories || []).map((subCategory) => ({
        value: idOf(subCategory._id),
        label: [subCategory.name, categoryName.get(idOf(subCategory.categoryId))].filter(Boolean).join(" · "),
      })),
      categories: categories.map((category) => ({ value: idOf(category._id), label: category.name })),
    };
  }, [branches, zones, cities, courses, categoryData]);

  const setDesignation = (key) => {
    const next = DESIGNATIONS[key];
    const keepManager = next?.managers.includes(
      staff.find((person) => idOf(person._id) === idOf(value.reportsTo))?.org?.designation
    );
    onChange({
      ...emptyPlacement(),
      designation: key,
      workMode: value.workMode || "offline",
      reportsTo: keepManager ? value.reportsTo : "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Designation <span className="text-rose-500">*</span>
          </label>
          <select value={value.designation} onChange={(e) => setDesignation(e.target.value)} className={FIELD}>
            <option value="">Select designation</option>
            {designationsByDepartment().map((group) => (
              <optgroup key={group.department} label={group.label}>
                {group.designations.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {designation?.scope && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Works</label>
            <select
              value={value.workMode}
              onChange={(e) =>
                onChange({
                  ...value,
                  workMode: e.target.value,
                  ...Object.fromEntries(SCOPE_KEYS.map((key) => [key, []])),
                })
              }
              className={FIELD}
            >
              {WORK_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {designation && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Reports to</label>
            {value.designation === "ceo" ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                Top of the org — reports to nobody.
              </p>
            ) : (
              <>
                <select
                  value={idOf(value.reportsTo)}
                  onChange={(e) => onChange({ ...value, reportsTo: e.target.value })}
                  className={FIELD}
                >
                  <option value="">Not set yet</option>
                  {managerOptions.map((person) => (
                    <option key={person._id} value={person._id}>
                      {personName(person)} · {designationLabel(person.org.designation)}
                      {person.employeeId ? ` · ${person.employeeId}` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {capitalize(withArticle(designation.label))} reports to{" "}
                  {withArticle(designation.managers.map(designationLabel).join(" or "))}.
                  {!managerOptions.length && " Nobody holds that role yet."}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {scopeKeys.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {scopeKeys.map((key) => {
            const options = scopeOptions[key];
            const selected = new Set((value[key] || []).map(idOf));
            return (
              <div key={key}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Responsible for — {SCOPE_FIELDS[key].toLowerCase()}
                  {designation.scopeRequired && <span className="text-rose-500"> *</span>}
                </label>
                <ReactSelect
                  isMulti
                  options={options}
                  value={options.filter((option) => selected.has(option.value))}
                  onChange={(picked) => onChange({ ...value, [key]: (picked || []).map((option) => option.value) })}
                  placeholder={`Select ${SCOPE_FIELDS[key].toLowerCase()}`}
                  styles={SELECT_STYLES}
                  backspaceRemovesValue={false}
                  isClearable={false}
                />
                {!designation.scopeRequired && (
                  <p className="mt-1 text-xs text-slate-500">Leave empty to cover the whole company.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrgPlacementFields;
