import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import logo from '../assets/logo.png';
import './Layout.css';

export default function Layout({ children, navItems }) {
  const [open, setOpen]           = useState(true);
  const [dropdown, setDropdown]   = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const { user, logout }          = useAuth();
  const location                  = useLocation();
  const navigate                  = useNavigate();

  useEffect(() => {
    // Polling notifications toutes les 30 secondes
    const fetchNotifs = () => {
      api.get('/notifications/non-lues')
        .then(r => setNotifCount(r.data.count))
        .catch(() => {});
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`layout ${open ? 'sidebar-open' : 'sidebar-closed'}`}>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src={logo} alt="DIRMA" className="sidebar-logo" />
            <span className="sidebar-name">DIRMA</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setOpen(!open)}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`nav-item ${location.pathname === path ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <div className="main-wrapper">

        {/* Topbar */}
        <header className="topbar">
          <button className="mobile-menu-btn" onClick={() => setOpen(!open)}>
            <Menu size={20} />
          </button>

          <div className="topbar-right">
            {/* Notifications */}
            <Link to="/notifications" className="notif-btn">
              <Bell size={18} />
              {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
            </Link>

            {/* Menu utilisateur */}
            <div className="user-menu" onClick={() => setDropdown(!dropdown)}>
              <div className="user-avatar">
                {user?.prenom?.charAt(0)}{user?.name?.charAt(0)}
              </div>
              <div className="user-info">
                <span className="user-fullname">{user?.prenom} {user?.name}</span>
                <span className="user-dept">{user?.departement}</span>
              </div>
              <ChevronDown size={14} />

              {dropdown && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <p className="dropdown-name">{user?.prenom} {user?.name}</p>
                    <p className="dropdown-email">{user?.email || user?.matricule}</p>
                  </div>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={14} /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
