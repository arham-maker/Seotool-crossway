"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  FiZap, 
  FiFileText, 
  FiSearch,
  FiBarChart2,
  FiMenu,
  FiX,
  FiChevronDown,
  FiUser,
  FiImage,
  FiLogOut
} from "react-icons/fi";

import { FiSettings } from "react-icons/fi";

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: FiBarChart2 },
  { id: "page-speed", label: "Page Speed", icon: FiZap },
  { id: "search-console", label: "Search Console", icon: FiSearch },
  { id: "reports", label: "Reports", icon: FiFileText },
];

const adminNavigationItems = [
  { id: "admin", label: "User Management", icon: FiSettings, role: "super_admin" },
];

export default function DashboardLayout({ children, activeSection = "page-speed", onSectionChange }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-50 transition-colors">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-gradient-to-b from-white via-white to-gray-50/50 dark:from-gray-50 dark:via-gray-50 dark:to-gray-100/50 border-r border-gray-200/80 dark:border-gray-300/80  transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/60 dark:border-gray-300/60 bg-gradient-to-r from-white to-gray-50/30 dark:from-gray-50 dark:to-gray-100/30">
            <div className="flex items-center space-x-3.5">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0EFF2A] to-[#0BCC22] rounded-xl flex items-center justify-center shadow-lg shadow-[#0EFF2A]/20 ring-2 ring-[#0EFF2A]/10">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#0EFF2A] rounded-full border-2 border-white dark:border-gray-50 animate-pulse"></div>
              </div>
              <div>
                <span className="font-bold text-xl text-gray-900 dark:text-black tracking-tight">
                  Crossway
                </span>
                <p className="text-xs text-gray-600 dark:text-gray-700 font-medium mt-0.5">SEO Tools</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-600 dark:text-gray-700 hover:text-gray-900 dark:hover:text-black p-2 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-200/80 transition-all duration-200"
              aria-label="Close sidebar"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto" aria-label="Dashboard navigation">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (onSectionChange) {
                      onSectionChange(item.id);
                    }
                    if (isMobile) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                    isActive
                      ? "bg-gradient-to-r from-[#0EFF2A]/10 to-[#0EFF2A]/5 text-gray-900 dark:text-black shadow-md shadow-[#0EFF2A]/10 border border-[#0EFF2A]/20"
                      : "text-gray-700 dark:text-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-200/50 hover:text-gray-900 dark:hover:text-black border border-transparent hover:border-gray-200/60 dark:hover:border-gray-300/60"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className={`relative ${isActive ? "scale-110" : "group-hover:scale-110"} transition-transform duration-300`}>
                    <IconComponent className={`w-5 h-5 ${isActive ? "text-[#0EFF2A]" : ""}`} />
                    {isActive && (
                      <div className="absolute -inset-1 bg-[#0EFF2A]/20 rounded-lg blur-sm -z-10"></div>
                    )}
                  </div>
                  <span className={`font-semibold text-sm ${isActive ? "text-gray-900 dark:text-black" : ""} transition-colors duration-200`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: 'oklch(37.3% 0.034 259.733)' }} />
                  )}
                </button>
              );
            })}
            
            {/* Admin Navigation (Super Admin only) */}
            {session?.user?.role === "super_admin" && (
              <>
                <div className="pt-4 pb-2 px-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-600 uppercase tracking-wider">
                    Administration
                  </p>
                </div>
                {adminNavigationItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (onSectionChange) {
                          onSectionChange(item.id);
                        }
                        if (isMobile) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                        isActive
                          ? "bg-gradient-to-r from-[#0EFF2A]/10 to-[#0EFF2A]/5 text-gray-900 dark:text-black shadow-md shadow-[#0EFF2A]/10 border border-[#0EFF2A]/20"
                          : "text-gray-700 dark:text-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-200/50 hover:text-gray-900 dark:hover:text-black border border-transparent hover:border-gray-200/60 dark:hover:border-gray-300/60"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <div className={`relative ${isActive ? "scale-110" : "group-hover:scale-110"} transition-transform duration-300`}>
                        <IconComponent className={`w-5 h-5 ${isActive ? "text-[#0EFF2A]" : ""}`} />
                        {isActive && (
                          <div className="absolute -inset-1 bg-[#0EFF2A]/20 rounded-lg blur-sm -z-10"></div>
                        )}
                      </div>
                      <span className={`font-semibold text-sm ${isActive ? "text-gray-900 dark:text-black" : ""} transition-colors duration-200`}>
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: 'oklch(37.3% 0.034 259.733)' }} />
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className="px-4 py-4 border-t border-gray-200/60 dark:border-gray-300/60">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-100 dark:to-gray-200/50 rounded-xl p-4 border border-gray-200/60 dark:border-gray-300/60">
              <p className="text-xs font-semibold text-gray-900 dark:text-black mb-1">Need Help?</p>
              <p className="text-xs text-gray-600 dark:text-gray-700">Contact support for assistance</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-50/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-300/60 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 lg:px-8 lg:py-4">
            {/* Mobile menu button */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-gray-700 dark:text-gray-900 hover:text-gray-900 dark:hover:text-black p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-200/80 transition-all duration-200"
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
            >
              <FiMenu className="w-5 h-5" />
            </button>

            {/* Page Title */}
            <div className="flex items-center space-x-3">
              <div className="hidden lg:block w-1 h-8 bg-gradient-to-b from-[#0EFF2A] to-[#0BCC22] rounded-full"></div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-black tracking-tight">
                  {navigationItems.find((item) => item.id === activeSection)?.label || "Dashboard"}
                </h1>
                <p className="hidden lg:block text-xs text-gray-600 dark:text-gray-700 mt-0.5">
                  Manage your SEO tools and reports
                </p>
              </div>
            </div>

            {/* Right side - Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-3 p-1.5 pr-3 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-200/80 transition-all duration-200 border border-transparent hover:border-gray-200/60 dark:hover:border-gray-300/60 group"
                aria-label="User menu"
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-50 shadow-md group-hover:ring-[#0EFF2A]/30 transition-all duration-200">
                    <span className="text-xs font-bold text-white">
                      {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#0EFF2A] rounded-full border-2 border-white dark:border-gray-50"></div>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-black">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-700 truncate max-w-[120px]">
                    {session?.user?.email}
                  </p>
                </div>
                <FiChevronDown
                  className={`w-4 h-4 text-gray-600 dark:text-gray-700 transition-transform duration-200 ${
                    profileDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-72 bg-white/95 dark:bg-gray-50/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-300/60 z-20 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200/60 dark:border-gray-300/60 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-100/50 dark:to-gray-50">
                      <div className="flex items-center space-x-3.5">
                        <div className="relative">
                          <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-50">
                            <span className="text-base font-bold text-white">
                              {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#0EFF2A] rounded-full border-2 border-white dark:border-gray-50"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-black truncate">
                            {session?.user?.name || "User"}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-700 truncate mt-0.5">
                            {session?.user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <button className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-200/80 text-gray-800 dark:text-black transition-all duration-200 group">
                        <FiUser className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Update Profile</span>
                      </button>
                      <button className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-200/80 text-gray-800 dark:text-black transition-all duration-200 group">
                        <FiImage className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Change Photo</span>
                      </button>
                      <div className="border-t border-gray-200/60 dark:border-gray-300/60 my-2" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-red-50/80 dark:hover:bg-red-900/20 text-red-600 dark:text-red-500 transition-all duration-200 group"
                      >
                        <FiLogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-semibold">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="px-6 py-8 lg:px-8 lg:py-10 bg-gradient-to-b from-white via-gray-50/30 to-white dark:from-gray-50 dark:via-gray-100/30 dark:to-gray-50 min-h-[calc(100vh-80px)]">{children}</main>
      </div>
    </div>
  );
}
