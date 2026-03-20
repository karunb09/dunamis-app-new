import { Suspense } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navigation from "@/compoents/Navigation";
import RouteProgress from "@/compoents/RouteProgress";
import Footer from "@/compoents/Footer";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";

// Load Poppins font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata = {
  title: "Dunamis Learning Platform",
  description: "DUNAMIS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body className="flex min-h-screen flex-col bg-[#fffaf4] text-slate-900">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <Toaster />
        <Navigation />

        <Providers>
          <main className="flex-grow">{children}</main>
        </Providers>

        <Footer />
      </body>
    </html>
  );
}
