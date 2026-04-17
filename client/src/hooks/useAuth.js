import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === null) {
    throw new Error(
      "useAuth() must be used inside <AuthProvider>. " +
      "Make sure your component is wrapped by AuthProvider in main.jsx or App.jsx"
    );
  }
  
  return context;
}
