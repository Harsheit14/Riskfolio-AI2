/**
 * LoadingSkeleton component
 * Animated pulse skeleton loader for data placeholders
 * 
 * @prop {string} width - Width class (e.g. 'w-full', 'w-32')
 * @prop {string} height - Height class (e.g. 'h-4', 'h-12')
 * @prop {string} className - Additional Tailwind classes
 * @prop {boolean} circle - If true, makes it circular (rounded-full)
 */
export default function LoadingSkeleton({ 
  width = "w-full", 
  height = "h-4", 
  className = "",
  circle = false 
}) {
  return (
    <div
      className={`animate-pulse bg-white/5 ${width} ${height} ${
        circle ? "rounded-full" : "rounded-lg"
      } ${className}`}
    />
  );
}
