import React, { useState, useEffect } from 'react';
import { Upload, Plus, Link as LinkIcon, Download, Leaf, Clock, Search, Trash2, Zap, HardDrive, Clapperboard } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { config } from '../config/environment';
import torrentHistoryService from '../services/torrentHistoryService';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [torrentUrl, setTorrentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentTorrents, setRecentTorrents] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRecentTorrents();
  }, []);

  const loadRecentTorrents = async () => {
    try {
      const response = await fetch(config.api.torrents);
      if (!response.ok) {
        throw new Error('Backend history is unavailable');
      }

      const data = await response.json();
      const backendTorrents = (data.torrents || []).map(torrent => ({
        infoHash: torrent.infoHash,
        name: torrent.name || `Torrent ${torrent.infoHash?.substring(0, 8)}`,
        addedAt: torrent.addedAt || new Date().toISOString(),
        source: torrent.source || 'server',
        originalInput: torrent.originalInput || '',
        size: torrent.size || torrent.length || 0,
        lastAccessed: torrent.addedAt || new Date().toISOString()
      }));

      setRecentTorrents(backendTorrents);
    } catch (error) {
      console.warn('Не удалось загрузить историю с сервера, использую локальную:', error.message);
      const recent = torrentHistoryService.getRecentTorrents(8);
      setRecentTorrents(recent);
    }
  };

  const addTorrent = async (torrentData) => {
    setLoading(true);
    try {
      const response = await fetch(config.api.torrents, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(torrentData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Торрент добавлен:', data);
        
        // Check if this torrent already exists in our history
        const existingInHistory = torrentHistoryService.getTorrentByInfoHash(data.infoHash);
        
        if (existingInHistory) {
          console.log('Торрент уже есть в истории, обновляю время доступа');
          torrentHistoryService.updateLastAccessed(data.infoHash);
        } else {
          console.log('Добавляю торрент в историю');
          // Add to history
          torrentHistoryService.addTorrent({
            infoHash: data.infoHash,
            name: data.name || 'Unknown Torrent',
            source: torrentData.torrentId.startsWith('magnet:') ? 'magnet' : 'url',
            originalInput: torrentData.torrentId,
            size: data.size || 0
          });
        }
        
        // Reload history
        loadRecentTorrents();
        
        // Navigate to torrent page
        navigate(`/torrent/${data.infoHash}`);
      } else {
        console.error('Не удалось добавить торрент:', data);
        alert('Не удалось добавить торрент: ' + (data.error || 'неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка добавления торрента:', error);
      alert('Ошибка добавления торрента: ' + error.message);
    } finally {
      setLoading(false);
    }
  };  const addTorrentFile = async (file) => {
    const formData = new FormData();
    formData.append('torrentFile', file);
    
    setLoading(true);
    try {
      const response = await fetch(config.getApiUrl('/api/torrents/upload'), {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Торрент загружен:', data);
        
        // Check if this torrent already exists in our history
        const existingInHistory = torrentHistoryService.getTorrentByInfoHash(data.infoHash);
        
        if (existingInHistory) {
          console.log('Торрент уже есть в истории, обновляю время доступа');
          torrentHistoryService.updateLastAccessed(data.infoHash);
        } else {
          console.log('Добавляю торрент в историю');
          // Add to history
          torrentHistoryService.addTorrent({
            infoHash: data.infoHash,
            name: data.name || file.name.replace('.torrent', ''),
            source: 'file',
            originalInput: file.name,
            size: data.size || 0
          });
        }
        
        // Reload history
        loadRecentTorrents();
        
        // Navigate to torrent page
        navigate(`/torrent/${data.infoHash}`);
      } else {
        console.error('Не удалось загрузить торрент:', data);
        alert('Не удалось загрузить торрент: ' + (data.error || 'неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка загрузки торрента:', error);
      alert('Ошибка загрузки торрента: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (torrentUrl.trim()) {
      addTorrent({ torrentId: torrentUrl.trim() });
      setTorrentUrl('');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.torrent')) {
      addTorrentFile(file);
    }
  };

  const goToTorrent = (infoHash) => {
    torrentHistoryService.updateLastAccessed(infoHash);
    navigate(`/torrent/${infoHash}`);
  };

  const removeTorrentFromHistory = (infoHash, e) => {
    e.stopPropagation();
    if (window.confirm('Удалить этот торрент из истории на этом устройстве? Данные торрента на сервере не будут удалены.')) {
      torrentHistoryService.removeTorrent(infoHash);
      loadRecentTorrents();
    }
  };

  const clearAllHistory = () => {
    if (window.confirm('Очистить локальную историю на этом устройстве? Данные торрентов на сервере не будут удалены.')) {
      torrentHistoryService.clearHistory();
      loadRecentTorrents();
    }
  };

  const filteredTorrents = searchQuery
    ? recentTorrents.filter(torrent =>
        (torrent.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (torrent.originalInput || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentTorrents;

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <div className="brand">
            <Leaf size={48} className="brand-icon" />
            <div className="brand-text">
              <h1>SeedBox Lite</h1>
              <p>Смотрите торренты сразу после добавления</p>
            </div>
          </div>
        </div>
      </div>

      <div className="main-actions">
        {/* URL Input Section */}
        {/* URL Input Section */}
        <div className="url-input-section">
          <h2>Добавить торрент или magnet-ссылку</h2>
          <form onSubmit={handleUrlSubmit} className="url-form">
            <div className="input-group">
              <LinkIcon size={20} className="input-icon" />
              <input
                type="text"
                value={torrentUrl}
                onChange={(e) => setTorrentUrl(e.target.value)}
                placeholder="Вставьте torrent URL или magnet-ссылку..."
                className="url-input"
                disabled={loading}
              />
              <button 
                type="submit" 
                className="add-button"
                disabled={loading || !torrentUrl.trim()}
              >
                {loading ? (
                  <div className="loading-spinner" />
                ) : (
                  <>
                    <Download size={20} />
                    Добавить
                  </>
                )}
              </button>
              
              {/* Compact File Upload Button */}
              <input
                type="file"
                accept=".torrent"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="torrent-upload"
                disabled={loading}
              />
              <label 
                htmlFor="torrent-upload" 
                className={`file-upload-button ${loading ? 'disabled' : ''}`}
                title="Загрузить .torrent файл"
              >
                {loading ? (
                  <div className="loading-spinner" />
                ) : (
                  <>
                    <Upload size={20} />
                    Выбрать файл
                  </>
                )}
              </label>
            </div>
          </form>
          
          {/* Search Sources Link */}
          <div className="search-sources-link">
            <Link to="/search" className="search-link">
              <Search size={18} /> Источники поиска
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Torrents Section */}
      {recentTorrents.length > 0 && (
        <div className="history-section">
          <div className="section-header">
            <h2>
              <Clock size={24} />
              Недавние торренты
            </h2>
            <div className="section-actions">
              <button 
                onClick={() => setShowHistory(!showHistory)} 
                className="toggle-button"
              >
                {showHistory ? 'Свернуть' : `Показать все (${recentTorrents.length})`}
              </button>
              {showHistory && (
                <button onClick={clearAllHistory} className="clear-button">
                  <Trash2 size={16} />
                  Очистить историю
                </button>
              )}
            </div>
          </div>

          {showHistory && (
            <div className="search-section">
              <div className="search-input">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Поиск по торрентам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="torrent-grid">
            {(showHistory ? filteredTorrents : recentTorrents.slice(0, 4)).map((torrent) => (
              <div 
                key={torrent.infoHash} 
                className="torrent-card"
                onClick={() => goToTorrent(torrent.infoHash)}
              >
                <div className="torrent-info">
                  <h3>{torrent.name}</h3>
                  <div className="torrent-meta">
                    <span className="source-tag">{torrent.source}</span>
                    <span className="date">
                      {new Date(torrent.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="torrent-source">{torrent.originalInput}</p>
                </div>
                <button
                  className="remove-button"
                  onClick={(e) => removeTorrentFromHistory(torrent.infoHash, e)}
                  title="Удалить из истории"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {!showHistory && recentTorrents.length > 4 && (
            <div className="view-all">
              <button 
                onClick={() => setShowHistory(true)} 
                className="view-all-button"
              >
                Показать все: {recentTorrents.length}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="features-summary">
        <div className="feature-item">
          <Zap className="feature-icon" aria-hidden="true" />
          <span>Просмотр во время загрузки</span>
        </div>
        <div className="feature-item">
          <HardDrive className="feature-icon" aria-hidden="true" />
          <span>Запоминание прогресса</span>
        </div>
        <div className="feature-item">
          <Clapperboard className="feature-icon" aria-hidden="true" />
          <span>Встроенный видеоплеер</span>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
