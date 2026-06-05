import StudentGuard from "@/components/student/StudentGuard";
import StudentBottomNav from "@/components/student/StudentBottomNav";

export const metadata = {
  title: "Student Portal | Dunamis",
  description: "Student learning area for Dunamis courses.",
};

export default function StudentLayout({ children }) {
  return (
    <StudentGuard>
      {/* pb-16 keeps content clear of the fixed bottom nav on mobile */}
      <div className="pb-16 md:pb-0">{children}</div>
      <StudentBottomNav />
    </StudentGuard>
  );
}
