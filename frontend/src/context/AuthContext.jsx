import { createContext, useContext, useState, useEffect } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if a token exists in sessionStorage on mount
    const token = sessionStorage.getItem("access_token");
    const email = sessionStorage.getItem("email");
    const userId = sessionStorage.getItem("userId");
    if (token) {
      if (email) {
        setUser({ token, email, id: userId });
      } else {
        // Fallback: fetch profile from backend if token exists but details not cached yet
        setUser({ token });
        client
          .get("/auth/me")
          .then((res) => {
            const fetchedEmail = res.data.email;
            const fetchedId = res.data.id;
            sessionStorage.setItem("email", fetchedEmail);
            sessionStorage.setItem("userId", fetchedId);
            setUser({ token, email: fetchedEmail, id: fetchedId });
          })
          .catch(() => {
            // Keep token even if backend request fails
          });
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Push a dummy state to history to capture the back button action
    window.history.pushState(null, null, window.location.href);

    const handlePopState = (event) => {
      // Push state again to keep locking the back action
      window.history.pushState(null, null, window.location.href);
      // Revoke session and log out
      logout();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [user]);


  const login = async (email, password) => {
    const res = await client.post("/auth/login", { email, password });
    const { access_token } = res.data;
    sessionStorage.setItem("access_token", access_token);
    
    // Fetch user details immediately to get the user ID
    try {
      const meRes = await client.get("/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const fetchedEmail = meRes.data.email;
      const fetchedId = meRes.data.id;
      sessionStorage.setItem("email", fetchedEmail);
      sessionStorage.setItem("userId", fetchedId);
      setUser({ token: access_token, email: fetchedEmail, id: fetchedId });
    } catch (err) {
      sessionStorage.setItem("email", email);
      setUser({ token: access_token, email });
    }
    
    return res.data;
  };

  const signup = async (email, password) => {
    const res = await client.post("/auth/signup", { email, password });
    return res.data;
  };

  const logout = async () => {
    try {
      await client.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("email");
      sessionStorage.removeItem("userId");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
