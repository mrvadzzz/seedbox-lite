import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trash2, Clock, Film } from 'lucide-react';
import VideoModal from './VideoModal';
import VideoPlayer from './VideoPlayer';
import { config } from '../config/environment';
import progressService from '../services/progressService';
import './RecentPage.css';

const RecentPage = () => {
  const navigate = useNavigate();
  const [recentVideos, setRecentVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    loadRecentVideos();
    loadStats();
  }, []);

  const loadRecentVideos = () => {
    const videos = progressService.getRecentVideos(20);
    setRecentVideos(videos);
  };

  const loadStats = () => {
    const statistics = progressService.getStats();
    setStats(statistics);
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo({
      src: config.getStreamUrl(video.torrentHash, video.fileIndex),
      title: video.fileName,
      torrentHash: video.torrentHash,
      fileIndex: video.fileIndex,
      initialTime: video.currentTime || 0
    });
  };

  const handleRemoveProgress = (video) => {
    if (window.confirm('Удалить это видео из списка недавних?')) {
      progressService.removeProgress(video.torrentHash, video.fileIndex);
      loadRecentVideos();
      loadStats();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Очистить весь прогресс просмотра? Это действие нельзя отменить.')) {
      progressService.clearAllProgress();
      loadRecentVideos();
      loadStats();
    }
  };

  const goToTorrent = (torrentHash) => {
    navigate(`/torrent/${torrentHash}`);
  };

  return (
    <div className="recent-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <Clock size={28} />
            Недавние видео
          </h1>
          <p>Продолжайте просмотр с того места, где остановились</p>
        </div>
        
        {recentVideos.length > 0 && (
          <button onClick={handleClearAll} className="clear-all-button">
            <Trash2 size={16} />
            Очистить всё
          </button>
        )}
      </div>

      {/* Statistics */}
      {Object.keys(stats).length > 0 && (
        <div className="stats-section">
          <h2>Статистика</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalVideos}</div>
              <div className="stat-label">Всего видео</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">Досмотрено</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.inProgress}</div>
              <div className="stat-label">В процессе</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalWatchTime}</div>
              <div className="stat-label">Время просмотра</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Videos */}
      <div className="videos-section">
        {recentVideos.length === 0 ? (
          <div className="empty-state">
            <Film size={48} />
            <h3>Недавних видео пока нет</h3>
            <p>Начните просмотр, и видео появятся здесь</p>
            <button onClick={() => navigate('/')} className="browse-button">
              К торрентам
            </button>
          </div>
        ) : (
          <div className="videos-grid">
            {recentVideos.map((video) => (
              <div key={`${video.torrentHash}-${video.fileIndex}`} className="video-card">
                <div className="video-progress-bg">
                  <div 
                    className="video-progress-fill" 
                    style={{ width: `${Math.min(100, Math.max(0, video.percentage || 0))}%` }}
                  ></div>
                </div>
                
                <div className="video-content">
                  <div className="video-info">
                    <h3 className="video-title" title={video.fileName}>
                      {video.fileName}
                    </h3>
                    <div className="video-meta">
                      <span className="progress-text">
                        {progressService.formatTime(video.currentTime)}
                        {video.duration > video.currentTime && ` / ${progressService.formatTime(video.duration)}`}
                      </span>
                      <span className="watch-time">
                        {progressService.formatRelativeTime(video.lastWatched)}
                      </span>
                    </div>
                    <div className="progress-percentage">
                      {video.duration > video.currentTime
                        ? `${Math.round(video.percentage)}% просмотрено`
                        : 'Есть сохранённая позиция'}
                      {video.isCompleted && <span className="completed-badge">✓</span>}
                    </div>
                  </div>
                  
                  <div className="video-actions">
                    <button 
                      onClick={() => handleVideoSelect(video)}
                      className="play-action"
                      title="Продолжить просмотр"
                    >
                      <Play size={16} />
                    </button>
                    <button 
                      onClick={() => goToTorrent(video.torrentHash)}
                      className="torrent-action"
                      title="Открыть торрент"
                    >
                      <Film size={16} />
                    </button>
                    <button 
                      onClick={() => handleRemoveProgress(video)}
                      className="remove-action"
                      title="Удалить из недавних"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedVideo && (
        <VideoModal
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          title={selectedVideo.title}
        >
          <VideoPlayer
            src={selectedVideo.src}
            title={selectedVideo.title}
            torrentHash={selectedVideo.torrentHash}
            fileIndex={selectedVideo.fileIndex}
            initialTime={selectedVideo.initialTime}
          />
        </VideoModal>
      )}
    </div>
  );
};

export default RecentPage;
