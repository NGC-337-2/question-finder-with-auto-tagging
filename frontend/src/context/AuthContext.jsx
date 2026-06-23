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
    if (token) {
      setUser({ token }); // Simple presence check; backend validates on each request
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await client.post("/auth/login", { email, password });
    const { access_token } = res.data;
    localStorage.setItem("token", access_token);
    setUser({ token: access_token });
    return res.data;
  };

  const signup = async (email, password) => {
    const res = await client.post("/auth/signup", { email, password });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
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
