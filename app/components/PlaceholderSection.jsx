"use client";

import { FiZap, FiFileText } from "react-icons/fi";

const iconMap = {
  "reports": FiFileText,
};

export default function PlaceholderSection({ title, description, icon }) {
  const IconComponent = iconMap[icon] || FiZap;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-gray-200/50 dark:ring-gray-300/50">
              <IconComponent className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white dark:border-gray-50"></div>
          </div>
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-black tracking-tight">
              {title}
            </h2>
            <p className="text-gray-600 dark:text-gray-700 mt-2 text-sm lg:text-base">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-300/60 px-8 py-16 lg:px-12 lg:py-20 text-center relative overflow-hidden">
        {/* Decorative gradient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-200/20 to-transparent rounded-full blur-3xl z-0"></div>
        
        <div className="max-w-md mx-auto relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200/50 dark:from-gray-200 dark:to-gray-300/50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border-2 border-gray-200/60 dark:border-gray-300/60 ring-4 ring-gray-50 dark:ring-gray-100">
            <IconComponent className="w-12 h-12 text-gray-600 dark:text-gray-700" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-black mb-3">
            Coming Soon
          </h3>
          <p className="text-gray-600 dark:text-gray-700 text-base leading-relaxed mb-8">
            This section is under development and will be available soon.
          </p>
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-[#0EFF2A] rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-[#0EFF2A] rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-[#0EFF2A] rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
