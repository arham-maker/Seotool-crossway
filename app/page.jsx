"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "./components/DashboardLayout";
import DashboardSection from "./components/DashboardSection";
import PerformanceReportSection from "./components/PerformanceReportSection";
import SearchConsoleSection from "./components/SearchConsoleSection";
import AdminSection from "./components/AdminSection";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("dashboard");

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
      case "dashboard":
        return <DashboardSection />;
      case "performance":
        return <PerformanceReportSection />;
      case "search-console":
        return <SearchConsoleSection />;
      case "admin":
        return session?.user?.role === "super_admin" ? <AdminSection /> : <DashboardSection />;
      default:
        return <DashboardSection />;
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderSection()}
    </DashboardLayout>
  );
}
