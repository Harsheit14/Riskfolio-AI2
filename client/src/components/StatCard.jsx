/**
 * StatCard component
 * Reusable card for displaying statistics
 * 
 * @prop {string} title - Card title/label
 * @prop {string|number} value - Main value to display
 * @prop {string} subtitle - Optional subtitle/unit
 * @prop {string} trend - 'up' | 'down' | 'neutral'
 * @prop {number} trendPercent - Percentage value for trend display
 * @prop {string} color - 'green' | 'red' | 'amber' | 'indigo'
 */
export default function StatCard({
  title,
  value,
  subtitle,
  trend = "neutral",
  trendPercent,
  color = "indigo",
}) {
  const trendColor =
    trend === "up"
      ? "text-green-400"
      : trend === "down"
      ? "text-red-400"
      : "text-slate-400";

  const trendIcon =
    trend === "up"
      ? "↑"
      : trend === "down"
      ? "↓"
      : "";

  const colorClass =
    color === "green"
      ? "border-green-500/30"
      : color === "red"
      ? "border-red-500/30"
      : color === "amber"
      ? "border-amber-500/30"
      : "border-indigo-500/30";

  return (
    <div
      className={`rounded-2xl bg-[#1a1d27] border ${colorClass} p-6 shadow-xl`}
    >
      <p className="text-sm text-slate-400 font-medium mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {trendPercent !== undefined && (
          <div className={`text-right text-sm font-semibold ${trendColor}`}>
            <span>{trendIcon}</span>
            <span>{Math.abs(trendPercent).toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
