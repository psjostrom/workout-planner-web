"use client";

import { useState } from "react";
import { StreamData } from "@/lib/plannerLogic";

interface WorkoutStreamGraphProps {
	streamData: StreamData;
}

type StreamType =
	| "glucose"
	| "heartrate"
	| "pace"
	| "cadence"
	| "altitude"
	| "power";

interface StreamConfig {
	label: string;
	unit: string;
	color: string;
	strokeWidth?: number;
	targetRange?: { min: number; max: number; color: string };
	invertYAxis?: boolean;
	formatValue?: (value: number) => string;
}

const streamConfigs: Record<StreamType, StreamConfig> = {
	glucose: {
		label: "Blood Glucose",
		unit: "mmol/L",
		color: "#8b5cf6",
		strokeWidth: 3,
		targetRange: { min: 3.9, max: 10.0, color: "#dcfce7" }, // 70-180 mg/dL
	},
	heartrate: {
		label: "Heart Rate",
		unit: "bpm",
		color: "#ef4444",
		strokeWidth: 2,
	},
	pace: {
		label: "Pace",
		unit: "min/km",
		color: "#3b82f6",
		strokeWidth: 2,
		invertYAxis: true,
		formatValue: (value: number) => {
			const mins = Math.floor(value);
			const secs = Math.round((value % 1) * 60);
			return `${mins}:${String(secs).padStart(2, "0")}`;
		},
	},
	cadence: {
		label: "Cadence",
		unit: "spm",
		color: "#f59e0b",
		strokeWidth: 2,
	},
	altitude: {
		label: "Elevation",
		unit: "m",
		color: "#10b981",
		strokeWidth: 2,
	},
	power: {
		label: "Power",
		unit: "watts",
		color: "#ec4899",
		strokeWidth: 2,
	},
};

export function WorkoutStreamGraph({ streamData }: WorkoutStreamGraphProps) {
	const availableStreams = Object.keys(streamData).filter(
		(key) => streamData[key as StreamType],
	) as StreamType[];

	// Default selections: glucose + heartrate, or first two available
	const getDefaultSelections = () => {
		if (availableStreams.includes("glucose")) {
			return ["glucose", "heartrate"].filter((s) =>
				availableStreams.includes(s as StreamType),
			) as StreamType[];
		}
		return availableStreams.slice(0, 2);
	};

	const [selectedStreams, setSelectedStreams] = useState<StreamType[]>(
		getDefaultSelections(),
	);

	if (availableStreams.length === 0) return null;

	const toggleStream = (stream: StreamType) => {
		setSelectedStreams((prev) => {
			if (prev.includes(stream)) {
				// Don't allow deselecting all streams
				if (prev.length === 1) return prev;
				return prev.filter((s) => s !== stream);
			}
			return [...prev, stream];
		});
	};
	const width = 700;
	const height = 200;
	const padding = { top: 40, right: 20, bottom: 30, left: 60 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	// Get max time from any selected stream
	const maxTime = Math.max(
		...selectedStreams.map((stream) => {
			const data = streamData[stream];
			return data ? Math.max(...data.map((d) => d.time)) : 0;
		}),
	);

	// Normalize each stream to 0-100% scale and create paths
	const streamPaths = selectedStreams
		.map((streamType) => {
			const data = streamData[streamType];
			if (!data || data.length === 0) return null;

			const config = streamConfigs[streamType];
			const values = data.map((d) => d.value);
			const minValue = Math.min(...values);
			const maxValue = Math.max(...values);

			// Scale to 0-100%
			const scaleX = (time: number) =>
				(time / maxTime) * chartWidth + padding.left;
			const scaleY = (value: number) => {
				const normalized = (value - minValue) / (maxValue - minValue);
				// Invert if needed (for pace)
				const finalNormalized = config.invertYAxis
					? 1 - normalized
					: normalized;
				return height - padding.bottom - finalNormalized * chartHeight;
			};

			const pathData = data
				.map((d, i) => {
					const x = scaleX(d.time);
					const y = scaleY(d.value);
					return `${i === 0 ? "M" : "L"} ${x} ${y}`;
				})
				.join(" ");

			return {
				streamType,
				pathData,
				config,
				minValue,
				maxValue,
				data,
			};
		})
		.filter(Boolean);

	return (
		<div className="w-full">
			{/* Stream selector checkboxes */}
			<div className="flex gap-2 mb-3 flex-wrap">
				{availableStreams.map((stream) => {
					const config = streamConfigs[stream];
					const isSelected = selectedStreams.includes(stream);
					return (
						<button
							key={stream}
							onClick={() => toggleStream(stream)}
							className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
								isSelected
									? "bg-slate-800 text-white"
									: "bg-slate-100 text-slate-700 hover:bg-slate-200"
							}`}
						>
							<div
								className="w-3 h-3 rounded-full"
								style={{
									backgroundColor: isSelected ? config.color : "#cbd5e1",
								}}
							/>
							{config.label}
						</button>
					);
				})}
			</div>

			{/* Legend showing current ranges */}
			<div className="flex gap-4 mb-3 text-xs flex-wrap">
				{streamPaths.map((path, idx) => {
					if (!path) return null;
					const { config, minValue, maxValue } = path;
					const formatVal = config.formatValue || ((v: number) => v.toFixed(1));
					return (
						<div key={idx} className="flex items-center gap-2">
							<div
								className="w-2 h-2 rounded-full"
								style={{ backgroundColor: config.color }}
							/>
							<span className="font-medium" style={{ color: config.color }}>
								{config.label}:
							</span>
							<span className="text-slate-600">
								{formatVal(minValue)} - {formatVal(maxValue)} {config.unit}
							</span>
						</div>
					);
				})}
			</div>

			{/* Graph */}
			<svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
				{/* Grid lines */}
				{Array.from({ length: 5 }).map((_, i) => {
					const yPercent = i / 4;
					const y = height - padding.bottom - yPercent * chartHeight;
					return (
						<line
							key={i}
							x1={padding.left}
							y1={y}
							x2={width - padding.right}
							y2={y}
							stroke="#e2e8f0"
							strokeWidth="1"
						/>
					);
				})}

				{/* Percentage labels */}
				{Array.from({ length: 5 }).map((_, i) => {
					const yPercent = i / 4;
					const y = height - padding.bottom - yPercent * chartHeight;
					return (
						<text
							key={i}
							x={padding.left - 10}
							y={y + 4}
							textAnchor="end"
							fontSize="10"
							fill="#94a3b8"
						>
							{Math.round(yPercent * 100)}%
						</text>
					);
				})}

				{/* Data lines */}
				{streamPaths.map((path, idx) => {
					if (!path) return null;
					return (
						<path
							key={idx}
							d={path.pathData}
							fill="none"
							stroke={path.config.color}
							strokeWidth={path.config.strokeWidth || 2}
							strokeLinecap="round"
							strokeLinejoin="round"
							opacity="0.9"
						/>
					);
				})}

				{/* X-axis label */}
				<text
					x={width / 2}
					y={height - 5}
					textAnchor="middle"
					fontSize="11"
					fill="#64748b"
					fontWeight="500"
				>
					Time (minutes)
				</text>

				{/* Y-axis label */}
				<text
					x={10}
					y={height / 2}
					textAnchor="middle"
					fontSize="11"
					fill="#64748b"
					fontWeight="500"
					transform={`rotate(-90, 10, ${height / 2})`}
				>
					Normalized (%)
				</text>
			</svg>
			<div className="flex justify-between text-xs text-slate-500 mt-1 px-12">
				<span>0m</span>
				<span>{Math.round(maxTime / 2)}m</span>
				<span>{maxTime}m</span>
			</div>
			<div className="text-xs text-slate-500 mt-2 italic">
				💡 Each metric is normalized to 0-100% of its range for comparison
			</div>
		</div>
	);
}
