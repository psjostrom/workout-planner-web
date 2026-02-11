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
					<h2 className="text-2xl font-bold">
						{format(currentMonth, "MMMM yyyy")}
					</h2>
					<div className="flex gap-2">
						<button
							onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
							className="p-2 hover:bg-slate-100 rounded-lg transition"
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
						>
							<ChevronRight size={20} />
						</button>
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
										className={`min-h-24 border rounded-lg p-2 ${
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
													className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate ${getEventColor(event)} hover:opacity-80 transition`}
												>
													<span className="mr-1">{getEventIcon(event)}</span>
													{event.name}
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
						className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl"
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
							<div className="grid grid-cols-2 gap-4 text-sm">
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
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
