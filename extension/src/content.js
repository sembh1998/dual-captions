(function () {
  const EXTENSION_VERSION = '0.1.31';
  const SETTINGS_KEY = 'dcDisneySettings';
  const DEFAULT_SETTINGS = {
    enabled: true,
    selectedLanguage: '',
    translateEnabled: true,
    firstTargetLanguage: 'de',
    secondTargetLanguage: 'pt-BR',
    firstSize: 1,
    secondSize: 0.82,
    firstColor: '#ffffff',
    secondColor: '#e6e6e6',
    backgroundColor: '#000000',
    backgroundOpacity: 0.72,
    positionLeft: 50,
    positionBottom: 14,
    syncOffsetSeconds: 0,
    settingsCollapsed: false
  };

  const store = new window.DCCaptionStore();
  let settings = { ...DEFAULT_SETTINGS };
  let lastUrl = window.location.href;
  const harvestedTextTrackKeys = new Set();
  const translationCache = new Map();
  const translationFailureCache = new Set();
  const pendingTranslations = new Set();
  const translatorSessions = new Map();
  const translatedCaptionState = {
    key: '',
    text: ''
  };
  let userSelectedSourceLanguage = false;
  let lastRenderStatusAt = 0;
  let lastReadableNetflixCaptionAt = 0;
  let lastReadableNetflixCaptionText = '';
  let translationRequestId = 0;
  let translationBridgeReady = false;
  let wasInPlayback = false;
  let isDraggingCaption = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let isActive = true;
  let animationFrameId = null;
  const intervalIds = [];

  const getCurrentSite = () => {
    if (location.hostname.includes('netflix.com')) return 'netflix';
    if (location.hostname.includes('disneyplus.com')) return 'disneyplus';
    return 'unknown';
  };

  const getSiteLabel = () => (getCurrentSite() === 'netflix' ? 'Netflix' : 'Disney+');

  const getInitialStatus = () => `Waiting for ${getSiteLabel()} captions...`;

  const existingRoot = document.getElementById('dc-disney-root');
  if (existingRoot) existingRoot.remove();

  const hasExtensionContext = () => {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  };

  const stopContentScript = () => {
    isActive = false;
    document.documentElement.classList.remove('dc-hide-netflix-native-captions');
    intervalIds.forEach(intervalId => window.clearInterval(intervalId));
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
  };

  const safeChromeCall = callback => {
    if (!isActive || !hasExtensionContext()) {
      stopContentScript();
      return false;
    }

    try {
      callback();
      return true;
    } catch (error) {
      if (String(error && error.message).includes('Extension context invalidated')) {
        stopContentScript();
        return false;
      }

      throw error;
    }
  };

  const root = document.createElement('div');
  root.id = 'dc-disney-root';
  root.innerHTML = `
    <div id="dc-disney-caption" aria-live="polite">
      <div id="dc-disney-caption-first"></div>
      <div id="dc-disney-caption-second"></div>
    </div>
    <button id="dc-disney-bubble" type="button" title="Open dual captions settings" hidden>DC</button>
    <div id="dc-disney-panel">
      <div class="dc-disney-panel-header">
        <strong>Dual Captions</strong>
        <button id="dc-disney-settings-toggle" type="button">Collapse</button>
      </div>
      <label><input id="dc-disney-enabled" type="checkbox"> Dual captions</label>
      <label>Source <select id="dc-disney-language" aria-label="Source caption language"></select></label>
      <label><input id="dc-disney-translate" type="checkbox"> AI translate</label>
      <label>First
        <select id="dc-disney-first-target-language" aria-label="First caption language">
          <option value="de">Deutsch</option>
          <option value="pt-BR">Português (Brasil)</option>
          <option value="en">English</option>
        </select>
      </label>
      <label>Second
        <select id="dc-disney-second-target-language" aria-label="Second caption language">
          <option value="pt-BR">Português (Brasil)</option>
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </label>
      <div id="dc-disney-settings-advanced">
        <div class="dc-disney-style-grid">
          <span>1st size</span><input id="dc-disney-first-size" type="number" min="0.5" max="2.5" step="0.05">
          <span>1st text</span><input id="dc-disney-first-color" type="color">
          <span>2nd size</span><input id="dc-disney-second-size" type="number" min="0.5" max="2.5" step="0.05">
          <span>2nd text</span><input id="dc-disney-second-color" type="color">
          <span>Bg</span><input id="dc-disney-bg-color" type="color">
          <span>Bg opacity</span><input id="dc-disney-bg-opacity" type="number" min="0" max="1" step="0.05">
        </div>
        <div class="dc-disney-sync-row">
          <input id="dc-disney-sync-time" type="text" placeholder="Show time 1:24:18">
          <button id="dc-disney-sync-button" type="button">Sync</button>
        </div>
        <div id="dc-disney-bridge-status">Bridge: checking...</div>
        <div id="dc-disney-source-status">Source: waiting...</div>
      </div>
      <div id="dc-disney-status">${getInitialStatus()}</div>
      <div id="dc-disney-version">v${EXTENSION_VERSION}</div>
    </div>
  `;
  document.documentElement.appendChild(root);

  const captionEl = root.querySelector('#dc-disney-caption');
  const firstCaptionEl = root.querySelector('#dc-disney-caption-first');
  const secondCaptionEl = root.querySelector('#dc-disney-caption-second');
  const bubbleEl = root.querySelector('#dc-disney-bubble');
  const panelEl = root.querySelector('#dc-disney-panel');
  const settingsToggle = root.querySelector('#dc-disney-settings-toggle');
  const advancedSettingsEl = root.querySelector('#dc-disney-settings-advanced');
  const enabledInput = root.querySelector('#dc-disney-enabled');
  const languageSelect = root.querySelector('#dc-disney-language');
  const translateInput = root.querySelector('#dc-disney-translate');
  const firstTargetLanguageSelect = root.querySelector('#dc-disney-first-target-language');
  const secondTargetLanguageSelect = root.querySelector('#dc-disney-second-target-language');
  const firstSizeInput = root.querySelector('#dc-disney-first-size');
  const secondSizeInput = root.querySelector('#dc-disney-second-size');
  const firstColorInput = root.querySelector('#dc-disney-first-color');
  const secondColorInput = root.querySelector('#dc-disney-second-color');
  const bgColorInput = root.querySelector('#dc-disney-bg-color');
  const bgOpacityInput = root.querySelector('#dc-disney-bg-opacity');
  const syncTimeInput = root.querySelector('#dc-disney-sync-time');
  const syncButton = root.querySelector('#dc-disney-sync-button');
  const bridgeStatusEl = root.querySelector('#dc-disney-bridge-status');
  const sourceStatusEl = root.querySelector('#dc-disney-source-status');
  const statusEl = root.querySelector('#dc-disney-status');

  const saveSettings = () => {
    settings = normalizeSettings(settings);
    safeChromeCall(() => {
      chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    });
  };

  const normalizeSettings = value => ({
    ...DEFAULT_SETTINGS,
    ...(value && typeof value === 'object' ? value : {})
  });

  const normalizeStoredSettings = value => {
    const nextSettings = normalizeSettings(value);
    if (value && value.translationTargetLanguage && !value.firstTargetLanguage) {
      nextSettings.firstTargetLanguage = value.translationTargetLanguage;
    }
    if (value && value.textScale && !value.firstSize) {
      nextSettings.firstSize = value.textScale;
    }
    return nextSettings;
  };

  const hexToRgb = hex => {
    const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000';
    const value = Number.parseInt(normalized.slice(1), 16);
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
  };

  const clampNumber = (value, min, max, fallback) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  };

  const applyCaptionStyles = () => {
    settings.firstSize = clampNumber(settings.firstSize, 0.5, 2.5, DEFAULT_SETTINGS.firstSize);
    settings.secondSize = clampNumber(settings.secondSize, 0.5, 2.5, DEFAULT_SETTINGS.secondSize);
    settings.backgroundOpacity = clampNumber(settings.backgroundOpacity, 0, 1, DEFAULT_SETTINGS.backgroundOpacity);
    settings.positionLeft = clampNumber(settings.positionLeft, 0, 100, DEFAULT_SETTINGS.positionLeft);
    settings.positionBottom = clampNumber(settings.positionBottom, 0, 100, DEFAULT_SETTINGS.positionBottom);

    captionEl.style.left = `${settings.positionLeft}%`;
    captionEl.style.bottom = `${settings.positionBottom}vh`;
    captionEl.style.background = `rgba(${hexToRgb(settings.backgroundColor)}, ${settings.backgroundOpacity})`;
    firstCaptionEl.style.color = settings.firstColor;
    firstCaptionEl.style.fontSize = `${settings.firstSize}em`;
    secondCaptionEl.style.color = settings.secondColor;
    secondCaptionEl.style.fontSize = `${settings.secondSize}em`;
  };

  const applyCollapsedState = () => {
    panelEl.hidden = settings.settingsCollapsed || !wasInPlayback || !!document.fullscreenElement;
    bubbleEl.hidden = !settings.settingsCollapsed || !wasInPlayback || !!document.fullscreenElement;
    advancedSettingsEl.hidden = false;
    settingsToggle.textContent = 'Collapse';
  };

  const setStatus = text => {
    statusEl.textContent = text;
    statusEl.title = text;
  };

  const setBridgeStatus = text => {
    bridgeStatusEl.textContent = text;
    bridgeStatusEl.title = text;
  };

  const setSourceStatus = text => {
    sourceStatusEl.textContent = text;
    sourceStatusEl.title = text;
  };

  const getSegmentDebugInfo = payload => {
    const url = payload && payload.url ? payload.url : 'unknown url';
    const text = payload && payload.text ? payload.text : '';
    const preview = text.slice(0, 160).replace(/\s+/g, ' ').trim();

    try {
      const parsedUrl = new URL(url);
      return `${parsedUrl.hostname}${parsedUrl.pathname.slice(-80)} | ${preview}`;
    } catch (_) {
      return `${url.slice(0, 100)} | ${preview}`;
    }
  };

  const normalizeLanguage = value => {
    if (!value || typeof value !== 'string') return 'unknown';
    return value.trim().toLowerCase().replace(/\s+/g, '-');
  };

  const languagesMatch = (sourceLanguage, targetLanguage) => {
    const source = normalizeLanguage(sourceLanguage);
    const target = normalizeLanguage(targetLanguage);
    return source === target || source.split('-')[0] === target.split('-')[0];
  };

  const getLanguageName = language => {
    switch (normalizeLanguage(language)) {
      case 'de':
        return 'German';
      case 'pt-br':
      case 'pt':
        return 'Brazilian Portuguese';
      case 'en':
        return 'English';
      default:
        return language || 'unknown';
    }
  };

  const cueToText = cue => {
    if (!cue) return '';
    if (typeof cue.text === 'string') return cue.text.trim();

    if (typeof cue.getCueAsHTML === 'function') {
      const fragment = cue.getCueAsHTML();
      return fragment && fragment.textContent ? fragment.textContent.trim() : '';
    }

    return '';
  };

  const normalizeCaptionTextForComparison = text => String(text || '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');

  const collapseRepeatedCaptionLine = line => {
    const trimmedLine = String(line || '').trim();
    const repeatedPhrase = trimmedLine.match(/^(.{2,120}?)([.!?。！？])?\s+\1\2?$/iu);
    return repeatedPhrase ? `${repeatedPhrase[1]}${repeatedPhrase[2] || ''}`.trim() : trimmedLine;
  };

  const dedupeCaptionLines = lines => {
    const seen = new Set();
    return lines.filter(line => {
      const comparisonKey = normalizeCaptionTextForComparison(line);
      if (!comparisonKey || seen.has(comparisonKey)) return false;

      seen.add(comparisonKey);
      return true;
    });
  };

  const cleanSubtitleForTranslation = text => {
    if (!text) return '';

    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !/^\[[^\]]+\]$/.test(line))
      .filter(line => line && !/^\([^)]{1,80}\)$/.test(line))
      .filter(line => line && !/^♪.*♪$/.test(line))
      .map(line => line
        .replace(/\[[^\]]+\]/g, '')
        .replace(/\([^)]{1,80}\)/g, '')
        .replace(/^[-–—]?\s*[A-Z][A-Z\s]{1,24}:\s*/, '')
        .trim())
      .map(collapseRepeatedCaptionLine)
      .filter(Boolean);

    return dedupeCaptionLines(lines).join('\n');
  };

  const parseTimeString = value => {
    if (!value || typeof value !== 'string') return null;

    const match = value.match(/(?:^|\D)(\d{1,2}:\d{2}(?::\d{2})?)(?:\D|$)/);
    if (!match) return null;

    const parts = match[1].split(':').map(Number);
    if (parts.some(part => !Number.isFinite(part))) return null;

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }

    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };

  const formatTime = seconds => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const getDisplayedPlaybackTime = () => {
    const candidates = Array.from(document.querySelectorAll('[aria-valuetext], [aria-label], time, div, span'));
    const values = [];

    candidates.forEach(element => {
      if (root.contains(element)) return;

      [
        element.getAttribute('aria-valuetext'),
        element.getAttribute('aria-label'),
        element.textContent
      ].forEach(value => {
        const seconds = parseTimeString(value || '');
        if (seconds !== null) values.push(seconds);
      });
    });

    if (!values.length) return null;

    // Prefer the largest visible time; duration and current time are often both present,
    // but current time is still much closer than the ad-shifted media element time.
    return Math.max(...values);
  };

  const renderLanguageOptions = () => {
    settings = normalizeSettings(settings);
    const languages = store.getLanguages().filter(language => typeof language === 'string' && language);
    if (getCurrentSite() === 'netflix' && !languages.includes('en')) languages.unshift('en');
    const previousValue = settings.selectedLanguage || '';
    const preferredSourceLanguage = languages.find(language => languagesMatch(language, 'en'));
    languageSelect.innerHTML = '';

    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = languages.length ? 'Choose language' : 'No captions yet';
    languageSelect.appendChild(emptyOption);

    languages.forEach(language => {
      const option = document.createElement('option');
      option.value = language;
      option.textContent = `${language.slice(0, 24)} (${store.getCount(language)})`;
      option.title = `${language} (${store.getCount(language)})`;
      languageSelect.appendChild(option);
    });

    if (!userSelectedSourceLanguage && preferredSourceLanguage && !languagesMatch(previousValue, 'en')) {
      settings.selectedLanguage = preferredSourceLanguage;
      languageSelect.value = settings.selectedLanguage;
      saveSettings();
    } else if (previousValue && languages.includes(previousValue)) {
      languageSelect.value = previousValue;
    } else if (preferredSourceLanguage) {
      settings.selectedLanguage = preferredSourceLanguage;
      languageSelect.value = settings.selectedLanguage;
      saveSettings();
    } else if (!previousValue && languages.length === 1) {
      settings.selectedLanguage = languages[0];
      languageSelect.value = settings.selectedLanguage;
      saveSettings();
    }
  };

  const renderSettings = () => {
    enabledInput.checked = settings.enabled;
    translateInput.checked = settings.translateEnabled;
    firstTargetLanguageSelect.value = settings.firstTargetLanguage;
    secondTargetLanguageSelect.value = settings.secondTargetLanguage;
    firstSizeInput.value = String(settings.firstSize);
    secondSizeInput.value = String(settings.secondSize);
    firstColorInput.value = settings.firstColor;
    secondColorInput.value = settings.secondColor;
    bgColorInput.value = settings.backgroundColor;
    bgOpacityInput.value = String(settings.backgroundOpacity);
    applyCaptionStyles();
    applyCollapsedState();
    renderLanguageOptions();
  };

  const getTranslatorSession = async (sourceLanguage, targetLanguage) => {
    const sessionKey = `${sourceLanguage}|${targetLanguage}`;
    if (translatorSessions.has(sessionKey)) return translatorSessions.get(sessionKey);

    if ('Translator' in window && typeof window.Translator.create === 'function') {
      const session = await window.Translator.create({
        sourceLanguage,
        targetLanguage
      });
      translatorSessions.set(sessionKey, {
        type: 'translator',
        session
      });
      return translatorSessions.get(sessionKey);
    }

    if (window.ai && window.ai.translator && typeof window.ai.translator.create === 'function') {
      const session = await window.ai.translator.create({
        sourceLanguage,
        targetLanguage
      });
      translatorSessions.set(sessionKey, {
        type: 'translator',
        session
      });
      return translatorSessions.get(sessionKey);
    }

    const languageModelFactory = window.LanguageModel || (window.ai && window.ai.languageModel);
    if (languageModelFactory && typeof languageModelFactory.create === 'function') {
      const session = await languageModelFactory.create();
      translatorSessions.set(sessionKey, {
        type: 'prompt',
        session
      });
      return translatorSessions.get(sessionKey);
    }

    throw new Error('Chrome built-in AI translation is not available.');
  };

  const translateCaptionText = async (sourceLanguage, targetLanguage, text) => {
    return translateCaptionTextInPage(sourceLanguage, targetLanguage, text);
  };

  const translateCaptionTextInPage = (sourceLanguage, targetLanguage, text) => {
    return new Promise((resolve, reject) => {
      const id = `dc-translate-${Date.now()}-${translationRequestId += 1}`;
      const timeoutId = window.setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('Page translation timed out.'));
      }, 15000);

      const onMessage = event => {
        if (event.source !== window || !event.data || event.data.type !== 'dc-translate-response' || event.data.id !== id) return;

        window.clearTimeout(timeoutId);
        window.removeEventListener('message', onMessage);

        if (event.data.ok) {
          resolve(event.data.text);
        } else {
          reject(new Error(event.data.error || 'Page translation failed.'));
        }
      };

      window.addEventListener('message', onMessage);
      window.postMessage({
        type: 'dc-translate-request',
        id,
        sourceLanguage,
        targetLanguage,
        text
      }, '*');
    });
  };

  const checkTranslationBridge = () => {
    const id = `dc-ping-${Date.now()}`;
    const timeoutId = window.setTimeout(() => {
      if (!translationBridgeReady) setBridgeStatus('Bridge: not ready');
      window.removeEventListener('message', onMessage);
    }, 3000);

    const onMessage = event => {
      if (event.source !== window || !event.data || event.data.type !== 'dc-translate-pong' || event.data.id !== id) return;

      translationBridgeReady = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener('message', onMessage);
      setBridgeStatus(`Bridge: ready. Translator ${event.data.hasTranslator ? 'yes' : 'no'}, LM ${event.data.hasLanguageModel ? 'yes' : 'no'}`);
    };

    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'dc-translate-ping', id }, '*');
  };

  const requestCaptionTranslation = (sourceLanguage, targetLanguage, text) => {
    if (!text || languagesMatch(sourceLanguage, targetLanguage)) return text;

    const translationKey = `${sourceLanguage}|${targetLanguage}|${text}`;
    if (translationCache.has(translationKey)) return translationCache.get(translationKey);
    if (translationFailureCache.has(translationKey)) return '';
    if (pendingTranslations.has(translationKey)) return translatedCaptionState.key === translationKey ? translatedCaptionState.text : '';

    pendingTranslations.add(translationKey);
    setStatus(`Translating ${sourceLanguage} to ${targetLanguage} with Chrome AI...`);

    translateCaptionText(sourceLanguage, targetLanguage, text)
      .then(translatedText => {
        const cleanText = String(translatedText || '').trim();
        if (cleanText) {
          translationCache.set(translationKey, cleanText);
          translatedCaptionState.key = translationKey;
          translatedCaptionState.text = cleanText;
          setStatus(`Translated ${sourceLanguage} to ${targetLanguage}.`);
        }
      })
      .catch(error => {
        const errorMessage = error && error.message ? error.message : 'unknown error';
        translationFailureCache.add(translationKey);
        setStatus(`AI translation unavailable: ${errorMessage}`);
      })
      .finally(() => {
        pendingTranslations.delete(translationKey);
      });

    return '';
  };

  const getCaptionForTarget = (sourceLanguage, targetLanguage, sourceText, currentTime, preferSourceTranslation) => {
    const targetCaption = preferSourceTranslation
      ? ''
      : store.getCaptionAt(targetLanguage, currentTime) || store.getCaptionAt(normalizeLanguage(targetLanguage), currentTime);

    if (targetCaption) return targetCaption;
    if (!sourceText) return '';
    if (languagesMatch(sourceLanguage, targetLanguage)) return sourceText;
    if (!settings.translateEnabled) return '';

    return requestCaptionTranslation(sourceLanguage, targetLanguage, sourceText);
  };

  const handleCaptionSegment = payload => {
    if (!payload || !payload.text || !payload.url) return;

    try {
      const captions = window.DCDisneyParser.parse(payload.text);
      const language = payload.language || 'unknown';
      store.addSegment(language, payload.url, captions);
      renderLanguageOptions();
      setStatus(`Loaded ${store.getCount(language)} ${language} captions.`);
    } catch (error) {
      const errorMessage = error && error.message ? error.message : 'unknown error';
      const debugInfo = getSegmentDebugInfo(payload);
      console.warn(`Dual Captions: could not parse Disney+ captions. ${errorMessage}. ${debugInfo}`);
      setStatus(`Parser failed: ${errorMessage}. ${debugInfo}`);
    }
  };

  const requestPendingSegments = () => {
    safeChromeCall(() => {
      chrome.runtime.sendMessage({ type: 'dc-get-pending-caption-segments' }, response => {
        if (!isActive || !hasExtensionContext()) {
          stopContentScript();
          return;
        }

        if (chrome.runtime.lastError || !response || !Array.isArray(response.messages)) return;
        response.messages.forEach(message => {
          if (message.type === 'dc-caption-segment') handleCaptionSegment(message.payload);
          if (message.type === 'dc-debug') setStatus(message.payload);
        });
      });
    });
  };

  const getVideo = () => {
    const videos = Array.from(document.querySelectorAll('video')).filter(video => {
      const rect = video.getBoundingClientRect();
      return rect.width > 80 && rect.height > 80 && rect.bottom > 0 && rect.right > 0;
    });
    if (!videos.length) return null;

    return videos.find(video => !video.paused && video.readyState > 0)
      || videos.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return (bRect.width * bRect.height) - (aRect.width * aRect.height);
      })[0]
      || videos.find(video => video.textTracks && video.textTracks.length);
  };

  const isPlaybackRoute = () => {
    if (getCurrentSite() === 'netflix') return /\/watch\//.test(window.location.pathname);
    return /\/play\/|\/video\//.test(window.location.pathname);
  };

  const isPlaybackActive = () => {
    const video = getVideo();
    if (!video) return false;

    const rect = video.getBoundingClientRect();
    const isLargeVideo = rect.width >= window.innerWidth * 0.45 && rect.height >= window.innerHeight * 0.35;
    return isPlaybackRoute() || isLargeVideo || !!(video.duration && video.duration > 60);
  };

  const applyNativeCaptionVisibility = playbackActive => {
    document.documentElement.classList.toggle(
      'dc-hide-netflix-native-captions',
      getCurrentSite() === 'netflix' && playbackActive && settings.enabled
    );
  };

  const isVisibleCaptionElement = element => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const marker = `${element.className || ''} ${element.id || ''} ${element.getAttribute('data-uia') || ''}`.toLowerCase();

    return rect.width > 8
      && rect.height > 6
      && rect.top > window.innerHeight * 0.35
      && rect.bottom <= window.innerHeight
      && style.visibility !== 'hidden'
      && style.display !== 'none'
      && Number(style.opacity || 1) > 0
      && !element.closest('button, [role="button"], [role="menu"], [role="dialog"], [data-uia*="selector"], [data-uia*="menu"]')
      && !marker.includes('button')
      && !marker.includes('menu')
      && !marker.includes('selector');
  };

  const getVisibleNativeCaptionText = () => {
    if (getCurrentSite() === 'netflix') {
      const netflixSelectors = [
        '.player-timedtext span',
        '.player-timedtext-text-container span',
        '.player-timedtext-text-container',
        '.player-timedtext'
      ];

      for (const selector of netflixSelectors) {
        const lines = Array.from(document.querySelectorAll(selector))
          .filter(element => !root.contains(element))
          .filter(isVisibleCaptionElement)
          .map(element => (element.innerText || element.textContent || '').trim())
          .map(collapseRepeatedCaptionLine)
          .filter(Boolean);
        const text = dedupeCaptionLines(lines).join('\n').trim();

        if (text) return text;
      }

      return '';
    }

    const candidates = Array.from(document.querySelectorAll('div, span, p'));
    const viewportHeight = window.innerHeight;

    return candidates
      .filter(element => !root.contains(element))
      .map(element => {
        const text = (element.innerText || element.textContent || '').trim();
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return { element, text, rect, style };
      })
      .filter(item => item.text.length >= 2 && item.text.length <= 260)
      .filter(item => item.rect.width > 40 && item.rect.height > 8)
      .filter(item => item.rect.top > viewportHeight * 0.42 && item.rect.bottom < viewportHeight)
      .filter(item => item.style.visibility !== 'hidden' && item.style.display !== 'none' && Number(item.style.opacity || 1) > 0)
      .filter(item => !/^(source|first|second|dual captions|ai translate|bridge|v\d)/i.test(item.text))
      .filter(item => {
        const marker = `${item.element.className || ''} ${item.element.id || ''} ${item.element.getAttribute('aria-label') || ''}`.toLowerCase();
        return marker.includes('caption')
          || marker.includes('subtitle')
          || marker.includes('timed')
          || marker.includes('text')
          || item.style.textShadow !== 'none'
          || item.style.position === 'absolute'
          || item.style.position === 'fixed';
      })
      .sort((a, b) => {
        const aScore = (a.rect.top / viewportHeight) + (a.style.textShadow !== 'none' ? 1 : 0);
        const bScore = (b.rect.top / viewportHeight) + (b.style.textShadow !== 'none' ? 1 : 0);
        return bScore - aScore;
      })[0]?.text || '';
  };

  const getActiveTextTrackCue = language => {
    const video = getVideo();
    if (!video || !video.textTracks || !video.textTracks.length) return null;

    for (let trackIndex = 0; trackIndex < video.textTracks.length; trackIndex += 1) {
      const track = video.textTracks[trackIndex];
      if (track.mode === 'disabled') continue;

      const trackLanguage = normalizeLanguage(track.language || track.label || `track-${trackIndex + 1}`);
      if (!languagesMatch(trackLanguage, language)) continue;

      const activeCues = track.activeCues;
      if (!activeCues || !activeCues.length) continue;

      const activeCue = Array.from(activeCues).find(cue => cueToText(cue));
      if (activeCue) {
        return {
          startTime: activeCue.startTime,
          endTime: activeCue.endTime,
          language: trackLanguage,
          text: Array.from(activeCues).map(cueToText).filter(Boolean).join('\n')
        };
      }
    }

    return null;
  };

  const harvestTextTracks = () => {
    const video = getVideo();
    if (!video || !video.textTracks || !video.textTracks.length) return;

    for (let trackIndex = 0; trackIndex < video.textTracks.length; trackIndex += 1) {
      const track = video.textTracks[trackIndex];
      const cues = track.cues;
      if (!cues || !cues.length) continue;

      const language = normalizeLanguage(track.language || track.label || `track-${trackIndex + 1}`);
      const captions = [];

      for (let cueIndex = 0; cueIndex < cues.length; cueIndex += 1) {
        const cue = cues[cueIndex];
        const text = cueToText(cue);
        if (!text || !Number.isFinite(cue.startTime) || !Number.isFinite(cue.endTime)) continue;

        captions.push({
          startTime: cue.startTime,
          endTime: cue.endTime,
          text
        });
      }

      if (!captions.length) continue;

      const lastCaption = captions[captions.length - 1];
      const harvestKey = `${language}:${captions.length}:${lastCaption.startTime}:${lastCaption.endTime}`;
      if (harvestedTextTrackKeys.has(harvestKey)) continue;

      harvestedTextTrackKeys.add(harvestKey);
      store.addSegment(language, `texttrack:${harvestKey}`, captions);
      renderLanguageOptions();
      setStatus(`Loaded ${store.getCount(language)} ${language} captions from Disney+ text track.`);
    }
  };

  const renderCaption = () => {
    if (!isActive) return;

    const playbackActive = isPlaybackActive();

    if (!playbackActive) {
      wasInPlayback = false;
      applyNativeCaptionVisibility(false);
      panelEl.hidden = true;
      bubbleEl.hidden = true;
      captionEl.hidden = true;
      animationFrameId = window.requestAnimationFrame(renderCaption);
      return;
    }

    if (!wasInPlayback) {
      wasInPlayback = true;
      if (!settings.selectedLanguage && getCurrentSite() === 'netflix') {
        settings.selectedLanguage = 'en';
        languageSelect.value = 'en';
        saveSettings();
      }
      renderLanguageOptions();
      setStatus(getCurrentSite() === 'netflix'
        ? 'Netflix playback detected. Enable Netflix English subtitles for translation.'
        : `${getSiteLabel()} playback detected. Waiting for captions...`);
      requestPendingSegments();
      harvestTextTracks();
    }

    const now = Date.now();
    const currentSite = getCurrentSite();
    const video = getVideo();
    const shouldRender = settings.enabled && settings.selectedLanguage && video;
    const visibleNativeText = shouldRender ? cleanSubtitleForTranslation(getVisibleNativeCaptionText()) : '';
    const displayedTime = shouldRender && currentSite !== 'netflix' ? getDisplayedPlaybackTime() : null;
    const mediaTime = video ? video.currentTime : 0;
    const currentTime = settings.syncOffsetSeconds
      ? mediaTime + settings.syncOffsetSeconds
      : (displayedTime !== null ? displayedTime : mediaTime);
    const activeSourceCueCandidate = shouldRender ? getActiveTextTrackCue(settings.selectedLanguage) : null;
    const activeSourceCue = activeSourceCueCandidate
      && !settings.syncOffsetSeconds
      && (displayedTime === null || Math.abs(activeSourceCueCandidate.startTime - displayedTime) < 30)
      ? activeSourceCueCandidate
      : null;
    const lookupTime = activeSourceCue ? activeSourceCue.startTime + 0.001 : currentTime;
    const rawSourceText = shouldRender
      ? visibleNativeText || (activeSourceCue && activeSourceCue.text) || store.getCaptionAt(settings.selectedLanguage, lookupTime)
      : '';
    let sourceText = cleanSubtitleForTranslation(rawSourceText);

    if (currentSite === 'netflix') {
      if (sourceText) {
        lastReadableNetflixCaptionAt = now;
        lastReadableNetflixCaptionText = sourceText;
      } else if (now - lastReadableNetflixCaptionAt < 3000) {
        sourceText = lastReadableNetflixCaptionText;
      }
    }

    applyNativeCaptionVisibility(playbackActive && (currentSite !== 'netflix' || now - lastReadableNetflixCaptionAt < 5000));

    const firstText = getCaptionForTarget(settings.selectedLanguage, settings.firstTargetLanguage, sourceText, lookupTime, !!activeSourceCue);
    const secondText = getCaptionForTarget(settings.selectedLanguage, settings.secondTargetLanguage, sourceText, lookupTime, !!activeSourceCue);

    if (sourceText) {
      const preview = sourceText.replace(/\s+/g, ' ').slice(0, 72);
      setSourceStatus(`Source ${settings.selectedLanguage} @ ${formatTime(currentTime)}: ${preview}`);
    }

    firstCaptionEl.textContent = firstText;
    secondCaptionEl.textContent = secondText;
    captionEl.hidden = !firstText && !secondText;
    applyCollapsedState();

    if (!sourceText && shouldRender && now - lastRenderStatusAt > 5000) {
      if (currentSite === 'netflix') {
        if (now - lastReadableNetflixCaptionAt < 25000) {
          animationFrameId = window.requestAnimationFrame(renderCaption);
          return;
        }

        lastRenderStatusAt = now;
        const hasImageCaptionLayer = !!document.querySelector('.image-based-timed-text');
        setSourceStatus(`Source ${settings.selectedLanguage}: enable Netflix English subtitles.`);
        setStatus(hasImageCaptionLayer
          ? 'Netflix subtitles are image-based here; choose a text/native English subtitle track if available.'
          : 'Enable Netflix English subtitles for translation. Set Netflix subtitles to None only after a network parser exists.');
      } else {
        lastRenderStatusAt = now;
        setStatus(`No active ${settings.selectedLanguage} caption at ${Math.floor(currentTime)}s. Loaded ${store.getCount(settings.selectedLanguage)} cues.`);
      }
    }

    animationFrameId = window.requestAnimationFrame(renderCaption);
  };

  const resetForRouteChange = () => {
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;
    applyNativeCaptionVisibility(false);
    store.clear();
    harvestedTextTrackKeys.clear();
    lastReadableNetflixCaptionAt = 0;
    lastReadableNetflixCaptionText = '';
    wasInPlayback = false;
    settings.selectedLanguage = '';
    saveSettings();
    renderLanguageOptions();
    firstCaptionEl.textContent = '';
    secondCaptionEl.textContent = '';
    setStatus(getInitialStatus());
    if (isPlaybackActive()) requestPendingSegments();
  };

  enabledInput.addEventListener('change', () => {
    settings.enabled = enabledInput.checked;
    saveSettings();
  });

  languageSelect.addEventListener('change', () => {
    userSelectedSourceLanguage = true;
    settings.selectedLanguage = languageSelect.value;
    translatedCaptionState.key = '';
    translatedCaptionState.text = '';
    pendingTranslations.clear();
    saveSettings();
  });

  translateInput.addEventListener('change', () => {
    settings.translateEnabled = translateInput.checked;
    translatedCaptionState.key = '';
    translatedCaptionState.text = '';
    pendingTranslations.clear();
    saveSettings();
  });

  firstTargetLanguageSelect.addEventListener('change', () => {
    settings.firstTargetLanguage = firstTargetLanguageSelect.value;
    translatedCaptionState.key = '';
    translatedCaptionState.text = '';
    pendingTranslations.clear();
    saveSettings();
  });

  secondTargetLanguageSelect.addEventListener('change', () => {
    settings.secondTargetLanguage = secondTargetLanguageSelect.value;
    translatedCaptionState.key = '';
    translatedCaptionState.text = '';
    pendingTranslations.clear();
    saveSettings();
  });

  settingsToggle.addEventListener('click', () => {
    settings.settingsCollapsed = true;
    applyCollapsedState();
    saveSettings();
  });

  bubbleEl.addEventListener('click', () => {
    settings.settingsCollapsed = false;
    applyCollapsedState();
    saveSettings();
  });

  syncButton.addEventListener('click', () => {
    const video = getVideo();
    const desiredTime = parseTimeString(syncTimeInput.value);
    if (!video || desiredTime === null) {
      setStatus('Sync failed: enter time like 1:24:18 while video is playing.');
      return;
    }

    settings.syncOffsetSeconds = desiredTime - video.currentTime;
    pendingTranslations.clear();
    translationCache.clear();
    saveSettings();
    setStatus(`Synced subtitles to ${formatTime(desiredTime)}.`);
  });

  const onStyleInputChanged = () => {
    settings.firstSize = Number(firstSizeInput.value);
    settings.secondSize = Number(secondSizeInput.value);
    settings.firstColor = firstColorInput.value;
    settings.secondColor = secondColorInput.value;
    settings.backgroundColor = bgColorInput.value;
    settings.backgroundOpacity = Number(bgOpacityInput.value);
    applyCaptionStyles();
    saveSettings();
  };

  [
    firstSizeInput,
    secondSizeInput,
    firstColorInput,
    secondColorInput,
    bgColorInput,
    bgOpacityInput
  ].forEach(input => {
    input.addEventListener('input', onStyleInputChanged);
  });

  captionEl.addEventListener('pointerdown', event => {
    if (panelEl.hidden) return;

    const rect = captionEl.getBoundingClientRect();
    isDraggingCaption = true;
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    captionEl.setPointerCapture(event.pointerId);
    captionEl.classList.add('dc-disney-caption-dragging');
  });

  captionEl.addEventListener('pointermove', event => {
    if (!isDraggingCaption) return;

    const leftPx = event.clientX - dragOffsetX + captionEl.offsetWidth / 2;
    const bottomPx = window.innerHeight - (event.clientY - dragOffsetY + captionEl.offsetHeight);
    settings.positionLeft = clampNumber((leftPx / window.innerWidth) * 100, 0, 100, DEFAULT_SETTINGS.positionLeft);
    settings.positionBottom = clampNumber((bottomPx / window.innerHeight) * 100, 0, 100, DEFAULT_SETTINGS.positionBottom);
    applyCaptionStyles();
  });

  const stopDraggingCaption = event => {
    if (!isDraggingCaption) return;

    isDraggingCaption = false;
    captionEl.classList.remove('dc-disney-caption-dragging');
    if (event && typeof captionEl.releasePointerCapture === 'function') {
      try {
        captionEl.releasePointerCapture(event.pointerId);
      } catch (_) {
        // Pointer capture may already be released by the browser.
      }
    }
    saveSettings();
  };

  captionEl.addEventListener('pointerup', stopDraggingCaption);
  captionEl.addEventListener('pointercancel', stopDraggingCaption);
  captionEl.addEventListener('lostpointercapture', stopDraggingCaption);

  safeChromeCall(() => {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && message.type === 'dc-caption-segment') {
        handleCaptionSegment(message.payload);
        sendResponse({ ok: true });
        return true;
      }

      if (message && message.type === 'dc-debug') {
        setStatus(message.payload);
        sendResponse({ ok: true });
        return true;
      }

      sendResponse({ ok: false });
      return false;
    });
  });

  safeChromeCall(() => {
    chrome.storage.local.get(SETTINGS_KEY, result => {
      if (!isActive) return;

      settings = normalizeStoredSettings(result && result[SETTINGS_KEY]);
      renderSettings();
      checkTranslationBridge();
      requestPendingSegments();
      harvestTextTracks();
      animationFrameId = window.requestAnimationFrame(renderCaption);
      intervalIds.push(window.setInterval(requestPendingSegments, 1000));
      intervalIds.push(window.setInterval(harvestTextTracks, 1000));
      intervalIds.push(window.setInterval(resetForRouteChange, 1000));
    });
  });
}());
