"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FiSearch,
  FiGlobe,
  FiBarChart2,
  FiTrendingUp,
  FiMenu,
  FiX,
  FiChevronDown,
  FiLogOut,
  FiSettings,
  FiFileText,
  FiHelpCircle,
} from "react-icons/fi";

const mainMenuItems = [
  { id: "dashboard", label: "Dashboard", icon: FiBarChart2 },
  { id: "website-statistics", label: "Website Statistics", icon: FiSearch },
  { id: "smm-statistics", label: "SMM Statistics", icon: FiTrendingUp },
];

const adminMenuItems = [
  { id: "user-management", label: "User Management", icon: FiSettings, role: "super_admin" },
  { id: "reports", label: "Reports", icon: FiFileText },
];

export default function DashboardLayout({
  children,
  activeSection = "page-speed",
  onSectionChange,
  selectedSite = "",
  onSelectedSiteChange,
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [superAdminSiteDropdownOpen, setSuperAdminSiteDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [logoVisible, setLogoVisible] = useState(true);
  const [siteLogoVisible, setSiteLogoVisible] = useState(true);
  const [availableSites, setAvailableSites] = useState([]);
  const [superAdminPrimarySite, setSuperAdminPrimarySite] = useState("");
  const [failedSiteLogos, setFailedSiteLogos] = useState({});
  const isSuperAdmin = session?.user?.role === "super_admin";
  const userSiteLink = session?.user?.siteLink || "";

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

  useEffect(() => {
    const fetchAvailableSites = async () => {
      if (!isSuperAdmin) {
        setAvailableSites([]);
        return;
      }

      try {
        const res = await fetch("/api/admin/site-integrations");
        if (!res.ok) return;
        const data = await res.json();
        const sites = (data.sites || []).map((entry) =>
          typeof entry === "string" ? entry : entry.siteLink
        ).filter(Boolean);
        const ownSite = data.superAdminSite || "";
        setSuperAdminPrimarySite(ownSite);
        setAvailableSites(sites);

      } catch {
        setAvailableSites([]);
        setSuperAdminPrimarySite("");
      }
    };

    fetchAvailableSites();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin || selectedSite) return;
    if (superAdminPrimarySite) {
      onSelectedSiteChange?.(superAdminPrimarySite);
      return;
    }
    if (availableSites.length > 0) {
      onSelectedSiteChange?.(availableSites[0]);
    }
  }, [availableSites, isSuperAdmin, onSelectedSiteChange, selectedSite, superAdminPrimarySite]);

  useEffect(() => {
    if (!isSuperAdmin || !availableSites.length || !selectedSite) return;
    if (!availableSites.includes(selectedSite)) {
      onSelectedSiteChange?.(superAdminPrimarySite || availableSites[0]);
    }
  }, [availableSites, isSuperAdmin, onSelectedSiteChange, selectedSite, superAdminPrimarySite]);

  useEffect(() => {
    setSiteLogoVisible(true);
  }, [userSiteLink]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const getSiteHostName = (siteUrl) => {
    if (!siteUrl) return "No Site Linked";
    try {
      return new URL(siteUrl).hostname.replace(/^www\./, "");
    } catch {
      return siteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "No Site Linked";
    }
  };

  const getFaviconUrl = (siteUrl) => {
    if (!siteUrl) return "";
    try {
      const hostname = new URL(siteUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch {
      return "";
    }
  };

  const markSiteLogoFailed = (siteUrl) => {
    setFailedSiteLogos((prev) => ({ ...prev, [siteUrl]: true }));
  };

  const allMenuItems = [
    ...mainMenuItems,
    ...adminMenuItems.filter((item) => !item.role || session?.user?.role === item.role),
  ];
  const isCompactSidebar = !isMobile && isSidebarCollapsed;

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
        className={`fixed top-0 left-0 z-50 h-full w-72 ${isSidebarCollapsed ? "lg:w-20" : "lg:w-72"} bg-[#F0F0F0] pl-2 pr-1 pt-2 pb-2 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full bg-white rounded-xl">
          {/* Logo/Brand (expanded only) */}
          {!isCompactSidebar && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center w-full justify-between">
                <div className="flex items-center">
                  {logoVisible ? (
                    <img
                      src="/crossway-logo.png"
                      alt="Crossway logo"
                      width={60}
                      height={60}
                      className="rounded-md object-contain"
                      onError={() => setLogoVisible(false)}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                      CW
                    </div>
                  )}
                </div>

                {!isMobile && (
                  <button
                    onClick={toggleSidebarCollapse}
                    className="ml-3 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                  >
                    <img
                      src="/collapse.png"
                      alt="Collapse sidebar"
                      width={18}
                      height={18}
                      className="object-contain"
                    />
                  </button>
                )}
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-gray-600 dark:text-gray-700 hover:text-gray-900 dark:hover:text-black p-2 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-200/80 transition-all duration-200"
                  aria-label="Close sidebar"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Compact Header (collapsed only) */}
          {isCompactSidebar && (
            <div className="hidden lg:flex items-center justify-center py-3 border-b border-gray-200">
              <button
                onClick={toggleSidebarCollapse}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <img
                  src="/collapse.png"
                  alt="Expand sidebar"
                  width={18}
                  height={18}
                  className="object-contain rotate-180"
                />
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto" aria-label="Dashboard navigation">
            {isSuperAdmin && !isCompactSidebar && (
              <div className="px-3 pb-4 relative">
                <p className="block text-[10px] font-semibold tracking-wider text-gray-500 uppercase mb-2">
                  Site Dashboard
                </p>
                <button
                  type="button"
                  onClick={() => setSuperAdminSiteDropdownOpen((prev) => !prev)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0EFF2A]/30 focus:border-[#0EFF2A] flex items-center justify-between gap-2"
                  aria-haspopup="listbox"
                  aria-expanded={superAdminSiteDropdownOpen}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {selectedSite && !failedSiteLogos[selectedSite] && getFaviconUrl(selectedSite) ? (
                      <img
                        src={getFaviconUrl(selectedSite)}
                        alt={`${getSiteHostName(selectedSite)} logo`}
                        width={18}
                        height={18}
                        className="h-[18px] w-[18px] rounded-sm object-contain shrink-0"
                        onError={() => markSiteLogoFailed(selectedSite)}
                      />
                    ) : (
                      <div className="h-[18px] w-[18px] rounded-sm bg-gray-100 flex items-center justify-center shrink-0">
                        <FiGlobe className="w-3 h-3 text-gray-500" />
                      </div>
                    )}
                    <span className="truncate">{selectedSite ? getSiteHostName(selectedSite) : "No Site Selected"}</span>
                  </span>
                  <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${superAdminSiteDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {superAdminSiteDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setSuperAdminSiteDropdownOpen(false)}
                    />
                    <div
                      className="absolute left-3 right-3 top-[72px] z-20 rounded-lg border border-gray-200 bg-white shadow-xl max-h-64 overflow-y-auto"
                      role="listbox"
                      aria-label="Select site dashboard"
                    >
                      {availableSites.map((siteUrl) => (
                        <button
                          key={siteUrl}
                          type="button"
                          onClick={() => {
                            onSelectedSiteChange?.(siteUrl);
                            setSuperAdminSiteDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 ${
                            selectedSite === siteUrl ? "bg-[#dff7de]" : ""
                          }`}
                        >
                          {!failedSiteLogos[siteUrl] && getFaviconUrl(siteUrl) ? (
                            <img
                              src={getFaviconUrl(siteUrl)}
                              alt={`${getSiteHostName(siteUrl)} logo`}
                              width={18}
                              height={18}
                              className="h-[18px] w-[18px] rounded-sm object-contain shrink-0"
                              onError={() => markSiteLogoFailed(siteUrl)}
                            />
                          ) : (
                            <div className="h-[18px] w-[18px] rounded-sm bg-gray-100 flex items-center justify-center shrink-0">
                              <FiGlobe className="w-3 h-3 text-gray-500" />
                            </div>
                          )}
                          <span className="text-sm text-gray-800 truncate">{getSiteHostName(siteUrl)}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {!isSuperAdmin && !isCompactSidebar && (
              <div className="px-3 pb-4">
                <p className="block text-[10px] font-semibold tracking-wider text-gray-500 uppercase mb-2">
                  Current Site
                </p>
                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 flex items-center gap-3">
                  {siteLogoVisible && getFaviconUrl(userSiteLink) ? (
                    <img
                      src={getFaviconUrl(userSiteLink)}
                      alt="Site logo"
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-sm object-contain shrink-0"
                      onError={() => setSiteLogoVisible(false)}
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-sm bg-gray-100 flex items-center justify-center shrink-0">
                      <FiGlobe className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{getSiteHostName(userSiteLink)}</p>
                    {userSiteLink && (
                      <p className="text-[11px] text-gray-500 truncate">{userSiteLink}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {!isCompactSidebar && (
              <p className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">Main Menu</p>
            )}
            {mainMenuItems.map((item) => {
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
                  className={`w-full flex items-center ${isCompactSidebar ? "justify-center px-2" : "space-x-3.5 px-4"} py-3 rounded-xl transition-all duration-300 group relative ${
                    isActive
                      ? "bg-[#dff7de] text-gray-900 border border-[#c4edc2]"
                      : "text-gray-700 hover:bg-white hover:text-gray-900 border border-transparent"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <IconComponent className={`w-4 h-4 ${isActive ? "text-[#1d9c35]" : ""}`} />
                  {!isCompactSidebar && (
                    <span className={`font-medium text-sm ${isActive ? "text-gray-900" : ""} transition-colors duration-200`}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
            
            {/* Admin Navigation (Super Admin only) */}
            {(session?.user?.role === "super_admin" || adminMenuItems.some((item) => !item.role)) && (
              <>
                {!isCompactSidebar && (
                  <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                      Administration
                    </p>
                  </div>
                )}
                {adminMenuItems
                  .filter((item) => !item.role || session?.user?.role === item.role)
                  .map((item) => {
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
                      className={`w-full flex items-center ${isCompactSidebar ? "justify-center px-2" : "space-x-3.5 px-4"} py-3 rounded-xl transition-all duration-300 group relative ${
                        isActive
                          ? "bg-[#dff7de] text-gray-900 border border-[#c4edc2]"
                          : "text-gray-700 hover:bg-white hover:text-gray-900 border border-transparent"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <IconComponent className={`w-4 h-4 ${isActive ? "text-[#1d9c35]" : ""}`} />
                      {!isCompactSidebar && (
                        <span className={`font-medium text-sm ${isActive ? "text-gray-900" : ""} transition-colors duration-200`}>
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="space-y-2 text-sm text-gray-600 relative">
              <div className="relative">
                <button
                  onClick={() => setSettingsDropdownOpen((prev) => !prev)}
                  className={`w-full flex items-center ${isCompactSidebar ? "justify-center px-2" : "gap-2 px-3"} rounded-lg py-2 hover:bg-white transition-colors`}
                  aria-label="Settings menu"
                  aria-expanded={settingsDropdownOpen}
                  aria-haspopup="true"
                >
                  <FiSettings className="w-4 h-4" />
                  {!isCompactSidebar && <span>Settings</span>}
                </button>

                {settingsDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setSettingsDropdownOpen(false)}
                    />
                    <div className="absolute left-0 bottom-11 w-44 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
                      <div className="p-1.5">
                        <button
                          onClick={async () => {
                            setSettingsDropdownOpen(false);
                            await handleLogout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                        >
                          <FiLogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button className={`w-full flex items-center ${isCompactSidebar ? "justify-center px-2" : "gap-2 px-3"} rounded-lg py-2 hover:bg-white transition-colors`}>
                <FiHelpCircle className="w-4 h-4" />
                {!isCompactSidebar && <span>Help Center</span>}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-30 lg:hidden text-gray-700 p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
          aria-label="Toggle sidebar"
          aria-expanded={sidebarOpen}
        >
          <FiMenu className="w-5 h-5" />
        </button>
 
        {/* Main Content Area */}
        <main className="pl-2 pr-2 pt-2 pb-2 lg:pl-1 lg:pr-2 lg:pt-2 lg:pb-2 bg-[#F0F0F0] min-h-screen">{children}</main>
      </div>
    </div>
  );
}
