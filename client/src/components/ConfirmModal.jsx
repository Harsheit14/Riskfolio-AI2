/**
 * ConfirmModal component
 * Modal for confirming destructive actions
 * 
 * @prop {boolean} isOpen - Controls modal visibility
 * @prop {string} title - Modal title
 * @prop {string} message - Modal message/description
 * @prop {function} onConfirm - Callback on confirm (destructive action)
 * @prop {function} onCancel - Callback on cancel
 * @prop {string} confirmText - Text for confirm button (default: 'Delete')
 * @prop {boolean} isLoading - Show loading state on confirm button
 */
export default function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure?",
  onConfirm,
  onCancel,
  confirmText = "Delete",
  isLoading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 max-w-sm rounded-2xl bg-[#1a1d27] border border-white/10 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-slate-400 mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
