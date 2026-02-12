"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TabNavigation } from "./components/TabNavigation";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { PlannerScreen } from "./screens/PlannerScreen";
import { CalendarScreen } from "./screens/CalendarScreen";
import { usePhaseInfo } from "./hooks/usePhaseInfo";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize API key from env or localStorage
  const [apiKey, setApiKey] = useState<string>(() => {
    const envKey = process.env.NEXT_PUBLIC_INTERVALS_API_KEY;
    if (envKey) return envKey;

    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem("intervals_api_key");
      if (storedKey) return storedKey;
    }

    return "";
  });

  const [showApiKeyModal, setShowApiKeyModal] = useState(!apiKey);

  // Derive active tab from URL (default to calendar)
  const tabParam = searchParams.get("tab");
  const activeTab: "planner" | "calendar" =
    tabParam === "planner" ? "planner" : "calendar";

  // Handle tab change via URL
  const handleTabChange = (tab: "planner" | "calendar") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Handle API key submission
  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    localStorage.setItem("intervals_api_key", key);
    setShowApiKeyModal(false);
  };

  // Phase info for calendar
  const phaseInfo = usePhaseInfo("2026-06-13", 18);

  return (
    <>
      {showApiKeyModal && <ApiKeyModal onApiKeySubmit={handleApiKeySubmit} />}

      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        </div>

        {activeTab === "planner" && <PlannerScreen apiKey={apiKey} />}

        {activeTab === "calendar" && (
          <CalendarScreen
            apiKey={apiKey}
            phaseName={phaseInfo.name}
            currentWeek={phaseInfo.week}
            totalWeeks={18}
            progress={phaseInfo.progress}
          />
        )}
      </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
