import { useEffect } from "react";

/**
 * Toast notification component
 * Auto-dismisses after 3 seconds
 * 
 * @prop {string} message - Toast message text
 * @prop {string} type - 'success' | 'error' | 'info'
 * @prop {function} onClose - Callback when toast dismisses
 */
export default function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === "success"
      ? "bg-green-500/20 border-green-500/30"
      : type === "error"
      ? "bg-red-500/20 border-red-500/30"
      : "bg-blue-500/20 border-blue-500/30";

  const textColor =
    type === "success"
      ? "text-green-200"
      : type === "error"
      ? "text-red-200"
      : "text-blue-200";

  const icon =
    type === "success"
      ? "✓"
      : type === "error"
      ? "✕"
      : "ℹ";

  return (
    <div
      className={`fixed top-6 right-6 max-w-sm rounded-xl border ${bgColor} p-4 shadow-xl animate-in slide-in-from-right-4 duration-300`}
    >
      <div className={`flex items-center gap-3 ${textColor}`}>
        <span className="text-xl font-bold">{icon}</span>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
