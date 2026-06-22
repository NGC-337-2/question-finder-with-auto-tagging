import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </span>
        <span className="brand-text">QuestionFinder</span>
      </div>

      {user && (
        <div className="navbar-links">
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
          <button
            id="nav-logout"
            className="nav-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
