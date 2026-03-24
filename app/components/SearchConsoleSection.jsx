"use client";

import WebsiteStatisticsPanel from "./WebsiteStatisticsPanel";

export default function SearchConsoleSection({ selectedSite = "" }) {
  return <WebsiteStatisticsPanel selectedSite={selectedSite} title="Website Statistics" />;
}

