import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  Settings,
  Download,
  Loader2,
  Users,
  Activity,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Subtitles,
  Languages,
  Search,
  Globe,
  X,
  Minimize2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { config } from '../config/environment';
import progressService from '../services/progressService';
import './VideoPlayer.css';

const AUDIO_TRACKS_PER_PAGE = 3;

const VideoPlayer = ({ 
  src, 
  title, 
  onTimeUpdate, 
  onProgress, 
  initialTime = 0, 
  torrentHash = null,
  fileIndex = null,
  onClose = null
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const instantPlayEnabled = true;
  const [bufferVisualization, setBufferVisualization] = useState({
    ahead: 0,
    behind: 0,
    total: 0,
    percentage: 0
  });
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [availableAudioTracks, setAvailableAudioTracks] = useState([]);
  const [audioTrackPage, setAudioTrackPage] = useState(0);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(null);
  const [videoSrc, setVideoSrc] = useState(src);
  const [audioTrackError, setAudioTrackError] = useState(null);
  const [isCompatibleAudio, setIsCompatibleAudio] = useState(false);
  const currentTimeRef = useRef(0);
  const streamOffsetRef = useRef(0);
  const originalDurationRef = useRef(0);
  const pendingPlaybackRef = useRef(false);
  const audioAutoSelectedRef = useRef(false);
  const fullscreenRequestedRef = useRef(false);
  const nativeFullscreenActiveRef = useRef(false);

  useEffect(() => {
    setVideoSrc(src);
    setSelectedAudioTrack(null);
    setIsCompatibleAudio(false);
    streamOffsetRef.current = 0;
    currentTimeRef.current = 0;
    originalDurationRef.current = 0;
    pendingPlaybackRef.current = false;
    audioAutoSelectedRef.current = false;
  }, [src]);

  const startCompatibleAudio = useCallback((audioIndex, startAt = 0, shouldPlay = false) => {
    if (!torrentHash || fileIndex === null || fileIndex === undefined) return;

    const safeAudioIndex = Number.isInteger(Number(audioIndex)) ? Number(audioIndex) : 0;
    const safeStart = Number.isFinite(startAt) ? Math.max(0, startAt) : 0;
    const nextSrc = config.getApiUrl(
      `/api/torrents/${torrentHash}/files/${fileIndex}/transcode?audio=${safeAudioIndex}&start=${safeStart.toFixed(3)}&v=${Date.now()}`
    );

    streamOffsetRef.current = safeStart;
    currentTimeRef.current = safeStart;
    pendingPlaybackRef.current = shouldPlay;
    setCurrentTime(safeStart);
    setSelectedAudioTrack(safeAudioIndex);
    setIsCompatibleAudio(true);
    setIsLoading(true);
    setVideoSrc(nextSrc);
  }, [torrentHash, fileIndex]);

  const fetchAudioTracks = useCallback(async () => {
    if (!torrentHash || fileIndex === null || fileIndex === undefined) return;

    try {
      setAudioTrackError(null);
      const response = await fetch(config.getTorrentUrl(torrentHash, `files/${fileIndex}/audio-tracks`));
      if (!response.ok) {
        throw new Error(`Не удалось прочитать аудиодорожки: ${response.status}`);
      }

      const data = await response.json();
      const tracks = data.tracks || [];
      setAvailableAudioTracks(tracks);
      setAudioTrackPage(0);
      if (data.duration && !originalDurationRef.current) {
        originalDurationRef.current = data.duration;
        setDuration(data.duration);
      }

      if (data.requiresTranscode && data.recommendedAudioIndex !== null && !audioAutoSelectedRef.current) {
        audioAutoSelectedRef.current = true;
        const video = videoRef.current;
        startCompatibleAudio(
          data.recommendedAudioIndex,
          currentTimeRef.current || initialTime,
          Boolean(video && !video.paused)
        );
      }
    } catch (error) {
      console.warn('Не удалось получить аудиодорожки:', error);
      setAudioTrackError('Аудиодорожки недоступны');
      setAvailableAudioTracks([]);
    }
  }, [torrentHash, fileIndex, initialTime, startCompatibleAudio]);

  useEffect(() => {
    fetchAudioTracks();
  }, [fetchAudioTracks]);

  const selectAudioTrack = (track) => {
    const video = videoRef.current;
    startCompatibleAudio(track?.audioIndex ?? 0, currentTimeRef.current, Boolean(video && !video.paused));
    setShowSettings(false);
  };
  // Progress tracking states
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [hasShownResumeDialog, setHasShownResumeDialog] = useState(false);
  const [hasAppliedInitialTime, setHasAppliedInitialTime] = useState(false);
  
  // Subtitle/CC support
  const [availableSubtitles, setAvailableSubtitles] = useState([]);
  const [onlineSubtitles, setOnlineSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  
  // Enhanced torrent/streaming states
  const [torrentStats, setTorrentStats] = useState({
    peers: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    progress: 0,
    downloaded: 0,
    total: 0,
    isConnected: false
  });
  const [bufferHealth, setBufferHealth] = useState(0);
  const [networkStatus, setNetworkStatus] = useState('connecting');
  const [showTorrentStats, setShowTorrentStats] = useState(true);
  
  const controlsTimeoutRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const lastTapTimeRef = useRef(0);
  const tapCountRef = useRef(0);
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isTvBrowser = /SmartTV|SMART-TV|HbbTV|TV|Tizen|Web0S|WebOS|YaBrowser|Yandex|Hartens|YaOS/i.test(userAgent);
  const isTouchDevice = typeof window !== 'undefined' && (
    'ontouchstart' in window || navigator.maxTouchPoints > 0
  );

  // Fetch real-time torrent statistics
  const fetchTorrentStats = useCallback(async () => {
    if (!torrentHash) return;
    
    try {
      const response = await fetch(config.getTorrentUrl(torrentHash, 'stats'));
      if (response.ok) {
        const stats = await response.json();
        setTorrentStats(stats);
        setNetworkStatus(stats.peers > 0 ? 'connected' : 'seeking');
        
        // Calculate buffer health based on download speed vs playback
        if (videoRef.current && stats.downloadSpeed > 0) {
          const currentBitrate = videoRef.current.playbackRate * 1024 * 1024; // Estimate
          const health = Math.min(100, (stats.downloadSpeed / currentBitrate) * 100);
          setBufferHealth(health);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch torrent stats:', error);
      setNetworkStatus('disconnected');
    }
  }, [torrentHash]);

  // Enhanced buffer monitoring for instant streaming
  const updateBufferedProgress = useCallback(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const buffered = video.buffered;
    const currentTime = video.currentTime;
    const duration = video.duration;
    
    if (buffered.length > 0 && duration) {
      const ranges = [];
      let bufferedEnd = 0;
      let bufferAhead = 0;
      let bufferBehind = 0;
      
      // Calculate all buffered ranges
      for (let i = 0; i < buffered.length; i++) {
        const start = buffered.start(i);
        const end = buffered.end(i);
        ranges.push({ start, end });
        
        // Find buffer ahead of current position
        if (start <= currentTime && end > currentTime) {
          bufferAhead = end - currentTime;
          bufferedEnd = end;
        }
        
        // Find buffer behind current position  
        if (end <= currentTime) {
          bufferBehind += (end - start);
        }
        
        // Track maximum buffered position
        if (end > bufferedEnd) {
          bufferedEnd = end;
        }
      }
      
      const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
      const totalBuffered = bufferAhead + bufferBehind;
      
      setBuffered(bufferedPercent);
      setBufferVisualization({
        ahead: bufferAhead,
        behind: bufferBehind,
        total: totalBuffered,
        percentage: duration > 0 ? Math.round((totalBuffered / duration) * 100) : 0
      });
      
      // Calculate buffer health for instant play decisions
      const minBufferForPlay = 3; // 3 seconds minimum
      const healthScore = Math.min(100, (bufferAhead / minBufferForPlay) * 100);
      setBufferHealth(healthScore);
    }
  }, []);

  // Initialize stats polling when torrent hash is available
  useEffect(() => {
    if (torrentHash && !statsIntervalRef.current) {
      fetchTorrentStats(); // Initial fetch
      statsIntervalRef.current = setInterval(fetchTorrentStats, 2000); // Update every 2s
    }
    
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [torrentHash, fetchTorrentStats]);

  // Fetch available subtitle files from torrent
  const fetchSubtitles = useCallback(async () => {
    if (!torrentHash) {
      console.log('VideoPlayer: No torrentHash provided for subtitle fetching');
      return;
    }
    
    console.log('VideoPlayer: Fetching subtitles for torrent:', torrentHash);
    
    try {
      const response = await fetch(config.getTorrentUrl(torrentHash, 'files'));
      if (response.ok) {
        const payload = await response.json();
        const files = Array.isArray(payload) ? payload : (payload.files || []);
        console.log('VideoPlayer: Fetched files:', files.length);
        
        // Filter subtitle files (common extensions)
        const subtitleFiles = files.filter(file => {
          const ext = file.name.toLowerCase().split('.').pop();
          return ['srt', 'vtt', 'ass', 'ssa', 'sub', 'sbv'].includes(ext);
        }).map(file => ({
          ...file,
          language: extractLanguageFromFilename(file.name),
          url: config.getDownloadUrl(torrentHash, file.index)
        }));
        
        console.log('VideoPlayer: Found subtitle files:', subtitleFiles.length, subtitleFiles);
        setAvailableSubtitles(subtitleFiles);
      } else {
        console.error('VideoPlayer: Failed to fetch files, status:', response.status);
      }
    } catch (error) {
      console.warn('VideoPlayer: Failed to fetch subtitles:', error);
    }
  }, [torrentHash]);

  // Extract language from subtitle filename
  const extractLanguageFromFilename = (filename) => {
    const languageMap = {
      'eng': 'English',
      'spa': 'Spanish', 
      'fre': 'French',
      'ger': 'German',
      'ita': 'Italian',
      'por': 'Portuguese',
      'rus': 'Russian',
      'jpn': 'Japanese',
      'kor': 'Korean',
      'chi': 'Chinese',
      'ara': 'Arabic',
      'hin': 'Hindi',
      'tha': 'Thai',
      'tur': 'Turkish',
      'dut': 'Dutch',
      'swe': 'Swedish',
      'nor': 'Norwegian',
      'dan': 'Danish',
      'fin': 'Finnish',
      'pol': 'Polish',
      'cze': 'Czech',
      'hun': 'Hungarian',
      'gre': 'Greek',
      'heb': 'Hebrew',
      'rum': 'Romanian',
      'sdh': 'English (SDH)'
    };

    const name = filename.toLowerCase();
    
    // Look for language codes in filename
    for (const [code, language] of Object.entries(languageMap)) {
      if (name.includes(code)) {
        return language;
      }
    }
    
    // Check for full language names
    for (const language of Object.values(languageMap)) {
      if (name.includes(language.toLowerCase())) {
        return language;
      }
    }
    
    return 'Unknown';
  };

  // Fetch subtitles when torrent hash is available
  useEffect(() => {
    console.log('VideoPlayer: torrentHash changed:', torrentHash);
    if (torrentHash) {
      fetchSubtitles();
    }
  }, [torrentHash, fetchSubtitles]);

  // Search for online subtitles based on filename
  const searchOnlineSubtitles = useCallback(async (filename) => {
    if (!filename) return;
    
    setIsSearchingOnline(true);
    console.log('VideoPlayer: Searching online subtitles for:', filename);
    
    try {
      // Extract movie/show name from filename
      const cleanName = extractMediaName(filename);
      console.log('VideoPlayer: Extracted media name:', cleanName);
      
      // Call our backend to search for subtitles
      const response = await fetch('/api/subtitles/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: cleanName,
          filename: filename
        })
      });
      
      if (response.ok) {
        const results = await response.json();
        console.log('VideoPlayer: Found online subtitles:', results.length);
        setOnlineSubtitles(results);
      } else {
        console.error('VideoPlayer: Failed to search online subtitles:', response.status);
        setOnlineSubtitles([]);
      }
    } catch (error) {
      console.error('VideoPlayer: Error searching online subtitles:', error);
      setOnlineSubtitles([]);
    } finally {
      setIsSearchingOnline(false);
    }
  }, []);

  // Load online subtitle
  const loadOnlineSubtitle = useCallback(async (subtitle) => {
    try {
      console.log(`Loading online subtitle: ${subtitle.language} from ${subtitle.source}`);
      
      const downloadUrl = `/api/subtitles/download?url=${encodeURIComponent(subtitle.url)}&language=${encodeURIComponent(subtitle.language)}`;
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const subtitleContent = await response.text();
      
      // Create a blob URL for the subtitle
      const blob = new Blob([subtitleContent], { type: 'text/plain' });
      const subtitleUrl = URL.createObjectURL(blob);
      
      // Add subtitle track to video
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = `${subtitle.language} (${subtitle.source})`;
      track.srclang = subtitle.language.toLowerCase().substring(0, 2);
      track.src = subtitleUrl;
      track.default = true;
      
      // Remove existing tracks
      const existingTracks = videoRef.current.querySelectorAll('track');
      existingTracks.forEach(track => track.remove());
      
      videoRef.current.appendChild(track);
      
      console.log(`Loaded online subtitle: ${subtitle.language}`);
      
    } catch (error) {
      console.error('Error loading online subtitle:', error);
    }
  }, []);

  // Extract clean media name from filename
  const extractMediaName = (filename) => {
    // Remove file extension
    let name = filename.replace(/\.[^/.]+$/, '');
    
    // Remove common video quality markers
    name = name.replace(/\b(720p|1080p|1440p|2160p|4K|HD|CAM|TS|TC|SCR|DVDSCR|DVDRIP|HDTV|PDTV|DSR|WORKPRINT|VHS|TV|TVRIP|VOD|WEB-DL|WEBDL|WEBRip|WEB-Rip|BluRay|BDRip|BRRip|HDCAM|HDTS|DVDR|R3|R5|R6|PPVRIP|REMUX)\b/gi, '');
    
    // Remove common group tags
    name = name.replace(/\b(YIFY|YTS|RARBG|EZTV|ETTV|TorrentGalaxy|1337x|CMRG|FGT|CHD|HDChina|WiKi|DON|NTb|DIMENSION|LOL|ASAP|SVA|KILLERS|ROVERS|RARBG|SPARKS|TBS|CRiMSON|AMRAP|CTU|FoV|JYK|GECKOS|IMMERSE|DRONES|AMIABLE|playBD|decibeL|EA|EbP|ESiR|EXViD|FxM|FZERO|GECKOS|GFY|GoGo|mSD|NeDiVx|nmd|PUKKA|QiM|RUBY|SAiMORNY|SHUTTIT|SiRiUS|UKB5|WAF|x0r|YMG|ZOOE|APL|ARAXIAL|DEViSE|DiSPOSABLE|DVL|EwDp|FFNDVD|FRAGMENT|Larceny|MESS|MOKONA|nVID|REAKTOR|REWARD|RUSH|Replica|SECTOR7|Skazhutin|STUCK|SWTYBLZ|TLF|Waf4rr0k|WAR|WISDOM|YARN|ZmN|iMBT|pov|xxop|KLAXXON|SAPHiRE|TOPAZ|CiNEFiLE|Japhson|KiMCHi|LLoRd|mfcorrea|NaRaYa|Noir|PRODJi|PSYCHD|pukka|QaFoNE|RayRep|SECTOR7|SiNK|ViTE|WAF|WASTE|x0r|YIFY|3LT0N|4yEo|Ac3|ADTRG|AFG|AGRY|AKRAKEN|ALANiS|AliKaDee|ALLiANCE|AMIABLE|AN0NYM0US|AOV|ARK01|ARROW|AXiNE|BestDivX|BIB|BINGO|BRMP|BTSFilms|Bushi|CaKePiPe|CD1|CD2|Cd3|CdRip|CHiCaNo|CiCXXX|CLUE|CNXP|CODEiNE|compcompletos|CopStuff|CPOTT|CPUL|CrAcKrOoKz|CRF|CRiSC|CRiTiCAL|CRYS|CTU|DaBaum|DarkScene|DataHead|DCS|DEF|DELUCIDATION|DeWMaN|DHD|DiAMOND|DiSSOLVE|DivXNL|DMZ|DON|DROiD|DTL|DTS|DVDFab|DVDnL|DVL|DXO|e.t.|EB|EbP|ECI|ELiA|EMERALD|EmX|EncodeLounge|ENTiTY|EPiK|ESiR|ETM|EVL|EwDp|ExtraScene|FARG|FASTSUB|Fertili|FiHTV|FiNaLe|FLoW|FnF|FooKaS|FOR|Forest|FoREST|FoRM|FoV|FRAGMENT|FuN|FXG|Ganool|GAZ|GBM|GDB|GHoST|GIBBY|GNome|GoGo|HaB|HACKS|HANDJOB|HigH|HSBS|idMKv|iGNiTiON|iGNORANT|iHD|iLG|IMB|INSPiRAL|IRANiAN|iRiSH|iron|iTALiAN|iTS|iXA|JAV|KeepFRDS|KiCKAZZ|KNiGHTS|KODAK|Krautspatzen|LANR|LAP|Lat|Lbtag|LIME|LiNKLE|LiViNG|LLG|LoRD|LoVE|LTRG|LTT|Lu|m1080p|M7PLuS|maz123|METiS|MF|MFCORREA|MIFUNE|MoH|MOLECULE|MOViEFiNATiCS|MOViERUSH|MP3|mSD|MSTV|MTB|Multi|MURPHYDVD|Mx|MYSTIC|NaRaYa|nCRO|NEMESIS|nEO|NESSUNDA|NETWORK|NFO|NhaNc3|NIKAPBDK|NineDragons|Nitrous|Noir|NORDiC|NOTiOS|NOX|nTrO|OCW|Otwieracz|P2P|PARTYBOY|PBDA|PHOCiS|PHOENA|PKF|PLAY|PLEX|PODiUM|POiNT|POISON|pov|PRE|PREMiUM|PRISM|PRoDJi|PROPER|PROVOKE|PSV|Pt|PUKKA|Pure|PYRo|QaFoNE|RAZZ|REAdNFO|REALLY|RECODED|REFiNED|ReleaseLounge|RENTS|REPLICA|REPTiLE|RETAiL|REVEiLLE|RFB|RG|Rio|RMVB|RNT|ROFL|RsL|RSG|RUBY|RUS|rydal|S4A|SAPHiRE|SAZ|SCOrp|ScREEN|SDDAZ|SDE|SDO|SECTOR7|SEEDiG|ShAaNiG|SHITBUSTERS|SHORTBREHD|SiLK|SiNG|SkAzHuTiN|SKiP|Slay3R|SMY|SPARKS|SPiKET|SPOOKS|SQU|SSDD|STUCK|SUBTiTLES|SUNLiGHT|SUPES|SVD|SWAGGERNAUT|SYNDiCATE|T00NG0D|TANTRiC|TBS|TDF|TDRS|TEAM|Tekno|Tenebrous|TFE|THeRe|THuG|TIKO|TimMm|TLF|TmG|ToK|TOPAZ|TRUEFRENCH|TSR|TWiZTED|TyL|uC|UKB5|UNRATED|UPiNSMOKE|UsaBit|URANiME|Vei|VeZ|ViP3R|VOLTAGE|WAWA|WAZ|WeLD|WiM|WOMBAT|WORKPRINT|WPi|WRD|WTF|XPLORE|XSHD|XTiNE|XViD|YAGO|YiFF|YOUNiVERSE|ZENTAROS|ZeaL|Zeus|ZMN|ZONE|ZoNE|ZZGtv|Rets|ARABiC|aXXo|BadTasteRecords|cOOt|DVDScr|FiH|GOM|LAP|LOMO|LUMiX|MbS|MEAPO|NEMOORTV|NoGroup|NwC|ORC|PTNK|REALiTY|SAMPLE|SYNDiCATE|TELESYNC|ToMpDaWg|TS|UnKnOwN|VECTORPDA|VH|ViSiON|Vomit|WRD|x264|XviD|BDRip|1080p|720p)\b/gi, '');
    
    // Remove years in parentheses
    name = name.replace(/\(\d{4}\)/g, '');
    
    // Remove brackets and their contents
    name = name.replace(/\[.*?\]/g, '');
    
    // Replace dots, dashes, underscores with spaces
    name = name.replace(/[._-]/g, ' ');
    
    // Remove extra spaces and trim
    name = name.replace(/\s+/g, ' ').trim();
    
    return name;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const offset = streamOffsetRef.current;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        if (isCompatibleAudio && originalDurationRef.current > 0) {
          setDuration(originalDurationRef.current);
        } else if (offset === 0) {
          originalDurationRef.current = video.duration;
          setDuration(video.duration);
        } else if (!originalDurationRef.current) {
          originalDurationRef.current = offset + video.duration;
          setDuration(originalDurationRef.current);
        }
      }
      setIsLoading(false);
      
      // Set initial time after metadata is loaded
      if (initialTime > 0 && !hasAppliedInitialTime && offset === 0) {
        console.log('Resuming video at:', initialTime + 's');
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
        currentTimeRef.current = initialTime;
        setHasAppliedInitialTime(true);
      }
      
      // Check for saved progress and show resume dialog
      // Only show dialog if no initialTime was provided (auto-resume)
      if (torrentHash && fileIndex !== null && !hasShownResumeDialog && initialTime === 0) {
        const resumeInfo = progressService.shouldResumeVideo(torrentHash, fileIndex);
        if (resumeInfo) {
          console.log('Showing resume dialog for:', resumeInfo);
          setResumeData(resumeInfo);
          setShowResumeDialog(true);
        }
        setHasShownResumeDialog(true);
      }
    };

    const handleTimeUpdate = () => {
      const newTime = streamOffsetRef.current + video.currentTime;
      currentTimeRef.current = newTime;
      setCurrentTime(newTime);
      updateBufferedProgress();
      onTimeUpdate?.(newTime);
      
      // Save progress every 5 seconds
      const totalDuration = originalDurationRef.current || duration;
      if (torrentHash && fileIndex !== null && totalDuration > 0) {
        const now = Date.now();
        if (!video.progressSaveTimer || now - video.progressSaveTimer > 5000) {
          progressService.saveProgress(torrentHash, fileIndex, newTime, totalDuration, title);
          video.progressSaveTimer = now;
        }
      }
    };

    const handleProgress = () => {
      updateBufferedProgress();
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / video.duration) * 100;
        onProgress?.(bufferedPercent);
      }
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      // Only try setting initial time when the video can play if we haven't done it yet
      if (initialTime > 0 && !hasAppliedInitialTime && streamOffsetRef.current === 0 && Math.abs(video.currentTime - initialTime) > 1) {
        console.log('CanPlay: resuming video at:', initialTime + 's');
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
        currentTimeRef.current = initialTime;
        setHasAppliedInitialTime(true);
      }
      video.playbackRate = playbackRate;
      if (pendingPlaybackRef.current) {
        pendingPlaybackRef.current = false;
        video.play().catch(() => {});
      }
    };
    const handleCanPlayThrough = () => setIsLoading(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, [videoSrc, duration, initialTime, onTimeUpdate, onProgress, updateBufferedProgress, torrentHash, fileIndex, title, hasShownResumeDialog, hasAppliedInitialTime, playbackRate, isCompatibleAudio]);

  // Mobile video initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Mobile-specific video event handlers
      const handleLoadStart = () => {
        console.log('Mobile video load started');
        setIsLoading(true);
      };

      const handleCanPlay = () => {
        console.log('Mobile video can play');
        setIsLoading(false);
      };

      const handleWaiting = () => {
        console.log('Mobile video waiting for data');
        setIsLoading(true);
      };

      const handleStalled = () => {
        console.log('Mobile video stalled, retrying...');
        setIsLoading(true);
        // On mobile, try to reload the video source if it stalls
        setTimeout(() => {
          if (video.paused && !isPlaying) {
            video.load();
          }
        }, 2000);
      };

      const handleError = (e) => {
        console.error('Mobile video error:', e);
        setIsLoading(false);
        // Try to recover from error
        setTimeout(() => {
          video.load();
        }, 1000);
      };

      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('stalled', handleStalled);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('stalled', handleStalled);
        video.removeEventListener('error', handleError);
      };
    }
  }, [src, isPlaying]);

  // Fullscreen event listeners for mobile compatibility
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      const isCurrentlyFullscreen = !!fullscreenElement;
      if (isCurrentlyFullscreen) {
        nativeFullscreenActiveRef.current = true;
        fullscreenRequestedRef.current = true;
        setIsFullscreen(true);
        setShowControls(true);
      } else if (nativeFullscreenActiveRef.current) {
        nativeFullscreenActiveRef.current = false;
        fullscreenRequestedRef.current = false;
        setIsFullscreen(false);
      } else if (!fullscreenRequestedRef.current) {
        setIsFullscreen(false);
      }
    };

    // Add event listeners for all browser prefixes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // iOS Safari specific
    const video = videoRef.current;
    const handleNativeVideoFullscreenStart = () => {
      nativeFullscreenActiveRef.current = true;
      fullscreenRequestedRef.current = true;
      setIsFullscreen(true);
    };
    const handleNativeVideoFullscreenEnd = () => {
      nativeFullscreenActiveRef.current = false;
      fullscreenRequestedRef.current = false;
      setIsFullscreen(false);
    };
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleNativeVideoFullscreenStart);
      video.addEventListener('webkitendfullscreen', handleNativeVideoFullscreenEnd);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleNativeVideoFullscreenStart);
        video.removeEventListener('webkitendfullscreen', handleNativeVideoFullscreenEnd);
      }
    };
  }, []);

  // Mobile viewport optimization for fullscreen
  useEffect(() => {
    const optimizeMobileViewport = () => {
      // Ensure viewport meta tag allows user scaling for fullscreen
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
      }
      
      if (isFullscreen) {
        // Optimize for fullscreen - allow zooming and remove address bar
        viewportMeta.content = 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, minimal-ui, viewport-fit=cover';
        
        // Additional mobile Safari optimizations
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // Force viewport recalculation
          window.scrollTo(0, 1);
          setTimeout(() => {
            window.scrollTo(0, 0);
            // Trigger a resize to ensure fullscreen
            window.dispatchEvent(new Event('resize'));
          }, 100);
        }
      } else {
        // Reset viewport for normal viewing
        viewportMeta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
      }
    };

    optimizeMobileViewport();
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [isFullscreen]);

  // Optimized play/pause for mobile and instant streaming
  const togglePlay = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const video = videoRef.current;
        
        // Mobile-specific optimizations
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
          // For mobile devices, ensure we have user interaction before playing
          try {
            // Start loading the video if not already loaded
            if (video.readyState < 2) { // HAVE_CURRENT_DATA
              video.load();
              setIsLoading(true);
              
              // Wait for enough data to start playing
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
                
                const onCanPlay = () => {
                  clearTimeout(timeout);
                  video.removeEventListener('canplay', onCanPlay);
                  video.removeEventListener('error', onError);
                  setIsLoading(false);
                  resolve();
                };
                
                const onError = (e) => {
                  clearTimeout(timeout);
                  video.removeEventListener('canplay', onCanPlay);
                  video.removeEventListener('error', onError);
                  setIsLoading(false);
                  reject(e);
                };
                
                video.addEventListener('canplay', onCanPlay);
                video.addEventListener('error', onError);
              });
            }
            
            // Play with mobile-specific handling
            const playPromise = video.play();
            if (playPromise !== undefined) {
              await playPromise;
              setIsPlaying(true);
            }
          } catch (error) {
            console.warn('Mobile playback failed, trying fallback:', error);
            setIsLoading(false);
            
            // Fallback: simple play attempt
            try {
              await video.play();
              setIsPlaying(true);
            } catch (fallbackError) {
              console.error('Video playback failed:', fallbackError);
              setIsLoading(false);
            }
          }
        } else {
          // Desktop playback with buffering check
          const buffered = video.buffered;
          const currentTime = video.currentTime;
          
          // Check for instant play capability
          let canPlayInstantly = false;
          
          if (buffered.length > 0) {
            for (let i = 0; i < buffered.length; i++) {
              const start = buffered.start(i);
              const end = buffered.end(i);
              
              // Check if current position has any buffered data
              if (start <= currentTime && end > currentTime) {
                // For instant streaming, require minimal buffer (1 second)
                if (end - currentTime >= 1) {
                  canPlayInstantly = true;
                  break;
                }
              }
            }
          }
          
          // Desktop instant play logic
          if (canPlayInstantly || bufferHealth > 30 || instantPlayEnabled) {
            try {
              await video.play();
              setIsPlaying(true);
              setIsLoading(false);
            } catch (playError) {
              console.log('Instant play failed, buffering...', playError);
              setIsLoading(true);
              // Retry after a short buffer
              setTimeout(async () => {
                try {
                  await video.play();
                  setIsPlaying(true);
                  setIsLoading(false);
                } catch (retryError) {
                  console.log('Retry play failed:', retryError);
                  setIsLoading(false);
                }
              }, 1000);
            }
          } else {
            // Show loading state while building initial buffer
            setIsLoading(true);
            console.log('Building buffer for smooth playback...');
            
            // Try to play after minimal buffer is ready
            setTimeout(() => {
              if (videoRef.current && !isPlaying) {
                videoRef.current.play().then(() => {
                  setIsPlaying(true);
                  setIsLoading(false);
                }).catch(() => {
                  setIsLoading(false);
                });
              }
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Toggle play error:', error);
      setIsLoading(false);
    }
  };

  const seekToTime = (targetTime) => {
    const video = videoRef.current;
    if (!video) return;

    const safeTarget = Math.max(0, Math.min(duration || Number.MAX_SAFE_INTEGER, targetTime));
    if (isCompatibleAudio && selectedAudioTrack !== null) {
      startCompatibleAudio(selectedAudioTrack, safeTarget, !video.paused);
    } else {
      video.currentTime = safeTarget;
      currentTimeRef.current = safeTarget;
      setCurrentTime(safeTarget);
    }
  };

  // Resume dialog functions
  const handleResumeVideo = () => {
    if (resumeData) {
      seekToTime(resumeData.currentTime);
      setShowResumeDialog(false);
      setResumeData(null);
    }
  };

  const handleStartFromBeginning = () => {
    if (videoRef.current) {
      seekToTime(0);
      setShowResumeDialog(false);
      setResumeData(null);
    }
  };

  const handleSeek = (e) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    seekToTime(newTime);
  };

  const skip = (seconds) => {
    seekToTime(currentTimeRef.current + seconds);
  };

  const changePlaybackRate = (rate) => {
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = async () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    const isVideoFullscreen = video.webkitDisplayingFullscreen;

    try {
      if (!fullscreenElement && !isVideoFullscreen && !isFullscreen) {
        fullscreenRequestedRef.current = true;
        // Keep our custom controls visible. Native <video> fullscreen hides audio/subtitle menus on TV browsers.
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          container.msRequestFullscreen();
        } else if (!isTvBrowser && video.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        } else {
          setIsFullscreen(true);
          window.scrollTo(0, 1);
        }
        setIsFullscreen(true);
        setShowControls(true);
        requestAnimationFrame(() => container.focus({ preventScroll: true }));
        setTimeout(() => {
          const nativeFullscreen =
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            video.webkitDisplayingFullscreen;
          if (!nativeFullscreen && fullscreenRequestedRef.current) setIsFullscreen(true);
        }, 250);
      } else {
        fullscreenRequestedRef.current = false;
        if (fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (fullscreenElement && document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (isVideoFullscreen && video.webkitExitFullscreen) {
          video.webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn('Fullscreen request failed, using CSS fallback:', error);
      fullscreenRequestedRef.current = !isFullscreen;
      setIsFullscreen(!isFullscreen);
      setShowControls(true);
    }
  };

  // A single touch reveals controls; a double touch toggles fullscreen.
  const handleVideoTap = () => {
    const now = Date.now();
    const tapInterval = 300;
    
    if (now - lastTapTimeRef.current < tapInterval) {
      // Double-tap detected
      tapCountRef.current++;
      if (tapCountRef.current === 2) {
        toggleFullscreen();
        tapCountRef.current = 0;
      }
    } else {
      // Single tap
      tapCountRef.current = 1;
      setTimeout(() => {
        if (tapCountRef.current === 1) {
          if (isTouchDevice) {
            showControlsTemporarily();
          } else {
            togglePlay();
          }
        }
        tapCountRef.current = 0;
      }, tapInterval);
    }
    
    lastTapTimeRef.current = now;
  };

  // Simple toggle function for torrent stats overlay
  const toggleTorrentStats = () => {
    console.log('Toggling torrent stats. Current state:', showTorrentStats);
    setShowTorrentStats(prev => !prev);
  };

  // Subtitle management functions
  const loadSubtitle = async (subtitleFile) => {
    if (!videoRef.current) return;
    
    try {
      // Remove existing subtitle tracks
      const video = videoRef.current;
      const existingTracks = video.querySelectorAll('track');
      existingTracks.forEach(track => track.remove());
      
      if (subtitleFile) {
        // Create new track element
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = subtitleFile.language;
        track.srclang = subtitleFile.language.toLowerCase().substring(0, 2);
        track.src = subtitleFile.url;
        track.default = true;
        
        video.appendChild(track);
        
        // Wait for track to load
        track.addEventListener('load', () => {
          if (video.textTracks.length > 0) {
            video.textTracks[0].mode = subtitlesEnabled ? 'showing' : 'hidden';
          }
        });
        
        setCurrentSubtitle(subtitleFile);
      } else {
        setCurrentSubtitle(null);
      }
      
      setShowSubtitleMenu(false);
    } catch (error) {
      console.error('Error loading subtitle:', error);
    }
  };

  const toggleSubtitles = () => {
    const video = videoRef.current;
    if (video && video.textTracks.length > 0) {
      const newEnabled = !subtitlesEnabled;
      video.textTracks[0].mode = newEnabled ? 'showing' : 'hidden';
      setSubtitlesEnabled(newEnabled);
    }
  };

  const formatTime = (time) => {
    if (!Number.isFinite(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatAudioTrack = (track) => {
    const languages = {
      rus: 'Русский',
      eng: 'Английский',
      kaz: 'Казахский',
      uzb: 'Узбекский',
      und: 'Без языка'
    };
    const parts = [
      languages[track.language] || track.language?.toUpperCase(),
      track.title,
      track.channels ? `${track.channels} каналов` : '',
      track.codec?.toUpperCase()
    ].filter(Boolean);
    return parts.join(' · ') || `Дорожка ${track.audioIndex + 1}`;
  };

  const getTimelinePercent = (time) => {
    if (!duration || Number.isNaN(duration) || duration <= 0) return 0;
    return Math.max(0, Math.min(100, (time / duration) * 100));
  };

  const hideControlsAfterDelay = useCallback(() => {
    clearTimeout(controlsTimeoutRef.current);
    if (showSettings || showSubtitleMenu) return;

    controlsTimeoutRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) setShowControls(false);
    }, isTvBrowser ? 4500 : 3000);
  }, [isTvBrowser, showSettings, showSubtitleMenu]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    hideControlsAfterDelay();
  }, [hideControlsAfterDelay]);

  useEffect(() => {
    if (showSettings || showSubtitleMenu || !isPlaying) {
      clearTimeout(controlsTimeoutRef.current);
      setShowControls(true);
    } else {
      hideControlsAfterDelay();
    }

    return () => clearTimeout(controlsTimeoutRef.current);
  }, [isPlaying, isFullscreen, showSettings, showSubtitleMenu, hideControlsAfterDelay]);

  const handlePlayerKeyDown = (event) => {
    const target = event.target;
    const isInteractive = target instanceof Element && Boolean(target.closest('button, a, input'));
    const isBackKey = ['Escape', 'BrowserBack', 'GoBack'].includes(event.key) || event.keyCode === 461;

    showControlsTemporarily();

    if (isBackKey) {
      event.preventDefault();
      if (showSettings || showSubtitleMenu) {
        setShowSettings(false);
        setShowSubtitleMenu(false);
      } else if (isFullscreen) {
        toggleFullscreen();
      } else if (onClose) {
        onClose();
      }
      return;
    }

    if ((showSettings || showSubtitleMenu) && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const menuSelector = showSettings ? '.settings-dropdown' : '.subtitle-dropdown';
      const focusable = Array.from(
        containerRef.current?.querySelectorAll(`${menuSelector} button:not(:disabled)`) || []
      );
      if (focusable.length > 0) {
        const currentIndex = focusable.indexOf(document.activeElement);
        const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = currentIndex < 0
          ? 0
          : (currentIndex + step + focusable.length) % focusable.length;
        focusable[nextIndex].focus({ preventScroll: true });
      }
      return;
    }

    if (!isInteractive && !showSettings && !showSubtitleMenu) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        skip(-10);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        skip(10);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        containerRef.current?.querySelector('.play-button')?.focus();
      }
    }
  };

  const audioTrackPageCount = Math.max(1, Math.ceil(availableAudioTracks.length / AUDIO_TRACKS_PER_PAGE));
  const visibleAudioTracks = availableAudioTracks.slice(
    audioTrackPage * AUDIO_TRACKS_PER_PAGE,
    (audioTrackPage + 1) * AUDIO_TRACKS_PER_PAGE
  );

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      className={`video-player-container ${isFullscreen ? 'fullscreen' : ''} ${isTvBrowser ? 'tv-mode' : ''} ${(showControls || showSettings || showSubtitleMenu) ? 'controls-visible' : 'controls-hidden'} ${isFullscreen && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ? 'mobile-fullscreen' : ''}`}
      onMouseMove={showControlsTemporarily}
      onPointerDown={showControlsTemporarily}
      onKeyDown={handlePlayerKeyDown}
      onMouseLeave={() => isPlaying && !showSettings && !showSubtitleMenu && setShowControls(false)}
    >
      {/* Close Button - always visible on the right */}
      {onClose && (
        <button 
          className="video-close-button"
          onClick={onClose}
          title="Закрыть видео"
        >
          <X size={24} />
        </button>
      )}
      
      <video
        ref={videoRef}
        src={videoSrc}
        className="video-element"
        onClick={handleVideoTap}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
        webkit-playsinline="true"
        controls={false}
        preload="none"
        crossOrigin="anonymous"
        muted={false}
        autoPlay={false}
        poster=""
      />
      
      {isLoading && (
        <div className="video-loading">
          <Loader2 className="loading-spinner" />
          <span>Буферизация...</span>
        </div>
      )}

      {/* Enhanced Torrent Stats Overlay */}
      {showTorrentStats && torrentHash && (
        <div className="torrent-stats-overlay">
          <div className="stats-header">
            <div className="network-status">
              {networkStatus === 'connected' ? (
                <Wifi className="status-icon connected" size={16} />
              ) : networkStatus === 'seeking' ? (
                <Activity className="status-icon seeking" size={16} />
              ) : (
                <WifiOff className="status-icon disconnected" size={16} />
              )}
              <span className={`status-text ${networkStatus}`}>
                {networkStatus === 'connected' ? 'Подключено' :
                 networkStatus === 'seeking' ? 'Поиск пиров' : 'Нет соединения'}
              </span>
            </div>
            {/* Only overlay minimize button */}
            <button 
              className="stats-minimize"
              onClick={() => {
                console.log('Minimize overlay clicked');
                setShowTorrentStats(false);
              }}
              title="Скрыть статистику торрента"
              aria-label="Скрыть статистику торрента"
            >
              <Minimize2 size={14} />
            </button>
          </div>
          
          <div className="stats-grid">
            <div className="stat-item">
              <Users size={14} />
                <span className="stat-label">Пиры</span>
              <span className="stat-value">{torrentStats.peers}</span>
            </div>
            
            <div className="stat-item">
              <TrendingDown size={14} />
                <span className="stat-label">Загрузка</span>
              <span className="stat-value">
                {(torrentStats.downloadSpeed / 1024 / 1024).toFixed(1)} MB/s
              </span>
            </div>
            
            <div className="stat-item">
              <TrendingUp size={14} />
                <span className="stat-label">Отдача</span>
              <span className="stat-value">
                {(torrentStats.uploadSpeed / 1024 / 1024).toFixed(1)} MB/s
              </span>
            </div>
            
            <div className="stat-item">
              <Download size={14} />
                <span className="stat-label">Прогресс</span>
              <span className="stat-value">{torrentStats.progress.toFixed(1)}%</span>
            </div>
          </div>
          
          {/* Buffer Health Indicator */}
          <div className="buffer-health">
            <div className="buffer-label">Состояние буфера</div>
            <div className="buffer-bar">
              <div 
                className={`buffer-fill ${bufferHealth > 70 ? 'good' : bufferHealth > 30 ? 'medium' : 'poor'}`}
                style={{ width: `${Math.min(100, bufferHealth)}%` }}
              />
            </div>
            <span className="buffer-percentage">{Math.round(bufferHealth)}%</span>
          </div>
        </div>
      )}

      {/* Stats Toggle Button (when hidden) */}
      {!showTorrentStats && torrentHash && (
        <button 
          className="stats-show-button"
          onClick={toggleTorrentStats}
          title="Показать статистику торрента"
          aria-label="Показать статистику торрента"
        >
          <Activity size={16} />
        </button>
      )}

      <div className={`video-controls ${(showControls || showSettings || showSubtitleMenu) ? 'visible' : 'hidden'}`}>
        <div className="controls-background" />
        
        {/* Enhanced Progress Bar with Multiple Buffer Ranges */}
        <div className="progress-container" onClick={handleSeek}>
          <div className="progress-bar">
            {/* Show all buffered ranges */}
            {videoRef.current && videoRef.current.buffered.length > 0 && (
              Array.from({ length: videoRef.current.buffered.length }, (_, i) => {
                const start = (videoRef.current.buffered.start(i) / duration) * 100;
                const end = (videoRef.current.buffered.end(i) / duration) * 100;
                return (
                  <div
                    key={i}
                    className="progress-buffered-range"
                    style={{
                      left: `${start}%`,
                      width: `${end - start}%`
                    }}
                  />
                );
              })
            )}
            
            {/* Overall buffer indicator */}
            <div 
              className="progress-buffered" 
              style={{ width: `${buffered}%` }}
            />
            
            {/* Played progress */}
            <div 
              className="progress-played" 
              style={{ width: `${getTimelinePercent(currentTime)}%` }}
            />
            
            {/* Current position thumb */}
            <div 
              className="progress-thumb"
              style={{ left: `${getTimelinePercent(currentTime)}%` }}
            />
            
            {/* Torrent download progress overlay */}
            {torrentStats.progress > 0 && (
              <div 
                className="progress-torrent"
                style={{ width: `${torrentStats.progress}%` }}
                title={`Торрент загружен: ${torrentStats.progress.toFixed(1)}%`}
              />
            )}
          </div>
          
          {/* Progress time tooltip with enhanced buffer info */}
          <div className="progress-tooltip">
            {formatTime(currentTime)} / {formatTime(duration)}
            {torrentStats.progress > 0 && (
              <span className="torrent-progress-text">
                • Торрент: {torrentStats.progress.toFixed(1)}%
              </span>
            )}
            {bufferVisualization.percentage > 0 && (
              <span className="buffer-status">
                • Буфер: {bufferVisualization.percentage}%
                {bufferVisualization.ahead > 0 && ` (${Math.round(bufferVisualization.ahead)} с вперёд)`}
              </span>
            )}
          </div>
        </div>

        {/* Enhanced Buffer Status Overlay */}
        {(isLoading || (!isPlaying && bufferHealth < 100)) && (
          <div className={`buffer-status-overlay ${(isLoading || (!isPlaying && bufferHealth < 100)) ? 'visible' : ''}`}>
            <div className="buffer-status-title">Буфер видео</div>
            <div className="buffer-status-content">
              <div className="buffer-info-row">
                <span className="buffer-info-label">Уровень буфера:</span>
                <span className="buffer-info-value">{Math.round(bufferHealth)}%</span>
              </div>
              {bufferVisualization.ahead > 0 && (
                <div className="buffer-info-row">
                  <span className="buffer-info-label">Готово вперёд:</span>
                  <span className="buffer-info-value">{Math.round(bufferVisualization.ahead)}s</span>
                </div>
              )}
              <div className="buffer-health-display">
                <div className="buffer-health-label">Состояние буфера</div>
                <div className="buffer-health-bar">
                  <div 
                    className={`buffer-health-fill ${bufferHealth > 70 ? 'good' : bufferHealth > 30 ? 'medium' : 'poor'}`}
                    style={{ width: `${Math.max(bufferHealth, 5)}%` }}
                  />
                </div>
                <div className={`buffer-health-text ${bufferHealth > 70 ? 'good' : bufferHealth > 30 ? 'medium' : 'poor'}`}>
                  {bufferHealth > 70 ? 'Отлично' : bufferHealth > 30 ? 'Нормально' : 'Слабо'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Controls */}
        <div className="controls-main">
          <div className="controls-left">
            <button
              onClick={togglePlay}
              className="control-button play-button"
              title={isPlaying ? 'Пауза' : 'Воспроизвести'}
              aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button
              onClick={() => skip(-10)}
              className="control-button"
              title="Назад на 10 секунд"
              aria-label="Назад на 10 секунд"
            >
              <SkipBack size={20} />
            </button>
            
            <button
              onClick={() => skip(10)}
              className="control-button"
              title="Вперёд на 10 секунд"
              aria-label="Вперёд на 10 секунд"
            >
              <SkipForward size={20} />
            </button>

            <div className="volume-control">
              <button
                onClick={toggleMute}
                className="control-button"
                title={isMuted ? 'Включить звук' : 'Выключить звук'}
                aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>

            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="controls-center">
            <div className="video-title">{title}</div>
          </div>

          <div className="controls-right">
            {/* Subtitle Menu */}
            <div className="subtitle-menu">
              <button 
                onClick={() => {
                  const opening = !showSubtitleMenu;
                  setShowSubtitleMenu(opening);
                  setShowSettings(false);
                  if (opening) {
                    requestAnimationFrame(() => {
                      containerRef.current?.querySelector('.subtitle-dropdown button')?.focus({ preventScroll: true });
                    });
                  }
                }}
                className={`control-button ${currentSubtitle ? 'active' : ''}`}
                title="Субтитры"
              >
                <Subtitles size={20} />
              </button>
              
              {showSubtitleMenu && (
                <div className="subtitle-dropdown">
                  <div className="subtitle-section">
                    <span>Локальные субтитры</span>
                    
                    {/* None option */}
                    <button
                      onClick={() => loadSubtitle(null)}
                      className={`subtitle-option ${!currentSubtitle ? 'active' : ''}`}
                    >
                      <Languages size={16} />
                      Выкл.
                    </button>
                    
                    {/* Available subtitle tracks from torrent */}
                    {availableSubtitles.map((subtitle, index) => (
                      <button
                        key={index}
                        onClick={() => loadSubtitle(subtitle)}
                        className={`subtitle-option ${currentSubtitle?.index === subtitle.index ? 'active' : ''}`}
                      >
                        <Languages size={16} />
                        {subtitle.language}
                      </button>
                    ))}
                    
                    {/* No local subtitles available */}
                    {availableSubtitles.length === 0 && (
                      <div className="no-subtitles">
                        Локальные субтитры не найдены
                      </div>
                    )}
                  </div>

                  {/* Online Subtitle Search */}
                  <div className="subtitle-section">
                    <span>Поиск онлайн</span>
                    
                    {/* Search button */}
                    <button
                      onClick={() => searchOnlineSubtitles(title)}
                      className="subtitle-option search-option"
                      disabled={isSearchingOnline}
                    >
                      {isSearchingOnline ? (
                        <Loader2 size={16} className="spinning" />
                      ) : (
                        <Search size={16} />
                      )}
                      {isSearchingOnline ? 'Идёт поиск...' : 'Искать онлайн'}
                    </button>
                    
                    {/* Online subtitle results */}
                    {onlineSubtitles.map((subtitle, index) => (
                      <button
                        key={`online-${index}`}
                        onClick={() => loadOnlineSubtitle(subtitle)}
                        className={`subtitle-option ${currentSubtitle?.url === subtitle.url ? 'active' : ''}`}
                      >
                        <Globe size={16} />
                        {subtitle.language} ({subtitle.source})
                      </button>
                    ))}
                    
                    {/* No online results message */}
                    {!isSearchingOnline && onlineSubtitles.length === 0 && availableSubtitles.length === 0 && (
                      <div className="no-subtitles">
                        Нажмите «Искать онлайн», чтобы найти субтитры
                      </div>
                    )}
                  </div>
                  
                  {/* Subtitle toggle when track is loaded */}
                  {currentSubtitle && (
                    <div className="subtitle-section">
                      <span>Показ</span>
                      <button
                        onClick={toggleSubtitles}
                        className={`subtitle-option ${subtitlesEnabled ? 'active' : ''}`}
                      >
                        <Subtitles size={16} />
                        {subtitlesEnabled ? 'Скрыть' : 'Показать'} субтитры
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="settings-menu">
              <button 
                onClick={() => {
                  const opening = !showSettings;
                  setShowSettings(opening);
                  setShowSubtitleMenu(false);
                  if (opening) {
                    requestAnimationFrame(() => {
                      const menu = containerRef.current?.querySelector('.settings-dropdown');
                      const selected = menu?.querySelector('.settings-option[aria-pressed="true"]');
                      (selected || menu?.querySelector('button'))?.focus({ preventScroll: true });
                    });
                  }
                }}
                className="control-button"
                title="Настройки аудио и скорости"
                aria-label="Настройки аудио и скорости"
              >
                <Settings size={20} />
              </button>
              
              {showSettings && (
                <div className="settings-dropdown">
                  <div className="settings-section">
                    <span><Languages size={16} /> Аудиодорожка</span>
                    <div className="settings-note">
                      {isCompatibleAudio
                        ? 'Совместимый звук AAC включён'
                        : 'Несовместимый звук будет преобразован в AAC автоматически'}
                    </div>
                    {availableAudioTracks.length > 0 ? visibleAudioTracks.map(track => (
                      <button
                        key={track.audioIndex}
                        onClick={() => selectAudioTrack(track)}
                        className={`settings-option ${selectedAudioTrack === track.audioIndex ? 'active' : ''}`}
                        aria-pressed={selectedAudioTrack === track.audioIndex}
                      >
                        {formatAudioTrack(track)}
                      </button>
                    )) : (
                      <div className="settings-note">{audioTrackError || 'Сканирование дорожек...'}</div>
                    )}
                    {audioTrackPageCount > 1 && (
                      <div className="audio-track-pagination">
                        <button
                          type="button"
                          className="settings-page-button"
                          onClick={() => setAudioTrackPage(page => Math.max(0, page - 1))}
                          disabled={audioTrackPage === 0}
                          title="Предыдущие дорожки"
                          aria-label="Предыдущие дорожки"
                        >
                          <ChevronLeft size={22} />
                        </button>
                        <span>{audioTrackPage + 1} / {audioTrackPageCount}</span>
                        <button
                          type="button"
                          className="settings-page-button"
                          onClick={() => setAudioTrackPage(page => Math.min(audioTrackPageCount - 1, page + 1))}
                          disabled={audioTrackPage >= audioTrackPageCount - 1}
                          title="Следующие дорожки"
                          aria-label="Следующие дорожки"
                        >
                          <ChevronRight size={22} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="settings-section">
                    <span>Скорость воспроизведения</span>
                    <div className="playback-rate-options">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                        <button
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={`settings-option ${playbackRate === rate ? 'active' : ''}`}
                          aria-pressed={playbackRate === rate}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <a 
              href={videoSrc}
              download 
              className="control-button download-button"
              title="Скачать видео"
            >
              <Download size={20} />
            </a>

            <button 
              onClick={toggleFullscreen} 
              className="control-button fullscreen-button"
              title="Во весь экран (или двойное нажатие по видео)"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Resume Dialog */}
      {showResumeDialog && resumeData && (
        <div className="resume-dialog-overlay">
          <div className="resume-dialog">
            <h3>Продолжить просмотр</h3>
            <p>Продолжить с места, где вы остановились?</p>
            <div className="resume-info">
              <div className="resume-time">
                Последняя позиция: {progressService.formatTime(resumeData.currentTime)}
              </div>
              <div className="resume-date">
                {progressService.formatRelativeTime(resumeData.lastWatched)}
              </div>
            </div>
            <div className="resume-actions">
              <button 
                onClick={handleStartFromBeginning}
                className="resume-button secondary"
              >
                С начала
              </button>
              <button 
                onClick={handleResumeVideo}
                className="resume-button primary"
              >
                Продолжить с {progressService.formatTime(resumeData.currentTime)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
