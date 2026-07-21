import React, { useState, useEffect } from 'react';
import { Search, Plus, ExternalLink, Edit, Trash2, Download, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import searchSourcesService from '../services/searchSourcesService';
import './SearchSourcesPage.css';

const SearchSourcesPage = () => {
  const [sources, setSources] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [formData, setFormData] = useState({ name: '', url: '', description: '', icon: '🔍' });
  const [activeSourceId, setActiveSourceId] = useState(null);
  const [iframeUrl, setIframeUrl] = useState('');
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Available icons for sources
  const availableIcons = ['🔍', '🌐', '🔎', '📚', '🎬', '🎵', '📺', '💻', '📱', '🎮', '📖', '🧩', '🔬', '🔮', '📡'];

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = () => {
    const loadedSources = searchSourcesService.getSources();
    setSources(loadedSources);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    try {
      if (editingSource) {
        // Update existing source
        searchSourcesService.updateSource(editingSource.id, formData);
      } else {
        // Add new source
        searchSourcesService.addSource(formData);
      }
      
      // Reset form and reload sources
      setFormData({ name: '', url: '', description: '', icon: '🔍' });
      setEditingSource(null);
      setShowForm(false);
      loadSources();
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    }
  };

  const handleEdit = (source) => {
    setFormData({
      name: source.name,
      url: source.url,
      description: source.description || '',
      icon: source.icon || '🔍'
    });
    setEditingSource(source);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Удалить этот источник поиска?')) {
      try {
        searchSourcesService.removeSource(id);
        
        // Reset active source if it's being deleted
        if (activeSourceId === id) {
          setActiveSourceId(null);
          setIframeUrl('');
        }
        
        loadSources();
      } catch (error) {
        alert(`Ошибка: ${error.message}`);
      }
    }
  };

  const handleOpenSource = (source) => {
    setActiveSourceId(source.id);
    setIframeUrl(source.url);
  };

  const handleMoveSource = (id, direction) => {
    const sourceIndex = sources.findIndex(s => s.id === id);
    if ((direction === 'up' && sourceIndex === 0) || 
        (direction === 'down' && sourceIndex === sources.length - 1)) {
      return; // Can't move further
    }
    
    const newSources = [...sources];
    const sourceToMove = newSources[sourceIndex];
    
    if (direction === 'up') {
      newSources[sourceIndex] = newSources[sourceIndex - 1];
      newSources[sourceIndex - 1] = sourceToMove;
    } else {
      newSources[sourceIndex] = newSources[sourceIndex + 1];
      newSources[sourceIndex + 1] = sourceToMove;
    }
    
    // Save the new order
    const sourceIds = newSources.map(s => s.id);
    try {
      searchSourcesService.reorderSources(sourceIds);
      loadSources();
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    }
  };

  const handleDragStart = (e, id) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Use a transparent image as drag ghost
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
    // Add styling to the dragged item
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedItemId(null);
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (id !== draggedItemId) {
      const draggedIndex = sources.findIndex(s => s.id === draggedItemId);
      const hoverIndex = sources.findIndex(s => s.id === id);
      
      if (draggedIndex !== -1 && hoverIndex !== -1) {
        const newSources = [...sources];
        const draggedItem = newSources[draggedIndex];
        
        // Remove the dragged item
        newSources.splice(draggedIndex, 1);
        // Insert it at the hover position
        newSources.splice(hoverIndex, 0, draggedItem);
        
        // Update the order in the UI without saving yet
        setSources(newSources);
      }
    }
  };

  const handleDragDrop = () => {
    // Save the new order after drop
    const sourceIds = sources.map(s => s.id);
    try {
      searchSourcesService.reorderSources(sourceIds);
    } catch (error) {
      // Revert to original order if there was an error
      loadSources();
      alert(`Ошибка: ${error.message}`);
    }
  };

  const handleImportExport = (action) => {
    if (action === 'export') {
      const sourcesJson = searchSourcesService.exportSources();
      setImportJson(JSON.stringify(sourcesJson, null, 2));
    } else {
      setImportJson('');
    }
    setShowImportExport(true);
  };

  const handleImport = () => {
    try {
      const sourcesData = JSON.parse(importJson);
      searchSourcesService.importSources(sourcesData);
      setShowImportExport(false);
      setImportJson('');
      loadSources();
      alert('Источники поиска импортированы');
    } catch (error) {
      alert(`Ошибка импорта: ${error.message}`);
    }
  };

  const closeIframe = () => {
    setIframeUrl('');
    setActiveSourceId(null);
  };

  return (
    <div className="search-sources-page">
      <div className="page-header">
        <h1>
          <Search size={28} />
          Источники поиска торрентов
        </h1>
        <p>Добавляйте и открывайте свои сайты для поиска торрентов</p>
      </div>

      <div className="search-sources-container">
        <div className="sources-sidebar">
          <div className="sidebar-header">
            <h2>Ваши источники</h2>
            <button 
              className="add-source-button" 
              onClick={() => { 
                setEditingSource(null); 
                setFormData({ name: '', url: '', description: '', icon: '🔍' });
                setShowForm(true); 
              }}
            >
              <Plus size={16} /> Добавить
            </button>
          </div>

          <div className="sources-list">
            {sources.length === 0 ? (
              <div className="no-sources">
                <p>Источников пока нет.</p>
                <p>Нажмите «Добавить», чтобы создать первый.</p>
              </div>
            ) : (
              sources.map((source) => (
                <div 
                  key={source.id} 
                  className={`source-item ${activeSourceId === source.id ? 'active' : ''} ${draggedItemId === source.id ? 'dragging' : ''}`}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, source.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, source.id)}
                  onDrop={handleDragDrop}
                >
                  <div className="source-item-content">
                    <div className="source-icon">{source.icon || '🔍'}</div>
                    <div className="source-details">
                      <h3>{source.name}</h3>
                      {source.description && <p>{source.description}</p>}
                    </div>
                  </div>
                  <div className="source-actions">
                    <button onClick={() => handleMoveSource(source.id, 'up')} title="Выше">
                      <ArrowUp size={16} />
                    </button>
                    <button onClick={() => handleMoveSource(source.id, 'down')} title="Ниже">
                      <ArrowDown size={16} />
                    </button>
                    <button onClick={() => handleOpenSource(source)} title="Открыть">
                      <ExternalLink size={16} />
                    </button>
                    <button onClick={() => handleEdit(source)} title="Изменить">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(source.id)} title="Удалить">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="sources-footer">
            <button className="import-button" onClick={() => handleImportExport('import')}>
              <Upload size={16} /> Импорт
            </button>
            <button 
              className="export-button" 
              onClick={() => handleImportExport('export')}
              disabled={sources.length === 0}
            >
              <Download size={16} /> Экспорт
            </button>
          </div>
        </div>

        <div className="sources-content">
          {showForm ? (
            <div className="source-form-container">
              <h2>{editingSource ? 'Изменить источник' : 'Добавить источник'}</h2>
              <form className="source-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Название</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Например, мой поисковик"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="url">URL</label>
                  <input
                    type="url"
                    id="url"
                    name="url"
                    value={formData.url}
                    onChange={handleFormChange}
                    placeholder="https://example.com/search"
                    required
                  />
                  <small>Укажите полный адрес сайта, где вы ищете торренты</small>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Описание</label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Например, поиск фильмов"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="icon">Иконка</label>
                  <div className="icon-selector">
                    {availableIcons.map((icon) => (
                      <span 
                        key={icon}
                        className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, icon })}
                      >
                        {icon}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => setShowForm(false)} className="cancel-button">
                    Отмена
                  </button>
                  <button type="submit" className="save-button">
                    {editingSource ? 'Сохранить' : 'Добавить'}
                  </button>
                </div>
              </form>
            </div>
          ) : iframeUrl ? (
            <div className="iframe-container">
              <div className="iframe-header">
                <h2>
                  {sources.find(s => s.id === activeSourceId)?.name || 'Поиск'}
                </h2>
                <button onClick={closeIframe} className="close-iframe">
                  Закрыть
                </button>
              </div>
              <iframe 
                src={iframeUrl} 
                title="Поиск торрентов"
                className="search-iframe"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
              />
              <div className="iframe-footer">
                <p>
                  <strong>Важно:</strong> это внешний сайт. SeedBox Lite не отвечает за его содержимое.
                </p>
              </div>
            </div>
          ) : (
            <div className="search-instructions">
              <div className="instructions-content">
                <div className="instructions-icon">🔍</div>
                <h2>Свой поиск торрентов</h2>
                <p>Добавьте любимые поисковые сайты и открывайте их прямо из SeedBox Lite.</p>
                
                <div className="instruction-steps">
                  <div className="step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>Добавьте источники</h3>
                      <p>Нажмите «Добавить» и сохраните адрес нужного сайта.</p>
                    </div>
                  </div>
                  
                  <div className="step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3>Откройте источник</h3>
                      <p>Нажмите на иконку открытия, чтобы загрузить сайт во встроенном окне.</p>
                    </div>
                  </div>
                  
                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Найдите и добавьте</h3>
                      <p>Скопируйте magnet-ссылку и вставьте её на главной странице SeedBox Lite.</p>
                    </div>
                  </div>
                </div>
                
                <div className="instructions-note">
                  <p><strong>Приватность:</strong> источники поиска сохраняются только на вашем устройстве.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showImportExport && (
        <div className="modal-overlay">
          <div className="import-export-modal">
            <h2>{importJson ? 'Экспорт источников' : 'Импорт источников'}</h2>
            
            <div className="import-export-content">
              <textarea 
                value={importJson} 
                onChange={(e) => setImportJson(e.target.value)}
                placeholder={importJson ? '' : 'Вставьте JSON с источниками поиска...'}
                readOnly={!!importJson && importJson.length > 0}
              />
              
              <div className="format-help">
                <h4>Пример формата:</h4>
                <pre>{`[
  {
    "name": "Example Search",
    "url": "https://example.com/search",
    "description": "Example search site",
    "icon": "🔍"
  }
]`}</pre>
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowImportExport(false)} className="cancel-button">
                Закрыть
              </button>
              
              {!importJson && (
                <button onClick={handleImport} className="import-button">
                  Импортировать
                </button>
              )}
              
              {importJson && (
                <button 
                  onClick={() => {
                    // Copy to clipboard
                    navigator.clipboard.writeText(importJson)
                      .then(() => alert('Скопировано'))
                      .catch(err => alert('Не удалось скопировать: ' + err));
                  }} 
                  className="copy-button"
                >
                  Скопировать
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchSourcesPage;
