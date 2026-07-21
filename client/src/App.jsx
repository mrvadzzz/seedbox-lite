import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import TorrentPageNetflix from './components/TorrentPageNetflix';
import RecentPage from './components/RecentPage';
import SettingsPage from './components/SettingsPage';
import CacheManagementPage from './components/CacheManagementPage';
import SearchSourcesPage from './components/SearchSourcesPage';
import LoginScreen from './components/LoginScreen';
import './App.css';

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoading, authenticate } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.2)',
            borderTop: '4px solid #e50914',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Загрузка SeedBox...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onAuthSuccess={authenticate} />;
  }

  // Show main app if authenticated
  return (
    <Router>
      <Routes>
        {/* Full-width Netflix-style page without sidebar */}
        <Route path="torrent/:torrentHash" element={<TorrentPageNetflix />} />
        
        {/* Main app with sidebar layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="recent" element={<RecentPage />} />
          <Route path="search" element={<SearchSourcesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="cache" element={<CacheManagementPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
