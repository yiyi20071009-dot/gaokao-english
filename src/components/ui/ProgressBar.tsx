interface ProgressBarProps {
  value: number;
  max: number;
  color?: "primary" | "accent" | "yellow" | "red";
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function ProgressBar({
  value,
  max,
  color = "primary",
  showLabel = false,
  size = "md",
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors = {
    primary: "bg-primary-500",
    accent: "bg-accent-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 progress-bar ${size === "sm" ? "h-1.5" : "h-2"}`}>
        <div
          className={`progress-fill ${colors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-ink-secondary font-medium tabular-nums w-10 text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
}
