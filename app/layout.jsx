import { Nunito } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

// Validate environment on server startup (non-blocking)
if (typeof window === "undefined") {
  try {
    const { validateStartup } = require("../lib/startup");
    // Run validation asynchronously without blocking
    validateStartup().catch((err) => {
      // Only log in development, errors are already handled in validateStartup
      if (process.env.NODE_ENV === "development") {
        console.warn("Startup validation warning (non-blocking):", err.message);
      }
    });
  } catch (err) {
    // Ignore errors in build time or if module can't be loaded
    if (process.env.NODE_ENV === "development") {
      console.warn("Could not run startup validation:", err.message);
    }
  }
}

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "Crossway SEO Tools - PageSpeed Reports",
  description: "Generate comprehensive PDF reports with Google PageSpeed Insights data. Professional SEO analysis tools for website performance optimization.",
  keywords: "PageSpeed Insights, SEO tools, website performance, PDF reports",
  authors: [{ name: "Crossway SEO Tools" }],
  openGraph: {
    title: "Crossway SEO Tools - PageSpeed Reports",
    description: "Generate comprehensive PDF reports with Google PageSpeed Insights data.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

