"use client";

import { useState } from "react";
import {
  generatePlan,
  uploadToIntervals,
  analyzeHistory,
  WorkoutEvent,
} from "@/lib/plannerLogic";
import { RaceSettings } from "../components/RaceSettings";
import { PhysiologySettings } from "../components/PhysiologySettings";
import { PlanStructureSettings } from "../components/PlanStructureSettings";
import { AnalysisSection } from "../components/AnalysisSection";
import { WeeklyVolumeChart } from "../components/WeeklyVolumeChart";
import { WorkoutList } from "../components/WorkoutList";
import { ActionBar } from "../components/ActionBar";
import { StatusMessage } from "../components/StatusMessage";
import { EmptyState } from "../components/EmptyState";
import { useWeeklyVolumeData } from "../hooks/useWeeklyVolumeData";

interface PlannerScreenProps {
  apiKey: string;
}

export function PlannerScreen({ apiKey }: PlannerScreenProps) {
  const [raceName, setRaceName] = useState("EcoTrail");
  const [raceDate, setRaceDate] = useState("2026-06-13");
  const [raceDist, setRaceDist] = useState(16);
  const [lthr, setLthr] = useState(169);
  const [prefix, setPrefix] = useState("eco16");
  const [totalWeeks, setTotalWeeks] = useState(18);
  const [startKm, setStartKm] = useState(8);
  const [fuelInterval, setFuelInterval] = useState(5);
  const [fuelSteady, setFuelSteady] = useState(10);
  const [planEvents, setPlanEvents] = useState<WorkoutEvent[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [longRunAnalysis, setLongRunAnalysis] = useState<{
    trend: number;
    plotData: { time: number; glucose: number }[];
  } | null>(null);
  const [intervalAnalysis, setIntervalAnalysis] = useState<{
    trend: number;
    plotData: { time: number; glucose: number }[];
  } | null>(null);

  const chartData = useWeeklyVolumeData(planEvents);

  const handleAnalyze = async () => {
    if (!apiKey) {
      setStatusMsg("❌ Missing API Key");
      return;
    }
    setIsAnalyzing(true);
    const result = await analyzeHistory(apiKey, prefix);

    if (result.longRun) {
      setLongRunAnalysis({
        trend: result.longRun.trend,
        plotData: result.longRun.plotData,
      });

      let suggSteady = result.longRun.currentFuel;
      if (result.longRun.trend < -3.0) {
        const diff = Math.abs(result.longRun.trend - -3.0);
        suggSteady += Math.min(1 + Math.floor(diff * 0.7), 4);
      } else if (result.longRun.trend > 3.0) {
        suggSteady = Math.max(0, suggSteady - 1);
      }
      setFuelSteady(suggSteady);
    }

    if (result.interval) {
      setIntervalAnalysis({
        trend: result.interval.trend,
        plotData: result.interval.plotData,
      });

      let suggInt = result.interval.currentFuel;
      if (result.interval.trend > 3.0) {
        suggInt = Math.max(0, suggInt - 1);
      }
      setFuelInterval(suggInt);
    }

    setIsAnalyzing(false);
    setStatusMsg("✓ Analysis Complete — Fuel adjusted automatically");
  };

  const handleGenerate = () => {
    const events = generatePlan(
      fuelInterval,
      fuelSteady,
      raceDate,
      raceDist,
      prefix,
      totalWeeks,
      startKm,
      lthr,
    );

    // Filter out past workouts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureEvents = events.filter((e) => e.start_date_local >= today);

    setPlanEvents(futureEvents);
    setStatusMsg("");
  };

  const handleUpload = async () => {
    if (!apiKey) {
      setStatusMsg("❌ Missing API Key");
      return;
    }
    setIsUploading(true);
    try {
      const count = await uploadToIntervals(apiKey, planEvents);
      setStatusMsg(`✅ Success! Uploaded ${count} workouts.`);
    } catch (e) {
      setStatusMsg(`❌ Error: ${e}`);
    }
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-xl font-bold tracking-tight">
            🏃‍♂️‍➡️ Race Planner
          </h1>
        </div>

        <div className="space-y-4">
          <RaceSettings
            raceName={raceName}
            raceDate={raceDate}
            raceDist={raceDist}
            onRaceNameChange={setRaceName}
            onRaceDateChange={setRaceDate}
            onRaceDistChange={setRaceDist}
          />

          <PhysiologySettings lthr={lthr} onLthrChange={setLthr} />

          <PlanStructureSettings
            prefix={prefix}
            totalWeeks={totalWeeks}
            startKm={startKm}
            onPrefixChange={setPrefix}
            onTotalWeeksChange={setTotalWeeks}
            onStartKmChange={setStartKm}
          />
        </div>

        <hr />

        <AnalysisSection
          prefix={prefix}
          longRunAnalysis={longRunAnalysis}
          intervalAnalysis={intervalAnalysis}
          fuelInterval={fuelInterval}
          fuelSteady={fuelSteady}
          isAnalyzing={isAnalyzing}
          onAnalyze={handleAnalyze}
          onFuelIntervalChange={setFuelInterval}
          onFuelSteadyChange={setFuelSteady}
        />

        <button
          onClick={handleGenerate}
          className="mt-auto w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition shadow-lg mb-24 md:mb-0"
        >
          Generate Plan
        </button>
      </aside>

      <main className="flex-1 p-4 md:p-8 bg-slate-50">
        <div className="max-w-6xl mx-auto pb-32 md:pb-20">
          {planEvents.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-8">
              <WeeklyVolumeChart data={chartData} />
              <ActionBar
                workoutCount={planEvents.length}
                isUploading={isUploading}
                onUpload={handleUpload}
              />
              <StatusMessage message={statusMsg} />
              <WorkoutList events={planEvents} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
