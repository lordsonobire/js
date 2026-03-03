import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuth();

  if (!auth) return null;
  const { logout, user } = auth;

  return (
    <div>
      <nav className="navbar">
        <div className="flex-row">
          <h3>Match-Me</h3>
        </div>
        <div className="flex-row nav-links">
          {/* Links */}
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-active' : '')}>
            Discover
          </NavLink>
          <NavLink to="/connections" className={({ isActive }) => (isActive ? 'nav-active' : '')}>
            Connections
          </NavLink>
          <NavLink to="/chats" className={({ isActive }) => (isActive ? 'nav-active' : '')}>
            Chats
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-active' : '')}>
            Profile
          </NavLink>

          {user?.avatar_url && (
            <img src={user.avatar_url} alt="Profile" className="avatar nav-avatar" />
          )}

          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </nav>
      {children}
    </div>
  );
};

export default Layout;
