import React, { useState, useEffect } from 'react';
import { Trash2, HardDrive, Activity, File, Calendar, ArrowLeft, RefreshCw, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/environment';
import './CacheManagementPage.css';

const CacheManagementPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheStats, setCacheStats] = useState({
    totalSize: 0,
    totalSizeFormatted: '0 B',
    fileCount: 0,
    activeTorrents: 0,
    torrents: []
  });

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      setRefreshing(true);
      const [statsResponse, torrentsResponse] = await Promise.all([
        fetch(config.getApiUrl('/api/cache/stats')),
        fetch(config.api.torrents)
      ]);

      const stats = await statsResponse.json();
      const torrentsData = await torrentsResponse.json();

      setCacheStats({
        ...stats,
        torrents: torrentsData.torrents || [],
        activeTorrents: (torrentsData.torrents || []).length
      });
    } catch (error) {
      console.error('Error loading cache stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearSingleTorrent = async (infoHash, name) => {
    if (!window.confirm(`Удалить «${name}» из кеша? Торрент остановится, а его данные будут очищены.`)) {
      return;
    }

    try {
      const response = await fetch(config.getTorrentUrl(infoHash), {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Торрент «${name}» удалён. Освобождено: ${result.freedSpaceFormatted || '0 B'}`);
        loadCacheStats();
      } else {
        alert('Не удалось удалить торрент');
      }
    } catch (error) {
      console.error('Error removing torrent:', error);
      alert('Ошибка удаления торрента: ' + error.message);
    }
  };

  const clearAllCache = async () => {
    if (!window.confirm('Очистить ВЕСЬ кеш? Будут удалены все торренты и загруженные данные. Это нельзя отменить.')) {
      return;
    }

    try {
      const response = await fetch(config.api.torrents, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Кеш очищен. Освобождено: ${result.totalFreedFormatted || '0 B'}`);
        loadCacheStats();
      } else {
        alert('Не удалось очистить кеш');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Ошибка очистки кеша: ' + error.message);
    }
  };

  const clearOldCache = async (days) => {
    if (!window.confirm(`Очистить кеш старше ${days} дней? Старые данные торрентов будут удалены.`)) {
      return;
    }

    try {
      const response = await fetch(config.getApiUrl('/api/cache/clear-old'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ days })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Старый кеш очищен. Удалено файлов: ${result.deletedFiles || 0}, освобождено: ${formatBytes(result.freedSpace || 0)}`);
        loadCacheStats();
      } else {
        alert('Не удалось очистить старый кеш');
      }
    } catch (error) {
      console.error('Error clearing old cache:', error);
      alert('Ошибка очистки старого кеша: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="cache-page">
        <div className="page-header">
          <button onClick={() => navigate(-1)} className="back-button">
            <ArrowLeft size={20} />
            Назад
          </button>
          <h1>
            <HardDrive size={28} />
            Управление кешем
          </h1>
        </div>
        <div className="loading">Загрузка информации о кеше...</div>
      </div>
    );
  }

  return (
    <div className="cache-page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <ArrowLeft size={20} />
          Назад
        </button>
        <div className="header-content">
          <h1>
            <HardDrive size={28} />
            Управление кешем
          </h1>
          <p>Управление кешем торрентов и местом на диске</p>
        </div>
        <button 
          onClick={loadCacheStats} 
          className="refresh-button"
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          Обновить
        </button>
      </div>

      {/* Cache Usage Overview */}
      <div className="cache-section">
        <h2>🌪️ Использование кеша WebTorrent</h2>
        <div className="disk-usage">
          <div className="disk-stats">
            <div className="disk-stat">
              <span>Размер кеша</span>
              <span>{cacheStats.totalSizeFormatted}</span>
            </div>
            <div className="disk-stat">
              <span>Лимит кеша</span>
              <span>{cacheStats.cacheLimitFormatted || '5 GB'}</span>
            </div>
            <div className="disk-stat">
              <span>Активные торренты</span>
              <span>{cacheStats.activeTorrents}</span>
            </div>
          </div>
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${cacheStats.usagePercentage || 0}%` }}
              ></div>
            </div>
            <span className="progress-text">Использовано кеша: {cacheStats.usagePercentage || 0}%</span>
          </div>
          <div className="cache-info">
            <p>Показан только кеш WebTorrent, а не весь диск системы.</p>
          </div>
        </div>
      </div>

      {/* Cache Overview */}
      <div className="cache-section">
        <h2>📊 Обзор кеша</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <HardDrive size={24} />
            <div>
              <span className="stat-value">{cacheStats.totalSizeFormatted}</span>
              <span className="stat-label">Размер кеша</span>
            </div>
          </div>
          <div className="stat-card">
            <File size={24} />
            <div>
              <span className="stat-value">{cacheStats.fileCount}</span>
              <span className="stat-label">Файлы в кеше</span>
            </div>
          </div>
          <div className="stat-card">
            <Activity size={24} />
            <div>
              <span className="stat-value">{cacheStats.activeTorrents}</span>
              <span className="stat-label">Активные торренты</span>
            </div>
          </div>
          <div className="stat-card">
            <Download size={24} />
            <div>
              <span className="stat-value">{cacheStats.totalDownloadedFormatted || '0 B'}</span>
              <span className="stat-label">Загружено</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="cache-section">
        <h2>🧹 Массовые действия</h2>
        <div className="bulk-actions">
          <button 
            onClick={() => clearOldCache(7)} 
            className="action-button warning"
          >
            <Calendar size={16} />
            Очистить файлы старше 7 дней
          </button>
          <button 
            onClick={() => clearOldCache(30)} 
            className="action-button warning"
          >
            <Calendar size={16} />
            Очистить файлы старше 30 дней
          </button>
          <button 
            onClick={clearAllCache} 
            className="action-button danger"
          >
            <Trash2 size={16} />
            Очистить весь кеш
          </button>
        </div>
      </div>

      {/* Individual Torrents */}
      {cacheStats.torrents.length > 0 && (
        <div className="cache-section">
          <h2>🎬 Отдельные торренты ({cacheStats.torrents.length})</h2>
          <div className="torrents-list">
            {cacheStats.torrents.map((torrent) => (
              <div key={torrent.infoHash} className="torrent-item">
                <div className="torrent-info">
                  <h3>{torrent.name}</h3>
                  <div className="torrent-stats">
                    <span>Всего: {formatBytes(torrent.size || 0)}</span>
                    <span>Загружено: {formatBytes(torrent.downloaded || 0)}</span>
                    <span>Готово: {(torrent.progress * 100).toFixed(1)}%</span>
                    <span>Файлов: {torrent.files?.length || 0}</span>
                    <span>Пиров: {torrent.peers || 0}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(torrent.progress || 0) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="torrent-actions">
                  <button 
                    onClick={() => navigate(`/torrent/${torrent.infoHash}`)}
                    className="view-button"
                  >
                    Открыть
                  </button>
                  <button 
                    onClick={() => clearSingleTorrent(torrent.infoHash, torrent.name)}
                    className="remove-button"
                  >
                    <Trash2 size={14} />
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cacheStats.torrents.length === 0 && (
        <div className="cache-section">
          <div className="empty-state">
            <HardDrive size={48} />
            <h3>Активных торрентов нет</h3>
            <p>Добавьте торренты, чтобы управлять кешем</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheManagementPage;
