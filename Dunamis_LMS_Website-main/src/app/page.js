import dynamic from "next/dynamic";
import HeroSection from "@/components/HomeComponents/HeroSection";
import MusicNoteShower from "@/components/MusicNoteShower";
import { SectionSkeleton, CardGridSkeleton } from "@/components/Skeletons";

const Offerings = dynamic(
  () => import("@/components/HomeComponents/Offerings"),
  { loading: () => <SectionSkeleton /> }
);

const PopularCourses = dynamic(
  () => import("@/components/HomeComponents/PopularCourse"),
  { loading: () => <CardGridSkeleton /> }
);

const Mentors = dynamic(
  () => import("@/components/HomeComponents/Mentors"),
  { loading: () => <CardGridSkeleton /> }
);

const Testimonials = dynamic(
  () => import("@/components/HomeComponents/Testimonials"),
  { loading: () => <SectionSkeleton /> }
);

const Centers = dynamic(
  () => import("@/components/HomeComponents/Centers"),
  { loading: () => <CardGridSkeleton /> }
);

const About = dynamic(
  () => import("@/components/HomeComponents/About"),
  { loading: () => <SectionSkeleton /> }
);

/* Reusable wave divider — fill matches the section BELOW it */
function WaveDivider({ fromDark = true }) {
  const fill = fromDark ? "#fffaf4" : "#0D0D18";
  const bg = fromDark ? "#0D0D18" : "#fffaf4";
  return (
    <div style={{ background: bg, lineHeight: 0 }}>
      <svg
        viewBox="0 0 1440 48"
        className="block w-full"
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <path
          d="M0,48 C360,4 1080,4 1440,48 L1440,48 L0,48 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}

function DarkToLight() {
  return <WaveDivider fromDark={true} />;
}

function LightToDark() {
  return (
    <div style={{ background: "#fffaf4", lineHeight: 0 }}>
      <svg
        viewBox="0 0 1440 48"
        className="block w-full"
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <path
          d="M0,0 C360,44 1080,44 1440,0 L1440,48 L0,48 Z"
          fill="#060A18"
        />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <MusicNoteShower />

      {/* ── Hero (dark image bg) ─── */}
      <HeroSection />

      {/* ── Offerings (dark #0D0D18) ─── */}
      <Offerings />

      {/* dark → light (PopularCourses is #fffaf4) */}
      <DarkToLight />

      {/* ── Popular Courses (light) ─── */}
      <PopularCourses />

      {/* light → dark (Mentors is #060A18) */}
      <LightToDark />

      {/* ── Mentors (dark #060A18) ─── */}
      <Mentors />

      {/* ── Testimonials (dark gradient — seamlessly continues dark) ─── */}
      <Testimonials />

      {/* dark → light (Centers & About are light) */}
      <div style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #1a0f06 40%, #0a1a18 100%)", lineHeight: 0 }}>
        <svg
          viewBox="0 0 1440 48"
          className="block w-full"
          preserveAspectRatio="none"
          style={{ display: "block" }}
        >
          <path
            d="M0,48 C360,4 1080,4 1440,48 L1440,48 L0,48 Z"
            fill="#f3f4f6"
          />
        </svg>
      </div>

      {/* ── Centers (light) ─── */}
      <Centers />

      {/* ── About (light dot-grid) ─── */}
      <About />
    </>
  );
}
