import StudentGuard from "@/components/student/StudentGuard";

export const metadata = {
  title: "Student Portal | Dunamis",
  description: "Student learning area for Dunamis courses.",
};

export default function StudentLayout({ children }) {
  return <StudentGuard>{children}</StudentGuard>;
}
