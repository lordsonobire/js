import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Connections from './pages/Connections';
import ChatList from './pages/ChatList';
import ChatWindow from './pages/ChatWindow';
import UserProfile from './pages/UserProfile';

// Placeholder components until created
const Layout = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuth();

  if (!auth) return null; // Handle null context
  const { logout, user } = auth;

  return (
    <div>
      <nav className="navbar">
        <div className="flex-row">
          <h3>Match-Me</h3>
        </div>
        <div className="flex-row">
          {/* Links */}
          <a href="/">Home</a>
          <a href="/connections">Connections</a>
          <a href="/chats">Chats</a>
          <a href="/profile">Profile</a>


          {user?.avatar_url && (
            <img
              src={user.avatar_url}
              alt="Avatar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                marginLeft: '15px',
                border: '1px solid #ccc'
              }}
            />
          )}

          <button onClick={logout} style={{ marginLeft: '10px', padding: '5px 10px' }}>Logout</button>
        </div>
      </nav>
      {children}
    </div>
  );
};

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const auth = useAuth();

  if (!auth) return <Navigate to="/login" />;
  const { token } = auth;

  // Simple check. If token exists but user not loaded yet, might flicker. 
  // Ideally loading state. For now, rely on token presence.
  if (!token) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/connections" element={<PrivateRoute><Connections /></PrivateRoute>} />
          <Route path="/chats" element={<PrivateRoute><ChatList /></PrivateRoute>} />
          <Route path="/chats/:id" element={<PrivateRoute><ChatWindow /></PrivateRoute>} />
          <Route path="/users/:id" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
