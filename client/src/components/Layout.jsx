import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, Clock, Settings, Leaf, Menu, X, HardDrive, Search } from 'lucide-react';
import { config } from '../config/environment';
import './Layout.css';

const Layout = () => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cacheStats, setCacheStats] = useState({
    totalSizeFormatted: '0 B',
    activeTorrents: 0,
    diskUsage: { percentage: 0 }
  });

  const navigationItems = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/recent', icon: Clock, label: 'Недавние' },
    { path: '/search', icon: Search, label: 'Поиск' },
    { path: '/settings', icon: Settings, label: 'Настройки' }
  ];

  useEffect(() => {
    const loadCacheStats = async () => {
      try {
        const [statsResponse, torrentsResponse, diskResponse] = await Promise.all([
          fetch(config.getApiUrl('/api/cache/stats')),
          fetch(config.api.torrents),
          fetch(config.getApiUrl('/api/system/disk'))
        ]);

        const stats = await statsResponse.json().catch(() => ({}));
        const torrentsData = await torrentsResponse.json().catch(() => ({ torrents: [] }));
        const diskData = await diskResponse.json().catch(() => ({ percentage: 0, total: 0 }));

        // Calculate cache usage percentage relative to total disk space
        const cacheSize = stats.cacheSize || 0;
        const totalDisk = diskData.total || 1;
        const cacheUsagePercentage = totalDisk > 0 ? (cacheSize / totalDisk) * 100 : 0;

        // Format total disk size for display
        const formatBytes = (bytes) => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        setCacheStats({
          totalSizeFormatted: stats.totalSizeFormatted || '0 B',
          activeTorrents: (torrentsData.torrents || []).length,
          diskUsage: {
            percentage: diskData.percentage || 0,
            total: diskData.total || 0
          },
          cacheUsagePercentage: cacheUsagePercentage,
          totalDiskFormatted: formatBytes(totalDisk)
        });
      } catch (error) {
        console.error('Error loading cache stats:', error);
      }
    };

    loadCacheStats();
    const interval = setInterval(loadCacheStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button onClick={toggleMobileMenu} className="mobile-menu-toggle">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="mobile-logo">
          <Leaf size={24} />
          <span>SeedBox Lite</span>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Leaf size={sidebarCollapsed ? 28 : 32} />
            {!sidebarCollapsed && <span>SeedBox Lite</span>}
          </div>
          {!sidebarCollapsed && (
            <button onClick={toggleSidebar} className="sidebar-toggle desktop-only">
              <Menu size={20} />
            </button>
          )}
          {sidebarCollapsed && (
            <button onClick={toggleSidebar} className="sidebar-toggle desktop-only collapsed-toggle">
              <Menu size={18} />
            </button>
          )}
        </div>
        
        <nav className="sidebar-nav">
          {navigationItems.map(({ path, icon: IconComponent, label }) => {
            const Icon = IconComponent;
            return (
              <Link
                key={path}
                to={path}
                className={`nav-item ${location.pathname === path ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
        
        {!sidebarCollapsed && (
          <div className="cache-stats">
            <Link to="/cache" className="cache-link">
              <div className="cache-header">
                <HardDrive size={16} />
                <span>Кеш</span>
              </div>
              <div className="cache-info">
                <div className="cache-stat">
                  <span>Размер: {cacheStats.totalSizeFormatted}</span>
                </div>
                <div className="cache-stat">
                  <span>Торренты: {cacheStats.activeTorrents}</span>
                </div>
                <div className="disk-usage-mini">
                  <div className="disk-bar-mini">
                    <div 
                      className="disk-fill-mini"
                      style={{ width: `${cacheStats.cacheUsagePercentage || 0}%` }}
                    />
                  </div>
                  <span>{(cacheStats.cacheUsagePercentage || 0).toFixed(1)}% из {cacheStats.totalDiskFormatted}</span>
                </div>
              </div>
            </Link>
          </div>
        )}
        
        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <div className="app-info">
              <p>SeedBox Lite v1.0</p>
              <p>Локальный стриминг</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
