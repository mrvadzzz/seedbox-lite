const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const browserApiUrl = typeof window === 'undefined'
  ? 'http://localhost:3001'
  : `${window.location.protocol}//${window.location.hostname}:3001`;
const API_BASE_URL = configuredApiUrl || browserApiUrl;

// Remove trailing slash if present
const normalizeUrl = (url) => url.endsWith('/') ? url.slice(0, -1) : url;

export const config = {
  // API Configuration
  apiBaseUrl: normalizeUrl(API_BASE_URL),
  
  // API Endpoints
  api: {
    torrents: `${normalizeUrl(API_BASE_URL)}/api/torrents`,
    cache: `${normalizeUrl(API_BASE_URL)}/api/cache`,
    system: `${normalizeUrl(API_BASE_URL)}/api/system`,
  },
  
  // Development helpers
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Helper functions
  getApiUrl: (endpoint) => `${normalizeUrl(API_BASE_URL)}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
  
  // Torrent API helpers
  getTorrentUrl: (infoHash, endpoint = '') => 
    `${normalizeUrl(API_BASE_URL)}/api/torrents/${infoHash}${endpoint ? `/${endpoint}` : ''}`,
    
  getStreamUrl: (infoHash, fileIndex) => 
    `${normalizeUrl(API_BASE_URL)}/api/torrents/${infoHash}/files/${fileIndex}/stream`,
    
  getDownloadUrl: (infoHash, fileIndex) => 
    `${normalizeUrl(API_BASE_URL)}/api/torrents/${infoHash}/files/${fileIndex}/download`,
};

if (config.isDevelopment) {
  console.log('Environment configuration:', {
    apiBaseUrl: config.apiBaseUrl,
    environment: config.isDevelopment ? 'development' : 'production'
  });
}
