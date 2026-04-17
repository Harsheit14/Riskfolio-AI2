/**
 * Button Component
 * Reusable button with different variants
 */
export default function Button({ 
  children, 
  variant = "primary", 
  size = "md", 
  disabled = false,
  type = "button",
  onClick,
  className = "",
  ...props 
}) {
  const baseStyles = "font-medium rounded-lg transition-colors duration-200 inline-flex items-center justify-center";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-300",
    success: "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400",
    outline: "border border-gray-300 text-gray-900 hover:bg-gray-50 disabled:bg-gray-100",
  };

  const sizes = {
    sm: "px-4 py-1 text-sm",
    md: "px-6 py-2 text-base",
    lg: "px-8 py-3 text-lg",
  };

  const styles = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={styles}
      {...props}
    >
      {children}
    </button>
  );
}
