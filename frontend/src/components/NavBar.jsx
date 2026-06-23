import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);

  // Settings State
  const [threshold, setThreshold] = useState(0.3);
  const [maxResults, setMaxResults] = useState(5);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const popupRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Toggle profile dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Load configuration on mount
  useEffect(() => {
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
    setTimeout(() => {
      setSettingsSuccess(false);
      // Trigger a window event so that Search page can listen and update instantly
      window.dispatchEvent(new Event("settingsUpdated"));
    }, 1500);
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar" style={{ position: "relative" }}>
      <div className="navbar-brand">
        <span className="brand-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </span>
        <span className="brand-text">QuestionFinder</span>
      </div>

      {user && (
        <div className="navbar-links" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            to="/search"
            id="nav-search"
            className={`nav-link ${isActive("/search") ? "active" : ""}`}
          >
            Search
          </Link>
          <Link
            to="/history"
            id="nav-history"
            className={`nav-link ${isActive("/history") ? "active" : ""}`}
          >
            History
          </Link>

          {/* Profile Icon Toggle Button */}
          <button
            id="nav-profile-btn"
            onClick={toggleDropdown}
            style={{
              background: isOpen ? "var(--bg-card-hover)" : "transparent",
              border: "1px solid var(--border)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-primary)",
              transition: "background 0.2s",
              outline: "none",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </button>

          {/* Dropdown Mini Popup Window */}
          {isOpen && (
            <div
              id="profile-dropdown-popup"
              ref={popupRef}
              style={{
                position: "absolute",
                top: "65px",
                right: "20px",
                width: "320px",
                background: "rgba(33, 33, 33, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                zIndex: 1000,
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                animation: "slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Account Header Section */}
              <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Account Info
                </h4>
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user?.email || "User Account"}
                  </div>
                  {user?.id && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                      ID: {user.id}
                    </div>
                  )}
                </div>
              </div>

              {/* Configuration Settings Section */}
              <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Search Settings
                </h4>

                {/* Similarity Slider */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label htmlFor="nav-threshold" className="form-label" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span>Similarity Limit</span>
                    <span style={{ fontWeight: "600" }}>{Math.round(threshold * 100)}%</span>
                  </label>
                  <input
                    id="nav-threshold"
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "#ffffff",
                      cursor: "pointer",
                      height: "4px",
                    }}
                  />
                </div>

                {/* Max Results Selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label htmlFor="nav-max-results" className="form-label" style={{ fontSize: "0.75rem" }}>
                    Max Similar Matches
                  </label>
                  <select
                    id="nav-max-results"
                    className="form-input"
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value))}
                    style={{
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.85rem",
                      background: "#121212",
                      borderColor: "var(--border)",
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} result{num !== 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {settingsSuccess && (
                  <div style={{ fontSize: "0.8rem", color: "#a7f3d0", textAlign: "center" }}>
                    ✓ Settings saved!
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: "0.5rem",
                    fontSize: "0.85rem",
                    background: "white",
                    color: "black",
                    fontWeight: "600",
                  }}
                >
                  Save Configuration
                </button>
              </form>

              {/* Logout Button Section */}
              <button
                id="nav-logout-btn"
                onClick={handleLogoutClick}
                className="nav-logout-btn"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "0.85rem",
                  marginTop: "0.5rem",
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
