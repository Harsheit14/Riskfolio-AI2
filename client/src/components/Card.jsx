/**
 * Card Component
 * Reusable card container
 */
export default function Card({
  title,
  subtitle,
  children,
  className = "",
  headerAction,
}) {
  return (
    <div className={`card ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="card-header flex-between">
          <div>
            {title && <h3 className="text-xl font-bold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
