import About from "@/compoents/HomeComponents/About";
import Centers from "@/compoents/HomeComponents/Centers";
import HeroSection from "@/compoents/HomeComponents/HeroSection";
import Mentors from "@/compoents/HomeComponents/Mentors";
import Offerings from "@/compoents/HomeComponents/Offerings";
import PopularCourses from "@/compoents/HomeComponents/PopularCourse";
import Testimonials from "@/compoents/HomeComponents/Testimonials";

export default function Home() {
  return (
    <>
      <HeroSection />
       <Offerings />
      <PopularCourses />
      <Mentors />
      <Testimonials />
      <Centers />
      <About />
    </>
  );
}
