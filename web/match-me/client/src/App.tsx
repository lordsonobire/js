import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Connections from './pages/Connections';
import ChatList from './pages/ChatList';
import ChatWindow from './pages/ChatWindow';
import UserProfile from './pages/UserProfile';

import Layout from './components/Layout';

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
      <SocketProvider>
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
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
