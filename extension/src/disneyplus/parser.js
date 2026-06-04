(function () {
  const htmlEntities = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' '
  };

  const decodeEntities = value => value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    const lowerEntity = entity.toLowerCase();
    if (lowerEntity[0] === '#') {
      const isHex = lowerEntity[1] === 'x';
      const codePoint = Number.parseInt(lowerEntity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    }
    return Object.prototype.hasOwnProperty.call(htmlEntities, lowerEntity) ? htmlEntities[lowerEntity] : '';
  });

  const stripTags = value => decodeEntities(value.replace(/<[^>]*>/g, '')).trim();

  const timeStringToSeconds = value => {
    const trimmed = value.trim();
    const match = trimmed.match(/^(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})$/);
    if (!match) return null;

    const hours = Number(match[1] || 0);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    const milliseconds = Number(match[4]);

    if (minutes > 59 || seconds > 59) return null;
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  };

  const parseCueTiming = line => {
    const parts = line.split('-->');
    if (parts.length !== 2) return null;

    const startTime = timeStringToSeconds(parts[0]);
    const endTime = timeStringToSeconds(parts[1].trim().split(/\s+/)[0]);
    if (startTime === null || endTime === null || endTime <= startTime) return null;

    return { startTime, endTime };
  };

  const parseDisneyPlusVtt = captionFile => {
    if (typeof captionFile !== 'string' || !captionFile.trim()) {
      throw new Error('Disney+ parser expected non-empty VTT text.');
    }

    const normalizedFile = captionFile.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trimEnd();
    const lines = normalizedFile.split('\n');
    if (!lines[0] || !lines[0].includes('WEBVTT')) {
      throw new Error('Disney+ parser expected WEBVTT header.');
    }

    const captions = [];
    let index = 1;

    while (index < lines.length) {
      let line = lines[index].trim();

      if (!line) {
        index += 1;
        continue;
      }

      if (line.startsWith('STYLE') || line.startsWith('NOTE') || line.startsWith('REGION')) {
        index += 1;
        while (index < lines.length && lines[index].trim()) index += 1;
        continue;
      }

      if (!line.includes('-->') && index + 1 < lines.length && lines[index + 1].includes('-->')) {
        index += 1;
        line = lines[index].trim();
      }

      if (!line.includes('-->')) {
        index += 1;
        continue;
      }

      const timing = parseCueTiming(line);
      if (!timing) {
        throw new Error(`Disney+ parser could not parse cue timing: ${line}`);
      }

      index += 1;
      const textLines = [];
      while (index < lines.length && lines[index].trim()) {
        const text = stripTags(lines[index]);
        if (text) textLines.push(text);
        index += 1;
      }

      if (textLines.length) {
        captions.push({
          startTime: timing.startTime,
          endTime: timing.endTime,
          text: textLines.join('\n')
        });
      }
    }

    return captions;
  };

  window.DCDisneyParser = {
    parse: parseDisneyPlusVtt,
    timeStringToSeconds
  };
}());
