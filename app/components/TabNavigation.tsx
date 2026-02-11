interface TabNavigationProps {
	activeTab: "planner" | "calendar";
	onTabChange: (tab: "planner" | "calendar") => void;
}

export function TabNavigation({
	activeTab,
	onTabChange,
}: TabNavigationProps) {
	return (
		<div className="flex gap-2 border-b border-slate-200 mb-6">
			<button
				onClick={() => onTabChange("planner")}
				className={`px-6 py-3 font-medium transition-colors relative ${
					activeTab === "planner"
						? "text-slate-900"
						: "text-slate-500 hover:text-slate-700"
				}`}
			>
				Planner
				{activeTab === "planner" && (
					<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
				)}
			</button>
			<button
				onClick={() => onTabChange("calendar")}
				className={`px-6 py-3 font-medium transition-colors relative ${
					activeTab === "calendar"
						? "text-slate-900"
						: "text-slate-500 hover:text-slate-700"
				}`}
			>
				Calendar
				{activeTab === "calendar" && (
					<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
				)}
			</button>
		</div>
	);
}
