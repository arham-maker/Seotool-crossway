import { Nunito } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

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

