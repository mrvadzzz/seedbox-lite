import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import './VideoModal.css';

const VideoModal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const openInNewTab = () => {
    // Extract video source from children if possible
    const videoSrc = children?.props?.src;
    if (videoSrc) {
      window.open(videoSrc, '_blank');
    }
  };

  return (
    <div className="video-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <div className="video-modal" role="dialog" aria-modal="true" aria-label={title || 'Видеоплеер'}>
        <div className="video-modal-header">
          <div className="modal-title">
            <h3>{title}</h3>
          </div>
          <div className="modal-actions">
            <button 
              onClick={openInNewTab}
              className="modal-action-button"
              title="Открыть видео в новой вкладке"
              aria-label="Открыть видео в новой вкладке"
            >
              <ExternalLink size={18} />
            </button>
            <button 
              onClick={onClose}
              className="modal-close-button"
              title="Закрыть видео"
              aria-label="Закрыть видео"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="video-modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
