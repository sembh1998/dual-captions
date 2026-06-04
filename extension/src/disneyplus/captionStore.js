(function () {
  const makeCaptionKey = caption => `${caption.startTime}|${caption.endTime}|${caption.text}`;

  class CaptionStore {
    constructor() {
      this.captionsByLanguage = new Map();
      this.processedUrls = new Set();
    }

    addSegment(language, url, captions) {
      const processedKey = `${language}|${url}`;
      if (!language || !url || this.processedUrls.has(processedKey) || !Array.isArray(captions)) {
        return this.getLanguages();
      }

      this.processedUrls.add(processedKey);
      const currentCaptions = this.captionsByLanguage.get(language) || [];
      const captionMap = new Map(currentCaptions.map(caption => [makeCaptionKey(caption), caption]));

      captions.forEach(caption => {
        if (caption && Number.isFinite(caption.startTime) && Number.isFinite(caption.endTime) && caption.text) {
          captionMap.set(makeCaptionKey(caption), caption);
        }
      });

      const mergedCaptions = Array.from(captionMap.values()).sort((a, b) => {
        if (a.startTime !== b.startTime) return a.startTime - b.startTime;
        return a.endTime - b.endTime;
      });

      this.captionsByLanguage.set(language, mergedCaptions);
      return this.getLanguages();
    }

    getLanguages() {
      return Array.from(this.captionsByLanguage.keys()).sort();
    }

    getCaptionAt(language, currentTime) {
      const captions = this.captionsByLanguage.get(language) || [];
      const caption = captions.find(item => item.startTime <= currentTime && currentTime <= item.endTime);
      return caption ? caption.text : '';
    }

    getCount(language) {
      return (this.captionsByLanguage.get(language) || []).length;
    }

    clear() {
      this.captionsByLanguage.clear();
      this.processedUrls.clear();
    }
  }

  window.DCCaptionStore = CaptionStore;
}());
