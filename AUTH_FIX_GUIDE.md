# AuthContext Fix - Complete Guide

## ✅ Issues Found & Fixed

### Issue 1: `setToken` - Silent Failures
**Problem:**
```jsx
const login = async (data) => {
  const res = await fetch("http://localhost:5000/api/auth/login", {
    // ...
  });

  const result = await res.json();

  if (result?.token) {
    localStorage.setItem("token", result.token);
    setToken(result.token);  // ❌ Only set if response has token
  }
  // ❌ If response is invalid or network fails, nothing happens!
  // ❌ Component doesn't know if login succeeded
};
```

**Why it broke:**
1. No `try/catch` → network errors silently fail
2. No `response.ok` check → HTTP 400/500 treated as success
3. No token validation → sets invalid tokens
4. Function doesn't return anything → caller can't handle errors
5. State updates happen even with invalid data

**Solution:**
```jsx
const login = async (data) => {
  setLoading(true);      // ✅ Signal loading state
  setError(null);        // ✅ Clear previous errors
  
  try {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      // ...
    });

    if (!response.ok) {                // ✅ Check HTTP status
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result?.token || typeof result.token !== "string") {  // ✅ Validate token
      throw new Error("Invalid response: missing or invalid token");
    }

    localStorage.setItem("token", result.token);
    setToken(result.token);
    
    return result;    // ✅ Return data for caller
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Login failed";
    setError(errorMessage);  // ✅ Store error in state
    setToken(null);          // ✅ Reset token on error
    throw err;               // ✅ Re-throw so caller knows it failed
  } finally {
    setLoading(false);  // ✅ Always clear loading state
  }
};
```

---

### Issue 2: `useAuth()` - Confusing Errors
**Problem:**
```jsx
export function useAuth() {
  return useContext(AuthContext);  // ❌ Returns null if used outside provider
}

// In a component:
function LoginPage() {
  const { token } = useAuth();  // ❌ Returns null, then crashes on .token
  // Error: Cannot read property 'token' of null
  // ❌ Message doesn't say "use inside AuthProvider"
}
```

**Why it broke:**
1. No guard clause to check if inside provider
2. `useContext` silently returns `null` outside provider
3. Error happens later (at property access), not at hook call
4. Error message is confusing (doesn't mention AuthProvider)

**Solution:**
```jsx
// New file: src/hooks/useAuth.js
export function useAuth() {
  const context = useContext(AuthContext);
  
  // ✅ Guard: throw error immediately if used wrong
  if (context === null) {
    throw new Error(
      "useAuth() must be used inside <AuthProvider>. " +
      "Make sure your component is wrapped by AuthProvider in main.jsx or App.jsx"
    );
  }
  
  return context;  // ✅ Safe to use now
}
```

Now when you use `useAuth()` outside provider:
```
Error: useAuth() must be used inside <AuthProvider>. 
Make sure your component is wrapped by AuthProvider in main.jsx or App.jsx
```

✅ Clear, actionable error message!

---

### Issue 3: Provider Not Wrapping App
**Problem:**
```jsx
// main.jsx (BEFORE)
import App from "./App.jsx";

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />        {/* ❌ No AuthProvider! */}
  </React.StrictMode>
);

// This means useAuth() will ALWAYS fail in any component!
```

**Why it broke:**
- AuthProvider was created but never used
- `useAuth()` in any component would crash
- Token wouldn't persist

**Solution:**
```jsx
// main.jsx (AFTER)
import { AuthProvider } from "./context/AuthContext.jsx";

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <AuthProvider>        {/* ✅ Provider wraps entire app */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

Now `useAuth()` works in ANY component!

---

## 📁 File Structure

```
src/
├── context/
│   └── AuthContext.jsx          ✅ Context + Provider
├── hooks/
│   └── useAuth.js               ✅ Custom hook with guard
├── main.jsx                     ✅ App wrapped with AuthProvider
└── App.jsx
```

---

## 💻 How to Use

### 1. Setup (Already Done)
```jsx
// main.jsx wraps App with AuthProvider ✅
import { AuthProvider } from "./context/AuthContext.jsx";

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

### 2. Use in Components
```jsx
import { useAuth } from "../hooks/useAuth";  // ✅ Import from hooks

function LoginPage() {
  const { token, error, loading, login, logout, isAuthenticated } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login({ email: "user@test.com", password: "123456" });
      // ✅ Login successful, token is set
    } catch (err) {
      // ❌ Login failed, error is in context.error
      console.error(err.message);
    }
  };

  if (loading) return <p>Loading...</p>;
  
  return (
    <div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {isAuthenticated ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}

export default LoginPage;
```

### 3. What You Get from `useAuth()`
```jsx
const {
  token,            // Current JWT token (string or null)
  error,            // Last error message (string or null)
  loading,          // Is API call in progress? (boolean)
  login,            // async function: login(data) → throws on error
  register,         // async function: register(data) → throws on error
  logout,           // function: logout() → clears everything
  isAuthenticated,  // Shortcut: !!token (boolean)
} = useAuth();
```

---

## 🔄 Full Login Flow (Correct Way)

```jsx
import { useAuth } from "../hooks/useAuth";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loading, error, login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // 1. Call login() - returns on success, throws on error
      const result = await login({ email, password });
      
      // 2. If we get here, login succeeded
      console.log("Login successful!", result);
      
      // 3. Navigate to dashboard (using React Router)
      // navigate("/");
      
    } catch (err) {
      // 4. If login() throws, catch it here
      // Error message is already in context.error
      console.error("Login failed:", err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      
      {error && <p style={{ color: "red" }}>{error}</p>}
      
      <button type="submit" disabled={loading}>
        {loading ? "Loading..." : "Login"}
      </button>
    </form>
  );
}
```

---

## ⚠️ Common Mistakes (Now Fixed)

### ❌ DON'T: Use `useAuth()` outside `AuthProvider`
```jsx
// main.jsx
ReactDOM.createRoot(rootEl).render(<App />);  // ❌ No AuthProvider

// App.jsx - this will crash!
function App() {
  const auth = useAuth();  // ❌ CRASH: "useAuth() must be used inside <AuthProvider>"
  // ...
}
```

### ✅ DO: Wrap entire app with `AuthProvider`
```jsx
// main.jsx
ReactDOM.createRoot(rootEl).render(
  <AuthProvider>        {/* ✅ Provider wraps everything */}
    <App />
  </AuthProvider>
);

// Now useAuth() works in any component!
```

### ❌ DON'T: Ignore `login()` errors
```jsx
async function handleLogin() {
  login({ email, password });  // ❌ No await, no try/catch
  // Component doesn't know if it succeeded
}
```

### ✅ DO: Handle `login()` with try/catch
```jsx
async function handleLogin() {
  try {
    await login({ email, password });  // ✅ await the promise
    navigate("/");  // Only navigate on success
  } catch (err) {
    setErrorMessage(err.message);  // Show error to user
  }
}
```

### ❌ DON'T: Check `token` directly for auth status
```jsx
if (token) {  // ❌ Might be invalid or expired
  // ...
}
```

### ✅ DO: Use `isAuthenticated`
```jsx
if (isAuthenticated) {  // ✅ Boolean flag, reliable
  // ...
}
```

---

## 🧪 Testing Your Fix

### Test 1: Verify `useAuth()` requires provider
```jsx
// This should crash with clear error:
// "useAuth() must be used inside <AuthProvider>"
function TestComponent() {
  const auth = useAuth();  // ❌ Will crash (good!)
  return null;
}

// But if AuthProvider is in main.jsx, it won't crash
```

### Test 2: Verify token persistence
```javascript
// 1. Open app, login successfully
// 2. Open DevTools → Application → localStorage
// 3. You should see: "token": "mock-jwt-token"
// 4. Refresh page
// 5. Token should still exist (loaded from localStorage)
```

### Test 3: Verify error handling
```javascript
// Try logging in with invalid data
// Should see error message in UI
// Token should NOT be set
// useAuth().error should have message
```

---

## Summary of Changes

| What | Before | After |
|---|---|---|
| **setToken** | Silent failures, no validation | Try/catch, validates token, returns result |
| **useAuth()** | Returns null if outside provider | Throws clear error if outside provider |
| **Provider setup** | Not wrapping app | Wraps app in main.jsx |
| **Error handling** | No error state | error + loading states |
| **Token validation** | No validation | Validates string type before setting |
| **login() return** | Returns nothing | Returns result or throws |

---

## Architecture (Fixed)

```
main.jsx
  ↓
AuthProvider ✅ (wraps app)
  ├─ AuthContext.jsx (provides token, login, register, logout, error, loading, isAuthenticated)
  └─ App (BrowserRouter)
      └─ Routes (/)
          └─ LoginPage (or any component)
              └─ useAuth() ✅ (safe to use, has guard)
```

---

All issues fixed! 🎉

