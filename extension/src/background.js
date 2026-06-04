const REQUEST_PATTERNS = ['https://*/*'];

const seenCaptionUrls = new Set();
const seenManifestUrls = new Set();
const pendingMessagesByTab = new Map();

const isDisneyTab = details => {
  if (!details.tabId || details.tabId < 0) return false;

  const source = details.initiator || details.documentUrl || '';
  return source.includes('disneyplus.com');
};

const isDisneyCaptionUrl = url => {
  try {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname.toLowerCase();
    const fullUrl = url.toLowerCase();

    return (
      path.endsWith('.vtt')
      || path.endsWith('.webvtt')
      || path.endsWith('.ttml')
      || (path.endsWith('.xml') && (fullUrl.includes('caption') || fullUrl.includes('subtitle')))
      || fullUrl.includes('/seg_')
      || fullUrl.includes('webvtt')
      || fullUrl.includes('subtitle')
      || fullUrl.includes('caption')
    );
  } catch (_) {
    return false;
  }
};

const isManifestUrl = url => {
  try {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname.toLowerCase();
    const fullUrl = url.toLowerCase();
    return (
      path.endsWith('.m3u8')
      || path.endsWith('.mpd')
      || fullUrl.includes('manifest')
      || fullUrl.includes('playlist')
    );
  } catch (_) {
    return false;
  }
};

const isMasterPlaylistUrl = url => {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return path.includes('/ctr-all-') || path.includes('/complete-') || path.includes('/master');
  } catch (_) {
    return false;
  }
};

const isIgnoredAssetUrl = url => {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\.(png|jpe?g|gif|webp|avif|svg|m4s|mp4|m4a|aac|ac3|ec3|ts)$/i.test(path);
  } catch (_) {
    return false;
  }
};

const isIgnoredRequest = details => {
  return details.type === 'image' || isIgnoredAssetUrl(details.url);
};

const sendDebugMessage = (tabId, text) => {
  sendMessageToTab(tabId, {
    type: 'dc-debug',
    payload: text
  });
};

const guessLanguageFromUrl = url => {
  try {
    const parsedUrl = new URL(url);
    const queryLanguage = parsedUrl.searchParams.get('lang')
      || parsedUrl.searchParams.get('language')
      || parsedUrl.searchParams.get('locale');
    if (queryLanguage) return queryLanguage.toLowerCase();

    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const languagePart = pathParts.find(part => /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i.test(part));
    return languagePart ? languagePart.toLowerCase() : 'unknown';
  } catch (_) {
    return 'unknown';
  }
};

const shortUrl = url => {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.hostname}${parsedUrl.pathname.slice(-70)}`;
  } catch (_) {
    return url.slice(0, 90);
  }
};

const queueMessage = (tabId, message) => {
  if (!tabId || tabId < 0) return;
  const messages = pendingMessagesByTab.get(tabId) || [];
  messages.push(message);
  pendingMessagesByTab.set(tabId, messages);
};

const sendMessageToTab = (tabId, message) => {
  if (!tabId || tabId < 0) return;
  chrome.tabs.sendMessage(tabId, message, response => {
    if (chrome.runtime.lastError || !response || !response.ok) {
      queueMessage(tabId, message);
    }
  });
};

const extractWebVttUrls = (manifestText, manifestUrl) => {
  const urls = new Set();
  const urlPattern = /[^\s"'<>]+\.(?:vtt|webvtt)(?:\?[^\s"'<>]*)?/gi;
  const matches = manifestText.match(urlPattern) || [];

  matches.forEach(match => {
    try {
      urls.add(new URL(match, manifestUrl).href);
    } catch (_) {
      // Ignore malformed manifest references.
    }
  });

  return Array.from(urls);
};

const parseHlsAttributes = line => {
  const attributes = {};
  const attributePattern = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/gi;
  let match = attributePattern.exec(line);

  while (match) {
    const key = match[1].toUpperCase();
    const value = match[2].startsWith('"') && match[2].endsWith('"')
      ? match[2].slice(1, -1)
      : match[2];
    attributes[key] = value;
    match = attributePattern.exec(line);
  }

  return attributes;
};

const extractSubtitleManifestRefs = (manifestText, manifestUrl) => {
  const refs = [];

  manifestText.split('\n').forEach(line => {
    if (!line.includes('#EXT-X-MEDIA') || !line.includes('TYPE=SUBTITLES')) return;

    const attributes = parseHlsAttributes(line);
    if (!attributes.URI || attributes.FORCED === 'YES') return;

    try {
      refs.push({
        url: new URL(attributes.URI, manifestUrl).href,
        language: attributes.LANGUAGE || attributes.NAME || 'unknown'
      });
    } catch (_) {
      // Ignore malformed subtitle playlist references.
    }
  });

  return refs;
};

const extractChildManifestUrls = (manifestText, manifestUrl) => {
  const urls = new Set();
  const uriAttributePattern = /URI="([^"]+)"/gi;
  let match = uriAttributePattern.exec(manifestText);

  while (match) {
    try {
      const childUrl = new URL(match[1], manifestUrl).href;
      if (isManifestUrl(childUrl) || childUrl.toLowerCase().includes('subtitle')) {
        urls.add(childUrl);
      }
    } catch (_) {
      // Ignore malformed manifest references.
    }
    match = uriAttributePattern.exec(manifestText);
  }

  manifestText.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;

    try {
      const childUrl = new URL(trimmedLine, manifestUrl).href;
      if (isManifestUrl(childUrl)) urls.add(childUrl);
    } catch (_) {
      // Ignore non-URL media lines.
    }
  });

  return Array.from(urls);
};

const fetchManifest = async (url, tabId, depth = 0, languageHint = '') => {
  const seenManifestKey = languageHint ? `${languageHint}|${url}` : url;
  if (seenManifestUrls.has(seenManifestKey)) return;
  seenManifestUrls.add(seenManifestKey);

  try {
    sendDebugMessage(tabId, `Checking manifest: ${shortUrl(url)} depth ${depth}`);
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/')) return;

    const text = await response.text();
    const subtitleManifestRefs = extractSubtitleManifestRefs(text, url);
    if (subtitleManifestRefs.length) {
      sendDebugMessage(tabId, `Master found ${subtitleManifestRefs.length} subtitle playlists.`);
      subtitleManifestRefs.forEach(ref => fetchManifest(ref.url, tabId, depth + 1, ref.language));
      return;
    }

    const webVttUrls = extractWebVttUrls(text, url);
    if (webVttUrls.length) {
      sendDebugMessage(tabId, `Manifest found ${webVttUrls.length} WebVTT refs.`);
      webVttUrls.slice(0, 30).forEach(webVttUrl => fetchCaptionSegment(webVttUrl, tabId, languageHint));
      return;
    }

    const childManifestUrls = extractChildManifestUrls(text, url);
    if (childManifestUrls.length && depth < 4) {
      sendDebugMessage(tabId, `Manifest found ${childManifestUrls.length} child manifests.`);
      childManifestUrls.slice(0, 30).forEach(childUrl => fetchManifest(childUrl, tabId, depth + 1, languageHint));
      return;
    }

    if (depth === 0 && isMasterPlaylistUrl(url)) {
      const preview = text.slice(0, 120).replace(/\s+/g, ' ').trim();
      sendDebugMessage(tabId, `Manifest had no subtitle refs: ${shortUrl(url)} ${preview}`);
    }
  } catch (error) {
    sendDebugMessage(tabId, `Could not fetch manifest: ${error.message}`);
  }
};

const fetchCaptionSegment = async (url, tabId, languageHint = '') => {
  if (url.includes('/subtitles_empty/')) return;

  const seenCaptionKey = `${languageHint || 'unknown'}|${url}`;
  if (seenCaptionUrls.has(seenCaptionKey)) return;
  seenCaptionUrls.add(seenCaptionKey);

  try {
    sendDebugMessage(tabId, `Checking subtitle candidate: ${shortUrl(url)}`);
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/')) {
      return;
    }

    const text = await response.text();
    if (!text.trim()) {
      sendDebugMessage(tabId, 'Subtitle-looking response was empty.');
      return;
    }

    if (!text.includes('WEBVTT')) {
      const webVttUrls = extractWebVttUrls(text, url);
      if (webVttUrls.length) {
        sendDebugMessage(tabId, `Candidate contained ${webVttUrls.length} WebVTT refs.`);
        webVttUrls.slice(0, 20).forEach(webVttUrl => fetchCaptionSegment(webVttUrl, tabId, languageHint));
        return;
      }

      const childManifestUrls = extractChildManifestUrls(text, url);
      if (childManifestUrls.length) {
        sendDebugMessage(tabId, `Candidate contained ${childManifestUrls.length} child manifests.`);
        childManifestUrls.slice(0, 20).forEach(childUrl => fetchManifest(childUrl, tabId, 1, languageHint));
        return;
      }

      sendDebugMessage(tabId, `Not WEBVTT: ${shortUrl(url)}`);
      return;
    }

    sendMessageToTab(tabId, {
      type: 'dc-caption-segment',
      payload: {
        url,
        language: languageHint || guessLanguageFromUrl(url),
        text
      }
    });
    sendDebugMessage(tabId, `Fetched WEBVTT segment: ${languageHint || guessLanguageFromUrl(url)} ${shortUrl(url)}`);
  } catch (error) {
    console.warn('Dual Captions: could not fetch Disney+ caption segment.', error);
    sendDebugMessage(tabId, `Could not fetch subtitle candidate: ${error.message}`);
  }
};

chrome.webRequest.onBeforeRequest.addListener(
  details => {
    if (!isDisneyTab(details) || isIgnoredRequest(details)) return;

    if (isManifestUrl(details.url)) {
      fetchManifest(details.url, details.tabId);
      return;
    }

    if (!isDisneyCaptionUrl(details.url)) return;
    fetchCaptionSegment(details.url, details.tabId);
  },
  { urls: REQUEST_PATTERNS }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'dc-get-pending-caption-segments') {
    const tabId = sender.tab && sender.tab.id;
    const messages = pendingMessagesByTab.get(tabId) || [];
    pendingMessagesByTab.delete(tabId);
    sendResponse({ ok: true, messages });
    return true;
  }

  sendResponse({ ok: false });
  return false;
});
