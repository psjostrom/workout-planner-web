import {
	addDays,
	addWeeks,
	format,
	startOfWeek,
	parseISO,
	isBefore,
	isSameDay,
} from "date-fns";

// --- CONSTANTS ---
export const DEFAULT_LTHR = 169;
export const CRASH_DROP_RATE = -3.0;
export const SPIKE_RISE_RATE = 3.0;
export const DEFAULT_CARBS_G = 10;
export const API_BASE = "https://intervals.icu/api/v1";

// --- TYPES ---
export interface WorkoutEvent {
	start_date_local: Date;
	name: string;
	description: string;
	external_id: string;
	type: "Run";
}

export interface AnalysisResult {
	longRun: {
		trend: number;
		currentFuel: number;
		plotData: { time: number; glucose: number }[];
	} | null;
	interval: {
		trend: number;
		currentFuel: number;
		plotData: { time: number; glucose: number }[];
	} | null;
	msg?: string;
}

interface PlanContext {
	fuelInterval: number; // Low fuel for intervals/tempo/hills (e.g., 5g/10m)
	fuelSteady: number; // Moderate/high fuel for easy/long runs (e.g., 10g/10m)
	raceDate: Date;
	raceDist: number;
	prefix: string;
	totalWeeks: number;
	startKm: number;
	lthr: number;
	planStartMonday: Date;
	zones: {
		easy: { min: number; max: number };
		steady: { min: number; max: number };
		tempo: { min: number; max: number };
		hard: { min: number; max: number };
	};
}

// New interfaces to avoid 'any' in analysis
interface IntervalsActivity {
	id: string;
	start_date: string;
	name: string;
	description?: string;
}

interface IntervalsStream {
	type: string;
	data: number[];
}

// --- HELPER FUNCTIONS ---
export const getEstimatedDuration = (event: WorkoutEvent): number => {
	// 1. Long Run: Calculate 6 min/km (approximate trail pace)
	if (event.name.includes("LR")) {
		const match = event.name.match(/(\d+)km/);
		if (match) return parseInt(match[1]) * 6;
	}

	// 2. Default duration for other workouts (Easy, Tempo, Hills)
	return 45;
};

const formatStep = (
	duration: string,
	minPct: number,
	maxPct: number,
	lthr: number,
	note?: string,
): string => {
	const minBpm = Math.floor(lthr * minPct);
	const maxBpm = Math.ceil(lthr * maxPct);
	// Note comes first (for Garmin display), then duration, then zone
	const core = `${duration} ${Math.floor(minPct * 100)}-${Math.ceil(maxPct * 100)}% LTHR (${minBpm}-${maxBpm} bpm)`;
	return note ? `${note} ${core}` : core;
};

const createWorkoutText = (
	title: string,
	warmup: string,
	mainSteps: string[],
	cooldown: string,
	repeats: number = 1,
): string => {
	return [
		title,
		"",
		"Warmup",
		`- ${warmup}`, // Added dash here since formatStep doesn't include it
		"",
		repeats > 1 ? `Main set ${repeats}x` : "Main set",
		...mainSteps.map((s) => `- ${s}`),
		"",
		"Cooldown",
		`- ${cooldown}`, // Added dash here
		"",
	].join("\n");
};

// --- ANALYSIS LOGIC ---
async function fetchStreams(
	activityId: string,
	apiKey: string,
): Promise<IntervalsStream[]> {
	const auth = "Basic " + btoa("API_KEY:" + apiKey);
	const keys = ["time", "bloodglucose", "glucose", "ga_smooth"].join(",");
	try {
		const res = await fetch(
			`${API_BASE}/activity/${activityId}/streams?keys=${keys}`,
			{ headers: { Authorization: auth } },
		);
		if (res.ok) return await res.json();
	} catch (e) {
		console.error(e);
	}
	return [];
}

// Categorize workout by type based on name
function getWorkoutCategory(name: string): "long" | "interval" | "other" {
	const lowerName = name.toLowerCase();
	if (lowerName.includes("lr") || lowerName.includes("long")) return "long";
	if (lowerName.includes("tempo") || lowerName.includes("hills"))
		return "interval";
	return "other";
}

async function analyzeRun(
	run: IntervalsActivity,
	apiKey: string,
): Promise<{
	trend: number;
	currentFuel: number;
	plotData: { time: number; glucose: number }[];
}> {
	const streams = await fetchStreams(run.id, apiKey);
	let tData: number[] = [];
	let gData: number[] = [];

	for (const s of streams) {
		if (s.type === "time") tData = s.data;
		if (["bloodglucose", "glucose", "ga_smooth"].includes(s.type)) {
			gData = s.data;
		}
	}

	let plotData: { time: number; glucose: number }[] = [];
	let trend = 0.0;
	let currentFuel = 10;

	// Get fuel from description
	const match = run.description?.match(/FUEL:\s*(\d+)g/i);
	if (match) currentFuel = parseInt(match[1]);

	if (gData.length > 0 && tData.length > 1) {
		plotData = tData.map((t, idx) => ({
			time: Math.round(t / 60),
			glucose: gData[idx],
		}));
		const delta = gData[gData.length - 1] - gData[0];
		const durationHr = (tData[tData.length - 1] - tData[0]) / 3600;
		if (durationHr > 0.2) {
			trend = delta / durationHr;
		}
	}

	return { trend, currentFuel, plotData };
}

export async function analyzeHistory(
	apiKey: string,
	prefix: string,
): Promise<AnalysisResult> {
	const auth = "Basic " + btoa("API_KEY:" + apiKey);
	const today = new Date();
	const startDate = addDays(today, -45);
	const oldest = format(startDate, "yyyy-MM-dd");
	const newest = format(today, "yyyy-MM-dd");

	try {
		const res = await fetch(
			`${API_BASE}/athlete/0/activities?oldest=${oldest}&newest=${newest}`,
			{ headers: { Authorization: auth } },
		);
		if (!res.ok) throw new Error("Failed to fetch activities");
		const activities: IntervalsActivity[] = await res.json();

		const relevant = activities.filter((a) =>
			a.name.toLowerCase().includes(prefix.toLowerCase()),
		);

		if (relevant.length === 0) {
			return { longRun: null, interval: null, msg: "No activities found" };
		}

		// Sort by date (most recent first)
		relevant.sort(
			(a, b) =>
				new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
		);

		// Find most recent Long run and Interval run
		const mostRecentLong = relevant.find(
			(a) => getWorkoutCategory(a.name) === "long",
		);
		const mostRecentInterval = relevant.find(
			(a) => getWorkoutCategory(a.name) === "interval",
		);

		const result: AnalysisResult = {
			longRun: null,
			interval: null,
		};

		// Analyze Long run if found
		if (mostRecentLong) {
			result.longRun = await analyzeRun(mostRecentLong, apiKey);
		}

		// Analyze Interval run if found
		if (mostRecentInterval) {
			result.interval = await analyzeRun(mostRecentInterval, apiKey);
		}

		return result;
	} catch (error) {
		console.error("Analysis failed", error);
		return { longRun: null, interval: null, msg: "Analysis failed" };
	}
}

// --- PLAN GENERATORS ---

const generateQualityRun = (
	ctx: PlanContext,
	weekIdx: number,
	weekStart: Date,
): WorkoutEvent | null => {
	const date = addDays(weekStart, 1);
	if (!isBefore(date, ctx.raceDate) && !isSameDay(date, ctx.raceDate))
		return null;
	if (isSameDay(date, ctx.raceDate)) return null;

	const weekNum = weekIdx + 1;
	const progress = weekIdx / ctx.totalWeeks;
	const isRaceWeek = weekNum === ctx.totalWeeks;
	const isRaceTest =
		weekNum === ctx.totalWeeks - 2 || weekNum === ctx.totalWeeks - 3;

	const stratHard = `PUMP OFF - FUEL: ${ctx.fuelInterval}g/10m`; // Intervals use LOW fuel
	// FIX: We add the strategy as a Note in formatStep, so it ends up first on the line
	const wu = formatStep(
		"10m",
		ctx.zones.easy.min,
		ctx.zones.easy.max,
		ctx.lthr,
		stratHard,
	);
	const cd = formatStep("5m", ctx.zones.easy.min, ctx.zones.easy.max, ctx.lthr);

	const prefixName = `W${weekNum.toString().padStart(2, "0")} Tue`;
	const isTempo = weekIdx % 2 !== 0;

	if (isTempo) {
		const isShakeout = isRaceWeek;
		const reps = isShakeout ? 2 : isRaceTest ? 3 : 3 + Math.floor(progress * 3);
		const steps = isShakeout
			? [
					formatStep("5m", ctx.zones.tempo.min, ctx.zones.tempo.max, ctx.lthr),
					formatStep("2m", ctx.zones.easy.min, ctx.zones.easy.max, ctx.lthr),
				]
			: [
					formatStep("8m", ctx.zones.tempo.min, ctx.zones.tempo.max, ctx.lthr),
					formatStep("2m", ctx.zones.easy.min, ctx.zones.easy.max, ctx.lthr),
				];
		return {
			start_date_local: new Date(date.setHours(12, 0, 0)),
			name: `${prefixName} Tempo ${ctx.prefix}${isShakeout ? " [SHAKEOUT]" : ""}`,
			description: createWorkoutText(stratHard, wu, steps, cd, reps),
			external_id: `${ctx.prefix}-tue-${weekNum}`,
			type: "Run",
		};
	}
	const isShakeout = isRaceWeek;
	const reps = isShakeout ? 2 : isRaceTest ? 4 : 6;
	const steps = [
		formatStep(
			"2m",
			ctx.zones.hard.min,
			ctx.zones.hard.max,
			ctx.lthr,
			"Uphill",
		),
		formatStep(
			"2m",
			ctx.zones.easy.min,
			ctx.zones.easy.max,
			ctx.lthr,
			"Downhill",
		),
	];
	return {
		start_date_local: new Date(date.setHours(12, 0, 0)),
		name: `${prefixName} Hills ${ctx.prefix}${isShakeout ? " [SHAKEOUT]" : ""}`,
		description: createWorkoutText(stratHard, wu, steps, cd, reps),
		external_id: `${ctx.prefix}-tue-${weekNum}`,
		type: "Run",
	};
};

const generateEasyRun = (
	ctx: PlanContext,
	weekIdx: number,
	weekStart: Date,
): WorkoutEvent | null => {
	const date = addDays(weekStart, 3);
	if (!isBefore(date, ctx.raceDate) && !isSameDay(date, ctx.raceDate))
		return null;
	if (isSameDay(date, ctx.raceDate)) return null;
	const weekNum = weekIdx + 1;
	const progress = weekIdx / ctx.totalWeeks;
	const isRaceWeek = weekNum === ctx.totalWeeks;
	const isRaceTest =
		weekNum === ctx.totalWeeks - 2 || weekNum === ctx.totalWeeks - 3;

	const stratEasy = `PUMP ON (-50%) - FUEL: ${ctx.fuelSteady}g/10m`; // Easy runs use MODERATE fuel
	// FIX: Strategy here as well
	const wu = formatStep(
		"10m",
		ctx.zones.easy.min,
		ctx.zones.easy.max,
		ctx.lthr,
		stratEasy,
	);
	const cd = formatStep("5m", ctx.zones.easy.min, ctx.zones.easy.max, ctx.lthr);

	const duration = isRaceWeek
		? 20
		: isRaceTest
			? 30
			: 40 + Math.floor(progress * 20);
	const name = `W${weekNum.toString().padStart(2, "0")} Thu Easy ${ctx.prefix}${isRaceWeek ? " [SHAKEOUT]" : ""}`;
	return {
		start_date_local: new Date(date.setHours(12, 0, 0)),
		name,
		description: createWorkoutText(
			stratEasy,
			wu,
			[formatStep(`${duration}m`, ctx.zones.easy.min, ctx.zones.easy.max, ctx.lthr)],
			cd,
		),
		external_id: `${ctx.prefix}-thu-${weekNum}`,
		type: "Run",
	};
};

const generateBonusRun = (
	ctx: PlanContext,
	weekIdx: number,
	weekStart: Date,
): WorkoutEvent | null => {
	const date = addDays(weekStart, 5);
	if (!isBefore(date, ctx.raceDate) && !isSameDay(date, ctx.raceDate))
		return null;
	if (isSameDay(date, ctx.raceDate)) return null;
	const weekNum = weekIdx + 1;

	const stratEasy = `PUMP ON (-50%) - FUEL: ${ctx.fuelSteady}g/10m`; // Bonus runs use MODERATE fuel
	// FIX: Strategy here
	const wu = formatStep(
		"10m",
		ctx.zones.easy.min,
		ctx.zones.easy.max,
		ctx.lthr,
		stratEasy,
	);
	const cd = formatStep("5m", ctx.zones.easy.min, ctx.zones.easy.max, ctx.lthr);

	const name = `W${weekNum.toString().padStart(2, "0")} Sat Bonus (Optional) ${ctx.prefix}`;
	return {
		start_date_local: new Date(date.setHours(12, 0, 0)),
		name,
		description: createWorkoutText(
			stratEasy,
			wu,
			[formatStep("30m", ctx.zones.easy.min, ctx.zones.easy.max, ctx.lthr)],
			cd,
		),
		external_id: `${ctx.prefix}-sat-${weekNum}`,
		type: "Run",
	};
};

const generateLongRun = (
	ctx: PlanContext,
	weekIdx: number,
	weekStart: Date,
): WorkoutEvent | null => {
	const weekNum = weekIdx + 1;
	const isRaceWeek = weekNum === ctx.totalWeeks;
	const stratLong = `PUMP OFF - FUEL: ${ctx.fuelSteady}g/10m`; // Long runs use HIGH fuel
	if (isRaceWeek) {
		return {
			start_date_local: new Date(ctx.raceDate.setHours(10, 0, 0)),
			name: `RACE DAY ${ctx.prefix}`,
			description: `RACE DAY! ${ctx.raceDist}km. ${stratLong}\n\nGood luck!`,
			external_id: `${ctx.prefix}-race`,
			type: "Run",
		};
	}
	const date = addDays(weekStart, 6);
	if (!isBefore(date, ctx.raceDate)) return null;
	const isTaper = weekNum === ctx.totalWeeks - 1;
	const isRaceTest =
		weekNum === ctx.totalWeeks - 2 || weekNum === ctx.totalWeeks - 3;
	const isRecoveryWeek = weekNum % 4 === 0;
	let km = Math.min(
		Math.floor(
			ctx.startKm +
				((ctx.raceDist - ctx.startKm) / Math.max(ctx.totalWeeks - 4, 1)) *
					weekIdx,
		),
		ctx.raceDist,
	);
	let type = "";
	if (isRecoveryWeek) {
		km = ctx.startKm;
		type = " [RECOVERY]";
	}
	if (isTaper) {
		km = Math.floor(ctx.raceDist * 0.5);
		type = " [TAPER]";
	}
	if (isRaceTest) {
		km = ctx.raceDist;
		type = " [RACE TEST]";
	}

	// FIX: Strategy here
	const wu = formatStep(
		"10m",
		ctx.zones.easy.min,
		ctx.zones.easy.max,
		ctx.lthr,
		stratLong,
	);
	const cd = formatStep("5m", ctx.zones.easy.min, ctx.zones.easy.max, ctx.lthr);

	return {
		start_date_local: new Date(date.setHours(10, 0, 0)),
		name: `W${weekNum.toString().padStart(2, "0")} Sun LR (${km}km)${type} ${ctx.prefix}`,
		description: createWorkoutText(
			`${stratLong} (Trail)`,
			wu,
			[
				formatStep(
					`${km}km`,
					ctx.zones.steady.min,
					ctx.zones.steady.max,
					ctx.lthr,
				),
			],
			cd,
		),
		external_id: `${ctx.prefix}-sun-${weekNum}`,
		type: "Run",
	};
};

// --- MAIN ORCHESTRATOR ---
export function generatePlan(
	fuelInterval: number, // Low fuel for intervals/tempo/hills (e.g., 5g/10m)
	fuelSteady: number, // Moderate/high fuel for easy/long runs (e.g., 10g/10m)
	raceDateStr: string,
	raceDist: number,
	prefix: string,
	totalWeeks: number,
	startKm: number,
	lthr: number,
): WorkoutEvent[] {
	const raceDate = parseISO(raceDateStr);
	const today = new Date();
	const ctx: PlanContext = {
		fuelInterval,
		fuelSteady,
		raceDate,
		raceDist,
		prefix,
		totalWeeks,
		startKm,
		lthr,
		planStartMonday: addWeeks(
			startOfWeek(raceDate, { weekStartsOn: 1 }),
			-(totalWeeks - 1),
		),
		zones: {
			easy: { min: 0.72, max: 0.8 },
			steady: { min: 0.77, max: 0.84 },
			tempo: { min: 0.88, max: 0.94 },
			hard: { min: 0.95, max: 1.0 },
		},
	};
	const weekIndices = Array.from({ length: totalWeeks }, (_, i) => i);
	return weekIndices.flatMap((i) => {
		const weekStart = addWeeks(ctx.planStartMonday, i);
		if (isBefore(addDays(weekStart, 7), today)) return [];
		return [
			generateQualityRun(ctx, i, weekStart),
			generateEasyRun(ctx, i, weekStart),
			generateBonusRun(ctx, i, weekStart),
			generateLongRun(ctx, i, weekStart),
		].filter((e): e is WorkoutEvent => e !== null);
	});
}

// --- API UPLOAD ---
export async function uploadToIntervals(
	apiKey: string,
	events: WorkoutEvent[],
	prefix: string,
): Promise<number> {
	const auth = "Basic " + btoa("API_KEY:" + apiKey);
	const todayStr = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
	const endStr = format(addDays(new Date(), 365), "yyyy-MM-dd'T'HH:mm:ss");

	// Delete all future workouts with a single call
	try {
		console.log("Deleting all future workouts...");
		const deleteRes = await fetch(
			`${API_BASE}/athlete/0/events?oldest=${todayStr}&newest=${endStr}&category=WORKOUT`,
			{
				method: "DELETE",
				headers: { Authorization: auth },
			},
		);

		if (!deleteRes.ok) {
			console.error(`Delete failed with status ${deleteRes.status}`);
		}
	} catch (deleteError) {
		console.error("Error during deletion phase:", deleteError);
		// Continue with upload even if deletion fails
	}

	// Upload the new plan
	const payload = events.map((e) => ({
		category: "WORKOUT",
		start_date_local: format(e.start_date_local, "yyyy-MM-dd'T'HH:mm:ss"),
		name: e.name,
		description: e.description,
		external_id: e.external_id,
		type: e.type,
	}));

	try {
		const res = await fetch(`${API_BASE}/athlete/0/events/bulk?upsert=true`, {
			method: "POST",
			headers: { Authorization: auth, "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const errorText = await res.text();
			throw new Error(`API Error ${res.status}: ${errorText}`);
		}
		return payload.length;
	} catch (error) {
		console.error("Upload failed:", error);
		console.error("Payload size:", payload.length);
		console.error("First event:", payload[0]);
		throw error;
	}
}
