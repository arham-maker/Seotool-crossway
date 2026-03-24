"use client";

import WebsiteStatisticsPanel from "./WebsiteStatisticsPanel";

export default function DashboardSection({ selectedSite = "" }) {
  return <WebsiteStatisticsPanel selectedSite={selectedSite} title="Dashboard" />;
}
