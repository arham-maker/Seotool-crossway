"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "./components/DashboardLayout";
import PageSpeedSection from "./components/PageSpeedSection";
import SearchConsoleSection from "./components/SearchConsoleSection";
import ReportsSection from "./components/ReportsSection";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("page-speed");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-50 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div 
            className="inline-block h-8 w-8 border-2 border-gray-400 dark:border-gray-600 border-t-transparent rounded-full animate-spin"
            aria-label="Loading"
            role="status"
          />
          <p className="sr-only">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "page-speed":
        return <PageSpeedSection />;
      case "search-console":
        return <SearchConsoleSection />;
      case "reports":
        return <ReportsSection />;
      default:
        return <PageSpeedSection />;
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderSection()}
    </DashboardLayout>
  );
}
