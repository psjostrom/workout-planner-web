import { TrendingUp } from "lucide-react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
} from "recharts";

interface AnalysisSectionProps {
	prefix: string;
	longRunAnalysis: {
		trend: number;
		plotData: { time: number; glucose: number }[];
	} | null;
	intervalAnalysis: {
		trend: number;
		plotData: { time: number; glucose: number }[];
	} | null;
	fuelInterval: number;
	fuelSteady: number;
	isAnalyzing: boolean;
	onAnalyze: () => void;
	onFuelIntervalChange: (value: number) => void;
	onFuelSteadyChange: (value: number) => void;
}

function GlucoseChart({
	plotData,
	title,
}: {
	plotData: { time: number; glucose: number }[];
	title: string;
}) {
	if (plotData.length === 0) return null;

	return (
		<div>
			<div className="text-xs font-medium text-slate-600 mb-1">{title}</div>
			<div className="h-32 w-full bg-white rounded border border-slate-200 p-1 min-h-0">
				<ResponsiveContainer width="100%" height="100%" minHeight={120}>
					<LineChart
						data={plotData}
						margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
					>
						<XAxis
							dataKey="time"
							tick={{ fontSize: 10, fill: "#64748b" }}
							interval="preserveStartEnd"
							tickLine={false}
							axisLine={{ stroke: "#e2e8f0" }}
						/>
						<YAxis
							domain={["dataMin - 1", "dataMax + 1"]}
							tick={{ fontSize: 10, fill: "#64748b" }}
							width={35}
							tickLine={false}
							axisLine={false}
							tickFormatter={(number) => number.toFixed(1)}
						/>
						<Tooltip
							contentStyle={{
								fontSize: "12px",
								borderRadius: "4px",
								border: "1px solid #e2e8f0",
							}}
							formatter={(
								value: number | string | Array<number | string> | undefined,
							) => {
								if (value === undefined || value === null)
									return ["-", "mmol/L"];
								if (Array.isArray(value)) return [value.join(", "), "mmol/L"];
								const num = Number(value);
								return [!isNaN(num) ? num.toFixed(1) : value, "mmol/L"];
							}}
							labelFormatter={(label) => `${label} min`}
						/>
						<Line
							type="monotone"
							dataKey="glucose"
							stroke="#ef4444"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

export function AnalysisSection({
	prefix,
	longRunAnalysis,
	intervalAnalysis,
	fuelInterval,
	fuelSteady,
	isAnalyzing,
	onAnalyze,
	onFuelIntervalChange,
	onFuelSteadyChange,
}: AnalysisSectionProps) {
	const hasAnalysis = longRunAnalysis !== null || intervalAnalysis !== null;
	return (
		<div className="bg-slate-100 p-4 rounded-lg">
			<h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
				<TrendingUp size={16} /> Analysis
			</h3>
			{!hasAnalysis ? (
				<button
					onClick={onAnalyze}
					disabled={isAnalyzing}
					className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
				>
					{isAnalyzing ? "Fetching..." : `Analyze '${prefix}'`}
				</button>
			) : (
				<div className="space-y-4">
					{/* Long Run Analysis */}
					{longRunAnalysis && (
						<div className="space-y-2">
							<GlucoseChart
								plotData={longRunAnalysis.plotData}
								title="Last Long Run"
							/>
							<div className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-200 gap-2">
								<div className="flex items-center gap-1 shrink-0">
									<span className="text-slate-600">Long/Easy:</span>
									<input
										type="number"
										value={fuelSteady}
										onChange={(e) => onFuelSteadyChange(Number(e.target.value))}
										className="w-10 p-1 text-center text-sm font-bold border rounded"
									/>
									<span className="text-slate-500">g/10m</span>
								</div>
								<div className="flex items-center gap-1 shrink-0">
									<span className="text-slate-600">Trend:</span>
									<span
										className={
											longRunAnalysis.trend < -3
												? "text-red-600 font-bold"
												: "text-green-600"
										}
									>
										{longRunAnalysis.trend.toFixed(1)}
									</span>
								</div>
							</div>
						</div>
					)}

					{/* Interval Analysis */}
					{intervalAnalysis && (
						<div className="space-y-2">
							<GlucoseChart
								plotData={intervalAnalysis.plotData}
								title="Last Interval/Tempo"
							/>
							<div className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-200 gap-2">
								<div className="flex items-center gap-1 shrink-0">
									<span className="text-slate-600">Intervals:</span>
									<input
										type="number"
										value={fuelInterval}
										onChange={(e) => onFuelIntervalChange(Number(e.target.value))}
										className="w-10 p-1 text-center text-sm font-bold border rounded"
									/>
									<span className="text-slate-500">g/10m</span>
								</div>
								<div className="flex items-center gap-1 shrink-0">
									<span className="text-slate-600">Trend:</span>
									<span
										className={
											intervalAnalysis.trend < -3
												? "text-red-600 font-bold"
												: intervalAnalysis.trend > 3
													? "text-orange-600 font-bold"
													: "text-green-600"
										}
									>
										{intervalAnalysis.trend.toFixed(1)}
									</span>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
