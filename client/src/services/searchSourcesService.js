// Search sources service for managing user-defined torrent search websites
class SearchSourcesService {
  constructor() {
    this.storageKey = 'seedbox-search-sources';
    
    // Default examples (empty by default to avoid promoting any specific sources)
    this.defaultSources = [];
  }

  // Get all search sources
  getSources() {
    try {
      const sources = localStorage.getItem(this.storageKey);
      return sources ? JSON.parse(sources) : this.defaultSources;
    } catch (error) {
      console.error('Error loading search sources:', error);
      return this.defaultSources;
    }
  }

  // Add a new search source
  addSource(source) {
    try {
      const sources = this.getSources();
      
      // Validate URL
      try {
        new URL(source.url);
      } catch {
        throw new Error('Invalid URL format');
      }
      
      // Create a unique ID for the source
      const newSource = {
        ...source,
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        addedAt: new Date().toISOString()
      };
      
      const newSources = [...sources, newSource];
      localStorage.setItem(this.storageKey, JSON.stringify(newSources));
      
      console.log(`➕ Added search source: ${newSource.name}`);
      return newSource;
    } catch (error) {
      console.error('Error adding search source:', error);
      throw error;
    }
  }

  // Update an existing search source
  updateSource(id, updates) {
    try {
      const sources = this.getSources();
      const sourceIndex = sources.findIndex(s => s.id === id);
      
      if (sourceIndex === -1) {
        throw new Error('Search source not found');
      }
      
      // Validate URL if it's being updated
      if (updates.url) {
        try {
          new URL(updates.url);
        } catch {
          throw new Error('Invalid URL format');
        }
      }
      
      const updatedSource = {
        ...sources[sourceIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      const newSources = [
        ...sources.slice(0, sourceIndex),
        updatedSource,
        ...sources.slice(sourceIndex + 1)
      ];
      
      localStorage.setItem(this.storageKey, JSON.stringify(newSources));
      
      console.log(`✏️ Updated search source: ${updatedSource.name}`);
      return updatedSource;
    } catch (error) {
      console.error('Error updating search source:', error);
      throw error;
    }
  }

  // Remove a search source
  removeSource(id) {
    try {
      const sources = this.getSources();
      const sourceToRemove = sources.find(s => s.id === id);
      
      if (!sourceToRemove) {
        throw new Error('Search source not found');
      }
      
      const newSources = sources.filter(s => s.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(newSources));
      
      console.log(`🗑️ Removed search source: ${sourceToRemove.name}`);
      return true;
    } catch (error) {
      console.error('Error removing search source:', error);
      throw error;
    }
  }

  // Reorder sources (move up/down)
  reorderSources(sourceIds) {
    try {
      const currentSources = this.getSources();
      
      // Create a map for O(1) lookups
      const sourceMap = {};
      currentSources.forEach(source => {
        sourceMap[source.id] = source;
      });
      
      // Create new ordered array based on provided IDs
      const reorderedSources = sourceIds.map(id => sourceMap[id]);
      
      // Ensure we didn't lose any sources
      if (reorderedSources.length !== currentSources.length) {
        throw new Error('Source IDs don\'t match existing sources');
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(reorderedSources));
      console.log('🔃 Reordered search sources');
      
      return reorderedSources;
    } catch (error) {
      console.error('Error reordering sources:', error);
      throw error;
    }
  }

  // Clear all search sources
  clearSources() {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('🧹 Cleared all search sources');
      return true;
    } catch (error) {
      console.error('Error clearing search sources:', error);
      throw error;
    }
  }

  // Import sources from JSON
  importSources(sourcesJson) {
    try {
      // Validate that it's an array
      if (!Array.isArray(sourcesJson)) {
        throw new Error('Import data must be an array');
      }
      
      // Validate each source
      sourcesJson.forEach(source => {
        if (!source.name || !source.url) {
          throw new Error('Each source must have a name and URL');
        }
        
        try {
          new URL(source.url);
        } catch {
          throw new Error(`Invalid URL format for source: ${source.name}`);
        }
      });
      
      // Add IDs to any sources that don't have them
      const sourcesWithIds = sourcesJson.map(source => {
        if (!source.id) {
          return {
            ...source,
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            addedAt: source.addedAt || new Date().toISOString()
          };
        }
        return source;
      });
      
      localStorage.setItem(this.storageKey, JSON.stringify(sourcesWithIds));
      console.log(`📥 Imported ${sourcesWithIds.length} search sources`);
      
      return sourcesWithIds;
    } catch (error) {
      console.error('Error importing search sources:', error);
      throw error;
    }
  }

  // Export sources to JSON
  exportSources() {
    return this.getSources();
  }
}

// Create and export singleton instance
const searchSourcesService = new SearchSourcesService();
export default searchSourcesService;
