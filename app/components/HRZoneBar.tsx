interface HRZoneBarProps {
	z1: number;
	z2: number;
	z3: number;
	z4: number;
	z5: number;
	height?: string;
}

export function HRZoneBar({ z1, z2, z3, z4, z5, height = "h-2" }: HRZoneBarProps) {
	const total = z1 + z2 + z3 + z4 + z5;
	if (total === 0) return null;

	const percentages = {
		z1: (z1 / total) * 100,
		z2: (z2 / total) * 100,
		z3: (z3 / total) * 100,
		z4: (z4 / total) * 100,
		z5: (z5 / total) * 100,
	};

	return (
		<div className={`flex ${height} rounded-full overflow-hidden w-full`}>
			{percentages.z1 > 0 && (
				<div
					className="bg-green-500"
					style={{ width: `${percentages.z1}%` }}
					title={`Z1: ${Math.round(percentages.z1)}%`}
				/>
			)}
			{percentages.z2 > 0 && (
				<div
					className="bg-blue-400"
					style={{ width: `${percentages.z2}%` }}
					title={`Z2: ${Math.round(percentages.z2)}%`}
				/>
			)}
			{percentages.z3 > 0 && (
				<div
					className="bg-yellow-400"
					style={{ width: `${percentages.z3}%` }}
					title={`Z3: ${Math.round(percentages.z3)}%`}
				/>
			)}
			{percentages.z4 > 0 && (
				<div
					className="bg-orange-500"
					style={{ width: `${percentages.z4}%` }}
					title={`Z4: ${Math.round(percentages.z4)}%`}
				/>
			)}
			{percentages.z5 > 0 && (
				<div
					className="bg-red-600"
					style={{ width: `${percentages.z5}%` }}
					title={`Z5: ${Math.round(percentages.z5)}%`}
				/>
			)}
		</div>
	);
}
