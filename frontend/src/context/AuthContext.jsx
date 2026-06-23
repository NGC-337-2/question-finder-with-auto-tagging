import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if a token exists in localStorage on mount
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    const userId = localStorage.getItem("userId");
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
            localStorage.setItem("email", fetchedEmail);
            localStorage.setItem("userId", fetchedId);
            setUser({ token, email: fetchedEmail, id: fetchedId });
          })
          .catch(() => {
            // Keep token even if backend request fails
          });
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await client.post("/auth/login", { email, password });
    const { access_token } = res.data;
    localStorage.setItem("token", access_token);
    
    // Fetch user details immediately to get the user ID
    try {
      const meRes = await client.get("/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const fetchedEmail = meRes.data.email;
      const fetchedId = meRes.data.id;
      localStorage.setItem("email", fetchedEmail);
      localStorage.setItem("userId", fetchedId);
      setUser({ token: access_token, email: fetchedEmail, id: fetchedId });
    } catch (err) {
      localStorage.setItem("email", email);
      setUser({ token: access_token, email });
    }
    
    return res.data;
  };

  const signup = async (email, password) => {
    const res = await client.post("/auth/signup", { email, password });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("userId");
    setUser(null);
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
