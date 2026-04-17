# AuthContext - Quick Reference

## Files Changed

### 1. `src/context/AuthContext.jsx` ✅
- Added: `error` state, `loading` state
- Added: try/catch blocks to `login()` and `register()`
- Added: response validation (checks for token, HTTP status)
- Added: return values from API functions
- Added: `isAuthenticated` computed state
- Removed: `useAuth()` hook (moved to separate file for Fast Refresh)

### 2. `src/hooks/useAuth.js` ✅ (NEW)
- Contains: `useAuth()` hook with guard clause
- Throws clear error if used outside `AuthProvider`

### 3. `src/main.jsx` ✅
- Wrapped App with `AuthProvider`
- Removed debug console.log

---

## What Each Fix Does

### Error Handling
```jsx
// Before: Silent failures
login(data);  // If network fails, nothing happens

// After: Proper error handling
try {
  await login(data);  // Throws on network/validation errors
} catch (err) {
  console.error(err.message);  // Handle error
}
```

### Token Validation
```jsx
// Before: Set any response.token
setToken(result.token);  // Could be undefined, null, etc.

// After: Validate before setting
if (!result?.token || typeof result.token !== "string") {
  throw new Error("Invalid response");
}
setToken(result.token);
```

### Safe Hook Usage
```jsx
// Before: Crash with confusing error
const auth = useAuth();  // "Cannot read property 'login' of null"

// After: Clear error message
const auth = useAuth();  // Throws: "useAuth() must be used inside <AuthProvider>"
```

### Loading/Error States
```jsx
// Before: No feedback during API call
const { token, login } = useAuth();

// After: Track request state
const { token, login, loading, error } = useAuth();

if (loading) return <p>Logging in...</p>;
if (error) return <p>Error: {error}</p>;
```

---

## Usage in Components

```jsx
import { useAuth } from "../hooks/useAuth";

function MyComponent() {
  const {
    token,            // null or string
    error,            // null or error message
    loading,          // true/false
    login,            // async function
    register,         // async function
    logout,           // sync function
    isAuthenticated,  // true/false
  } = useAuth();

  const handleLogin = async (email, password) => {
    try {
      await login({ email, password });
      // Success - token is now set
    } catch (err) {
      // Error - error message is in context.error
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {isAuthenticated ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <button onClick={() => handleLogin("test@test.com", "pass")}>
          Login
        </button>
      )}
    </div>
  );
}
```

---

## Complete Example: Login Page

```jsx
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loading, error, login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await login({ email, password });
      // On success, navigate to dashboard
      // window.location.href = "/";
    } catch (err) {
      // Error is already in context.error (shown in UI)
      console.error(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      
      {error && (
        <div style={{ color: "red", marginTop: "10px" }}>
          {error}
        </div>
      )}
      
      <button type="submit" disabled={loading} style={{ marginTop: "10px" }}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}

export default LoginPage;
```

---

## API Contract

### `login(data)` 
```javascript
await login({ email: string, password: string })
// Returns: { token: string, ... }
// Throws: Error on failure
// Sets: token in localStorage and state
```

### `register(data)`
```javascript
await register({ email: string, password: string })
// Returns: { id: string, email: string, ... }
// Throws: Error on failure
// Does NOT auto-login
```

### `logout()`
```javascript
logout()
// Returns: void
// Clears: token from localStorage and state
```

---

## Testing Checklist

- [ ] App starts without errors
- [ ] Can call `useAuth()` in components (no crash)
- [ ] Login works with valid credentials
- [ ] Token stored in localStorage after login
- [ ] Error shown if login fails
- [ ] Token persists after page refresh
- [ ] Logout clears token from localStorage
- [ ] Loading state shows during API call
- [ ] Component re-renders when token changes

---

## Common Patterns

### Protected Route
```jsx
import { useAuth } from "../hooks/useAuth";

function ProtectedPage() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <p>Please login first</p>;
  }
  
  return <p>Secret content</p>;
}
```

### Show Different Content Based on Auth
```jsx
function Header() {
  const { isAuthenticated, logout } = useAuth();
  
  return (
    <header>
      {isAuthenticated ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <a href="/login">Login</a>
      )}
    </header>
  );
}
```

### Auto-Login from localStorage
```jsx
// Already handled in AuthContext!
useEffect(() => {
  const storedToken = localStorage.getItem("token");
  if (storedToken) {
    setToken(storedToken);  // Token restored on mount
  }
}, []);
```

---

## Debugging

### Check if AuthProvider is wrapping App
```javascript
// Open DevTools Console
console.log(document);
// Look for <AuthProvider> in React DevTools
```

### Check if token is in localStorage
```javascript
// In browser console:
localStorage.getItem("token");
// Should return token string or null
```

### Check context value
```jsx
function DebugComponent() {
  const auth = useAuth();
  console.log("Auth context:", auth);
  // Should see: { token, error, loading, login, register, logout, isAuthenticated }
}
```

---

All issues fixed! Ready to use. 🚀

