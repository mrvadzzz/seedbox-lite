import React, { useState, useEffect } from 'react';
import { Settings, Trash2, Download, Globe, HardDrive, ExternalLink, LogOut, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { config } from '../config/environment';
import { useAuth } from '../context/auth';
import progressService from '../services/progressService';
import './SettingsPage.css';

const SettingsPage = () => {
  const { logout } = useAuth();
  const [settings, setSettings] = useState({
    downloadPath: '/tmp/seedbox-downloads',
    maxConnections: 50,
    autoStartDownload: true,
    preserveSubtitles: true,
    defaultQuality: '1080p',
    autoResume: true,
    bufferSize: 50
  });
  
  const [stats, setStats] = useState({});
  
  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('seedbox-settings');
        if (saved) {
          setSettings(prevSettings => ({ ...prevSettings, ...JSON.parse(saved) }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const loadStats = () => {
    const statistics = progressService.getStats();
    setStats(statistics);
  };

  const saveSettings = (newSettings) => {
    try {
      localStorage.setItem('seedbox-settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      console.log('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const clearAllData = () => {
    if (window.confirm('Очистить все данные приложения? Будут удалены прогресс, настройки и кеш. Это нельзя отменить.')) {
      localStorage.clear();
      progressService.clearAllProgress();
      setSettings({
        downloadPath: '/tmp/seedbox-downloads',
        maxConnections: 50,
        autoStartDownload: true,
        preserveSubtitles: true,
        defaultQuality: '1080p',
        autoResume: true,
        bufferSize: 50
      });
      loadStats();
      alert('Все данные очищены');
    }
  };

  const clearWebTorrentCache = async () => {
    if (window.confirm('Очистить кеш WebTorrent? Загруженные данные будут удалены, активные торренты остановятся.')) {
      try {
        const response = await fetch(config.api.torrents, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          const result = await response.json();
          alert(`Кеш WebTorrent очищен. Удалено торрентов: ${result.cleared || 0}`);
        } else {
          alert('Не удалось очистить кеш WebTorrent');
        }
      } catch (error) {
        console.error('Error clearing WebTorrent cache:', error);
        alert('Ошибка очистки кеша WebTorrent: ' + error.message);
      }
    }
  };

  const clearProgressData = () => {
    if (window.confirm('Очистить весь прогресс просмотра? История и точки продолжения будут удалены.')) {
      progressService.clearAllProgress();
      loadStats();
      alert('Прогресс просмотра очищен');
    }
  };

  const exportSettings = () => {
    const allData = {
      settings,
      progress: progressService.getAllProgress(),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seedbox-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.settings) {
          saveSettings(data.settings);
        }
        
        if (data.progress) {
          localStorage.setItem('seedbox-video-progress', JSON.stringify(data.progress));
          loadStats();
        }
        
        alert('Настройки импортированы');
      } catch (error) {
        alert('Ошибка импорта настроек: неверный формат файла');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  const handleLogout = () => {
    if (window.confirm('Выйти? Для следующего входа потребуется снова ввести пароль.')) {
      logout();
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>
          <Settings size={28} />
          Настройки
        </h1>
        <p>Настройте SeedBox Lite под себя</p>
      </div>

      {/* Application Statistics */}
      <div className="settings-section">
        <h2>📊 Статистика</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Всего видео</span>
            <span className="stat-value">{stats.totalVideos || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Досмотрено</span>
            <span className="stat-value">{stats.completed || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">В процессе</span>
            <span className="stat-value">{stats.inProgress || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Время просмотра</span>
            <span className="stat-value">{stats.totalWatchTime || '0:00'}</span>
          </div>
        </div>
      </div>

      {/* Video Settings */}
      <div className="settings-section">
        <h2>🎬 Настройки видео</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <label>
              <span>Продолжать просмотр</span>
              <p>Предлагать продолжить с последней позиции</p>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.autoResume}
                onChange={(e) => handleSettingChange('autoResume', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <label>
              <span>Предпочитаемое качество</span>
              <p>Желаемое качество видео для просмотра</p>
            </label>
            <select
              value={settings.defaultQuality}
              onChange={(e) => handleSettingChange('defaultQuality', e.target.value)}
              className="setting-select"
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="1440p">1440p</option>
              <option value="4K">4K</option>
            </select>
          </div>

          <div className="setting-item">
            <label>
              <span>Размер буфера (МБ)</span>
              <p>Буфер видео для более плавного просмотра</p>
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={settings.bufferSize}
              onChange={(e) => handleSettingChange('bufferSize', parseInt(e.target.value))}
              className="setting-slider"
            />
            <span className="slider-value">{settings.bufferSize} MB</span>
          </div>
        </div>
      </div>

      {/* Download Settings */}
      <div className="settings-section">
        <h2>⬇️ Настройки загрузки</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <label>
              <span>Автостарт загрузки</span>
              <p>Начинать загрузку сразу после добавления торрента</p>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.autoStartDownload}
                onChange={(e) => handleSettingChange('autoStartDownload', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <label>
              <span>Сохранять субтитры</span>
              <p>Не удалять файлы субтитров при просмотре</p>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.preserveSubtitles}
                onChange={(e) => handleSettingChange('preserveSubtitles', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <label>
              <span>Максимум соединений</span>
              <p>Максимальное число соединений на торрент</p>
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={settings.maxConnections}
              onChange={(e) => handleSettingChange('maxConnections', parseInt(e.target.value))}
              className="setting-slider"
            />
            <span className="slider-value">{settings.maxConnections}</span>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="settings-section">
        <h2>🗃️ Управление данными</h2>
        <div className="data-actions">
          <Link to="/search" className="action-button search-management">
            <Search size={16} />
            Источники поиска
            <ExternalLink size={14} />
          </Link>
        
          <Link to="/cache" className="action-button cache-management">
            <HardDrive size={16} />
            Управление кешем
            <ExternalLink size={14} />
          </Link>
          
          <button onClick={exportSettings} className="action-button export">
            <Download size={16} />
            Экспорт настроек и прогресса
          </button>
          
          <label className="action-button import">
            <Globe size={16} />
            Импорт настроек и прогресса
            <input
              type="file"
              accept=".json"
              onChange={importSettings}
              style={{ display: 'none' }}
            />
          </label>
          
          <button onClick={clearWebTorrentCache} className="action-button warning">
            <Trash2 size={16} />
            Очистить кеш WebTorrent
          </button>
          
          <button onClick={clearProgressData} className="action-button warning">
            <Trash2 size={16} />
            Очистить прогресс просмотра
          </button>
          
          <button onClick={clearAllData} className="action-button danger">
            <Trash2 size={16} />
            Очистить все данные
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="settings-section">
        <h2>🔐 Безопасность</h2>
        <div className="security-section">
          <div className="security-info">
            <p>Авторизация хранится локально на этом устройстве. Можно выйти, чтобы при следующем входе снова требовался пароль.</p>
          </div>
          <div className="action-buttons">
            <button onClick={handleLogout} className="action-button danger">
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <h2>ℹ️ О приложении</h2>
        <div className="about-info">
          <div className="app-info">
            <h3>SeedBox Lite</h3>
            <p>Версия 1.0.0</p>
            <p>Лёгкий клиент для потокового просмотра торрентов с прогрессом просмотра и поддержкой субтитров.</p>
          </div>
          
          <div className="features-list">
            <h4>Возможности:</h4>
            <ul>
              <li>Потоковый просмотр торрентов</li>
              <li>Запоминание прогресса и продолжение просмотра</li>
              <li>Поиск и подключение субтитров</li>
              <li>Современный адаптивный интерфейс</li>
              <li>Локальное хранение данных</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
