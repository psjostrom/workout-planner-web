"use client";

import { useState, useEffect } from "react";
import {
	startOfMonth,
	endOfMonth,
	startOfWeek,
	endOfWeek,
	addDays,
	format,
	isSameMonth,
	isSameDay,
	addMonths,
	subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { CalendarEvent, fetchCalendarData } from "@/lib/plannerLogic";
import { HRZoneBar } from "./HRZoneBar";
import { HRZoneBreakdown } from "./HRZoneBreakdown";
import { WorkoutStreamGraph } from "./WorkoutStreamGraph";

interface CalendarViewProps {
	apiKey: string;
}

export function CalendarView({ apiKey }: CalendarViewProps) {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
		null,
	);

	useEffect(() => {
		if (!apiKey) return;

		const loadCalendarData = async () => {
			setIsLoading(true);
			const monthStart = startOfMonth(currentMonth);
			const monthEnd = endOfMonth(currentMonth);

			// Fetch data for current month plus buffer
			const startDate = startOfWeek(monthStart);
			const endDate = endOfWeek(monthEnd);

			const data = await fetchCalendarData(apiKey, startDate, endDate);
			setEvents(data);
			setIsLoading(false);
		};

		loadCalendarData();
	}, [apiKey, currentMonth]);

	const monthStart = startOfMonth(currentMonth);
	const monthEnd = endOfMonth(currentMonth);
	const calendarStart = startOfWeek(monthStart);
	const calendarEnd = endOfWeek(monthEnd);

	const days: Date[] = [];
	let day = calendarStart;
	while (day <= calendarEnd) {
		days.push(day);
		day = addDays(day, 1);
	}

	const getEventsForDay = (date: Date) => {
		return events.filter((event) => isSameDay(event.date, date));
	};

	const getEventColor = (event: CalendarEvent) => {
		if (event.type === "race") return "bg-red-500 text-white";
		if (event.type === "completed") {
			if (event.category === "long") return "bg-green-600 text-white";
			if (event.category === "interval") return "bg-purple-600 text-white";
			return "bg-green-500 text-white";
		}
		// Planned
		if (event.category === "long") return "bg-green-200 text-green-800";
		if (event.category === "interval") return "bg-purple-200 text-purple-800";
		return "bg-blue-200 text-blue-800";
	};

	const getEventIcon = (event: CalendarEvent) => {
		if (event.type === "race") return "🏁";
		if (event.category === "long") return "🏃";
		if (event.category === "interval") return "⚡";
		return "✓";
	};

	return (
		<div className="max-w-6xl mx-auto">
			{/* Month Navigation */}
			<div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold">
							{format(currentMonth, "MMMM yyyy")}
						</h2>
						<p className="text-sm text-slate-500 mt-1">
							💡 Navigate to past months to see completed workouts with HR zones & glucose data
						</p>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
							className="p-2 hover:bg-slate-100 rounded-lg transition"
							title="Previous month"
						>
							<ChevronLeft size={20} />
						</button>
						<button
							onClick={() => setCurrentMonth(new Date())}
							className="px-4 py-2 hover:bg-slate-100 rounded-lg transition text-sm font-medium"
						>
							Today
						</button>
						<button
							onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
							className="p-2 hover:bg-slate-100 rounded-lg transition"
							title="Next month"
						>
							<ChevronRight size={20} />
						</button>
					</div>
				</div>
			</div>

			{/* Legend */}
			<div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
				<div className="flex items-center gap-6 text-xs">
					<div className="font-semibold text-slate-700">Legend:</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 bg-green-600 rounded"></div>
						<span>Completed Long Run (with HR & glucose data)</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 bg-purple-600 rounded"></div>
						<span>Completed Interval/Tempo</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
						<span>Planned Long Run</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 bg-purple-200 border border-purple-300 rounded"></div>
						<span>Planned Interval/Tempo</span>
					</div>
				</div>
			</div>

			{/* Calendar Grid */}
			<div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
				{isLoading && (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="animate-spin text-slate-400" size={32} />
					</div>
				)}

				{!isLoading && (
					<>
						{/* Weekday Headers */}
						<div className="grid grid-cols-7 gap-2 mb-2">
							{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
								<div
									key={day}
									className="text-center text-sm font-semibold text-slate-600 py-2"
								>
									{day}
								</div>
							))}
						</div>

						{/* Calendar Days */}
						<div className="grid grid-cols-7 gap-2">
							{days.map((day, idx) => {
								const dayEvents = getEventsForDay(day);
								const isCurrentMonth = isSameMonth(day, currentMonth);
								const isToday = isSameDay(day, new Date());

								return (
									<div
										key={idx}
										className={`min-h-32 border rounded-lg p-2 ${
											isCurrentMonth
												? "bg-white border-slate-200"
												: "bg-slate-50 border-slate-100"
										} ${isToday ? "ring-2 ring-blue-500" : ""}`}
									>
										<div
											className={`text-sm font-medium mb-1 ${
												isCurrentMonth ? "text-slate-900" : "text-slate-400"
											} ${isToday ? "text-blue-600 font-bold" : ""}`}
										>
											{format(day, "d")}
										</div>

										<div className="space-y-1">
											{dayEvents.map((event) => (
												<button
													key={event.id}
													onClick={() => setSelectedEvent(event)}
													className={`w-full text-left px-1.5 py-1 rounded text-xs ${getEventColor(event)} hover:opacity-80 transition space-y-1`}
												>
													<div className="font-medium truncate">
														<span className="mr-1">{getEventIcon(event)}</span>
														{event.name}
													</div>
													{event.type === "completed" && (
														<>
															<div className="flex gap-1 text-xs flex-wrap">
																{event.duration && (
																	<span className="bg-black bg-opacity-10 px-1 rounded">
																		{Math.floor(event.duration / 60)}m
																	</span>
																)}
																{event.distance && (
																	<span className="bg-black bg-opacity-10 px-1 rounded">
																		{(event.distance / 1000).toFixed(1)}km
																	</span>
																)}
																{event.pace && (
																	<span className="bg-black bg-opacity-10 px-1 rounded">
																		{Math.floor(event.pace)}:{String(Math.round((event.pace % 1) * 60)).padStart(2, '0')}/km
																	</span>
																)}
																{event.avgHr && (
																	<span className="bg-black bg-opacity-10 px-1 rounded">
																		♥ {event.avgHr}
																	</span>
																)}
															</div>
															{event.hrZones && (
																<HRZoneBar
																	z1={event.hrZones.z1}
																	z2={event.hrZones.z2}
																	z3={event.hrZones.z3}
																	z4={event.hrZones.z4}
																	z5={event.hrZones.z5}
																	height="h-1.5"
																/>
															)}
														</>
													)}
													{event.type === "planned" && event.duration && (
														<div className="text-xs opacity-75">
															{Math.floor(event.duration / 60)}m
														</div>
													)}
												</button>
											))}
										</div>
									</div>
								);
							})}
						</div>
					</>
				)}
			</div>

			{/* Event Detail Modal */}
			{selectedEvent && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
					onClick={() => setSelectedEvent(null)}
				>
					<div
						className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-start justify-between mb-4">
							<div>
								<div className="text-sm text-slate-600 mb-1">
									{format(selectedEvent.date, "EEEE, MMMM d, yyyy")}
								</div>
								<h3 className="text-xl font-bold">{selectedEvent.name}</h3>
								<div
									className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${getEventColor(selectedEvent)}`}
								>
									{selectedEvent.type === "completed"
										? "✓ Completed"
										: selectedEvent.type === "race"
											? "🏁 Race"
											: "📅 Planned"}
								</div>
							</div>
							<button
								onClick={() => setSelectedEvent(null)}
								className="text-slate-400 hover:text-slate-600"
							>
								✕
							</button>
						</div>

						{selectedEvent.description && (
							<div className="bg-slate-50 rounded-lg p-4 mb-4">
								<div className="text-sm whitespace-pre-wrap">
									{selectedEvent.description}
								</div>
							</div>
						)}

						{selectedEvent.type === "completed" && (
							<>
								<div className="grid grid-cols-3 gap-4 text-sm mb-4">
									{selectedEvent.distance && (
										<div>
											<div className="text-slate-600">Distance</div>
											<div className="font-semibold">
												{(selectedEvent.distance / 1000).toFixed(2)} km
											</div>
										</div>
									)}
									{selectedEvent.duration && (
										<div>
											<div className="text-slate-600">Duration</div>
											<div className="font-semibold">
												{Math.floor(selectedEvent.duration / 60)} min
											</div>
										</div>
									)}
									{selectedEvent.pace && (
										<div>
											<div className="text-slate-600">Pace</div>
											<div className="font-semibold">
												{Math.floor(selectedEvent.pace)}:{String(Math.round((selectedEvent.pace % 1) * 60)).padStart(2, '0')}/km
											</div>
										</div>
									)}
									{selectedEvent.avgHr && (
										<div>
											<div className="text-slate-600">Avg HR</div>
											<div className="font-semibold">
												{selectedEvent.avgHr} bpm
											</div>
										</div>
									)}
									{selectedEvent.maxHr && (
										<div>
											<div className="text-slate-600">Max HR</div>
											<div className="font-semibold">
												{selectedEvent.maxHr} bpm
											</div>
										</div>
									)}
									{selectedEvent.load && (
										<div>
											<div className="text-slate-600">Load</div>
											<div className="font-semibold">
												{Math.round(selectedEvent.load)}
											</div>
										</div>
									)}
									{selectedEvent.intensity && (
										<div>
											<div className="text-slate-600">Intensity</div>
											<div className="font-semibold">
												{Math.round(selectedEvent.intensity * 100)}%
											</div>
										</div>
									)}
								</div>

								{selectedEvent.hrZones && (
									<div className="mb-4">
										<div className="text-sm font-semibold text-slate-700 mb-3">
											Heart Rate Zones
										</div>
										<HRZoneBreakdown
											z1={selectedEvent.hrZones.z1}
											z2={selectedEvent.hrZones.z2}
											z3={selectedEvent.hrZones.z3}
											z4={selectedEvent.hrZones.z4}
											z5={selectedEvent.hrZones.z5}
										/>
									</div>
								)}

								{selectedEvent.streamData && (
									<div className="mb-4">
										<WorkoutStreamGraph streamData={selectedEvent.streamData} />
									</div>
								)}
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
