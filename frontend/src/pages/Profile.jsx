import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function Profile() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Settings State
  const [threshold, setThreshold] = useState(0.3);
  const [maxResults, setMaxResults] = useState(5);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    // Fetch profile
    const fetchProfile = async () => {
      try {
        const res = await client.get("/auth/me");
        setProfile(res.data);
      } catch (err) {
        setError("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Load saved settings
    const savedThreshold = localStorage.getItem("similarity_threshold");
    const savedMaxResults = localStorage.getItem("max_similar_questions");
    if (savedThreshold) setThreshold(parseFloat(savedThreshold));
    if (savedMaxResults) setMaxResults(parseInt(savedMaxResults));
  }, []);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem("similarity_threshold", threshold.toString());
    localStorage.setItem("max_similar_questions", maxResults.toString());
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="page-container">
      <div className="history-hero">
        <h1 className="page-title">Profile & Settings</h1>
        <p className="page-subtitle">
          Manage your account information and configure the question search parameters.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* User Details Section */}
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "1.5rem 2rem",
            background: "var(--bg-card)",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-primary)" }}>
            Account Information
          </h2>
          
          {loading ? (
            <div className="loading-container" style={{ padding: "1rem 0" }}>
              <div className="spinner" style={{ width: "24px", height: "24px" }} />
            </div>
          ) : error ? (
            <div className="error-alert" role="alert">
              {error}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.75rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Email Address</span>
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{profile.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Member Since</span>
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
              <button
                id="profile-logout-btn"
                onClick={handleLogout}
                className="nav-logout-btn"
                style={{ width: "100%", marginTop: "1rem", padding: "0.6rem" }}
              >
                Logout
              </button>
            </div>
          )}
        </section>

        {/* System Settings Section */}
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "1.5rem 2rem",
            background: "var(--bg-card)",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-primary)" }}>
            System Configuration
          </h2>
          <form id="settings-form" onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Similarity Threshold Slider */}
            <div className="form-group">
              <label htmlFor="setting-threshold" className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Minimum Similarity Threshold</span>
                <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{Math.round(threshold * 100)}%</span>
              </label>
              <input
                id="setting-threshold"
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "var(--text-primary)",
                  background: "var(--border)",
                  height: "6px",
                  borderRadius: "3px",
                  outline: "none",
                  cursor: "pointer",
                }}
              />
              <span className="char-count" style={{ position: "static", marginTop: "0.25rem" }}>
                Filter out matching questions below this similarity score percentage.
              </span>
            </div>

            {/* Max Results Number Input */}
            <div className="form-group">
              <label htmlFor="setting-max-results" className="form-label">
                Maximum Similar Matches to Display
              </label>
              <select
                id="setting-max-results"
                className="form-input"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value))}
                style={{ background: "#212121" }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    {num} question{num !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              <span className="char-count" style={{ position: "static", marginTop: "0.25rem" }}>
                Select the maximum number of similar matches to show in search results.
              </span>
            </div>

            {settingsSuccess && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "rgba(16, 163, 127, 0.1)",
                  border: "1px solid rgba(16, 163, 127, 0.3)",
                  borderRadius: "var(--radius-sm)",
                  color: "#a7f3d0",
                  fontSize: "0.9rem",
                  textAlign: "center",
                }}
              >
                ✓ Configuration settings saved successfully!
              </div>
            )}

            <button
              id="save-settings-btn"
              type="submit"
              className="btn-primary"
              style={{ padding: "0.75rem" }}
            >
              Save Configuration
            </button>

          </form>
        </section>

      </div>
    </div>
  );
}
