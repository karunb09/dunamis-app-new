import { FiMapPin } from "react-icons/fi";
import { useMyScope } from "../../hooks/useOrg";

const MAX_NAMED = 3;

const listNames = (names, noun) => {
  const shown = names.slice(0, MAX_NAMED).join(", ");
  const rest = names.length - MAX_NAMED;
  return rest > 0 ? `${shown} and ${rest} more ${noun}` : shown;
};

// Tells a placed AA / BDE / BDM that the lists below cover their area only.
// Renders nothing for anyone who sees the whole company.
export default function ScopeBanner({ className = "" }) {
  const { data } = useMyScope();
  if (!data?.scoped) return null;

  const branches = data.branches.map((branch) => branch.branchName);
  const onlineCourses = data.courses.filter((course) => course.mode === "online").map((course) => course.name);
  const parts = [
    branches.length && listNames(branches, "branches"),
    onlineCourses.length && `online: ${listNames(onlineCourses, "courses")}`,
  ].filter(Boolean);

  return (
    <div
      className={`flex items-start gap-2.5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 motion-safe:animate-fade-in ${className}`}
    >
      <FiMapPin className="mt-0.5 shrink-0" />
      {parts.length ? (
        <p>
          <span className="font-medium">Your area:</span> {parts.join(" · ")}. Records outside it are hidden.
        </p>
      ) : (
        <p>
          No branches or courses are assigned to you yet, so these lists are empty. Ask an admin to set your area
          in Admins → Reporting structure.
        </p>
      )}
    </div>
  );
}
