/**
 * Input Component
 * Reusable text input with label and error handling
 */
export default function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder = "",
  error = "",
  disabled = false,
  required = false,
  className = "",
  ...props
}) {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`input ${error ? "border-red-500 focus:ring-red-500" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
