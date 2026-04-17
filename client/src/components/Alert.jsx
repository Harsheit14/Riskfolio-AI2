/**
 * Alert Component
 * Reusable alert/notification component
 */
export default function Alert({
  type = "info",
  title,
  message,
  onClose,
  closeable = true,
}) {
  const types = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    success: "bg-green-50 border-green-200 text-green-900",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
    error: "bg-red-50 border-red-200 text-red-900",
  };

  return (
    <div className={`border rounded-lg p-4 flex-between ${types[type]}`}>
      <div>
        {title && <h4 className="font-bold">{title}</h4>}
        {message && <p className="text-sm mt-1">{message}</p>}
      </div>
      {closeable && onClose && (
        <button
          onClick={onClose}
          className="text-2xl font-bold opacity-50 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}
