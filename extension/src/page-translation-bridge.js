(function () {
  if (window.__dcDisneyTranslateBridgeInstalled) return;

  window.__dcDisneyTranslateBridgeInstalled = true;
  const sessions = new Map();

  const getSession = async (sourceLanguage, targetLanguage) => {
    const key = `${sourceLanguage}|${targetLanguage}`;
    if (sessions.has(key)) return sessions.get(key);

    if (window.Translator && typeof window.Translator.create === 'function') {
      const session = await window.Translator.create({ sourceLanguage, targetLanguage });
      sessions.set(key, { type: 'translator', session });
      return sessions.get(key);
    }

    const languageModelFactory = window.LanguageModel || (window.ai && window.ai.languageModel);
    if (languageModelFactory && typeof languageModelFactory.create === 'function') {
      const session = await languageModelFactory.create();
      sessions.set(key, { type: 'prompt', session });
      return sessions.get(key);
    }

    throw new Error('No page-level Chrome AI translation API is available.');
  };

  window.addEventListener('message', async event => {
    if (event.source === window && event.data && event.data.type === 'dc-translate-ping') {
      window.postMessage({
        type: 'dc-translate-pong',
        id: event.data.id,
        hasTranslator: !!(window.Translator && typeof window.Translator.create === 'function'),
        hasLanguageModel: !!((window.LanguageModel && typeof window.LanguageModel.create === 'function') || (window.ai && window.ai.languageModel && typeof window.ai.languageModel.create === 'function'))
      }, '*');
      return;
    }

    if (event.source !== window || !event.data || event.data.type !== 'dc-translate-request') return;

    const { id, sourceLanguage, targetLanguage, text } = event.data;
    try {
      const sessionInfo = await getSession(sourceLanguage, targetLanguage);
      let translatedText = '';

      if (sessionInfo.type === 'translator') {
        translatedText = await sessionInfo.session.translate(text);
      } else {
        translatedText = await sessionInfo.session.prompt([
          `Translate this subtitle from ${sourceLanguage} to ${targetLanguage}.`,
          'Return only the translated subtitle text. Preserve line breaks. Do not add explanations.',
          '',
          text
        ].join('\n'));
      }

      window.postMessage({
        type: 'dc-translate-response',
        id,
        ok: true,
        text: String(translatedText || '').trim()
      }, '*');
    } catch (error) {
      window.postMessage({
        type: 'dc-translate-response',
        id,
        ok: false,
        error: error && error.message ? error.message : String(error)
      }, '*');
    }
  });
}());
