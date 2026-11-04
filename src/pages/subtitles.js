/**
 * src/pages/subtitles.js
 * Page 888 — Live Speech Captions.
 *
 * The builder is purely a data → Page function.
 * Speech recognition lifecycle is handled by src/ui/speech.js.
 *
 * ctx.captions: string[] — latest recognised lines (newest last).
 * ctx.speechSupported: boolean — false shows fallback message.
 */

import { blankPage, writeText } from '../teletext/grid.js';
import { wrapText } from '../teletext/wrap.js';
import { registerPage } from '../teletext/router.js';
import { applyHeader, applyFastext } from './_builder.js';

export const numbers = [888];

const FASTEXT = {
  red:    { label: 'INDEX',  page: 100 },
  green:  { label: 'GHOST',  page: 666 },
  yellow: { label: 'WRITER', page: 700 },
  cyan:   { label: 'HELP',   page: 199 },
};

/** Caption display area: rows 4–21 (18 rows). */
const CAP_START = 4;
const CAP_END   = 21;
const CAP_WIDTH = 38;

/**
 * @param {any}    _data  unused
 * @param {object} [ctx]
 * @param {string[]} [ctx.captions=[]]      Latest caption lines.
 * @param {boolean}  [ctx.speechSupported=true]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function build(_data, ctx = {}) {
  const now              = ctx.now             ?? new Date();
  const captions         = ctx.captions        ?? [];
  const speechSupported  = ctx.speechSupported ?? true;

  const page = blankPage(888);
  applyHeader(page, now);

  // Row 1: section header.
  writeText(page, 1, 0, 'P888 LIVE SUBTITLES', { fg: 'white', bg: 'cyan' });
  writeText(page, 1, 19, '                     ', { fg: 'white', bg: 'cyan' });

  if (!speechSupported) {
    // Fallback message.
    writeText(page, 4,  1, 'SPEECH RECOGNITION IS NOT', { fg: 'yellow', bg: 'black' });
    writeText(page, 5,  1, 'SUPPORTED IN THIS BROWSER.',  { fg: 'yellow', bg: 'black' });
    writeText(page, 7,  1, 'TRY GOOGLE CHROME OR',        { fg: 'white',  bg: 'black' });
    writeText(page, 8,  1, 'MICROSOFT EDGE FOR LIVE',     { fg: 'white',  bg: 'black' });
    writeText(page, 9,  1, 'CAPTION SUPPORT.',            { fg: 'white',  bg: 'black' });
    writeText(page, 11, 1, 'MICROPHONE PERMISSION MAY',   { fg: 'white',  bg: 'black' });
    writeText(page, 12, 1, 'ALSO BE REQUIRED.',           { fg: 'white',  bg: 'black' });
    applyFastext(page, FASTEXT);
    return [page];
  }

  if (captions.length === 0 && ctx.speechActive === false) {
    writeText(page, 4, 1, 'TELETEXT SUBTITLES, RESURRECTED.', { fg: 'cyan', bg: 'black' });
    writeText(page, 6, 1, 'PRESS START SUBS ON THE REMOTE AND', { fg: 'white', bg: 'black' });
    writeText(page, 7, 1, 'ANYTHING SAID NEAR YOUR MIC APPEARS', { fg: 'white', bg: 'black' });
    writeText(page, 8, 1, 'HERE AS LIVE CAPTIONS.', { fg: 'white', bg: 'black' });
    writeText(page, 10, 1, 'FOR LECTURES, CALLS AND TV WITH NO', { fg: 'yellow', bg: 'black' });
    writeText(page, 11, 1, 'SUBTITLES OF ITS OWN.', { fg: 'yellow', bg: 'black' });
    applyFastext(page, FASTEXT);
    return [page];
  }

  if (captions.length === 0) {
    writeText(page, 4, 1, 'LISTENING...', { fg: 'cyan', bg: 'black' });
    writeText(page, 6, 1, 'SPEAK CLEARLY INTO YOUR', { fg: 'white', bg: 'black' });
    writeText(page, 7, 1, 'MICROPHONE.', { fg: 'white', bg: 'black' });
    applyFastext(page, FASTEXT);
    return [page];
  }

  // Wrap all captions and collect lines.
  const allLines = [];
  for (const caption of captions) {
    const wrapped = wrapText(caption, CAP_WIDTH);
    allLines.push(...wrapped);
  }

  // Show the most recent lines that fit in the caption area.
  const maxLines  = CAP_END - CAP_START + 1;
  const visible   = allLines.slice(-maxLines);

  for (let i = 0; i < visible.length; i++) {
    const row = CAP_START + i;
    writeText(page, row, 1, visible[i].slice(0, CAP_WIDTH), { fg: 'white', bg: 'black' });
  }

  // Row 22: status.
  writeText(page, 22, 1, '* LIVE * PRESS STOP SUBS TO END', { fg: 'cyan', bg: 'black' });

  applyFastext(page, FASTEXT);

  return [page];
}

export const sample = undefined; // no external data

registerPage(888, (_data, ctx) => Promise.resolve(build(_data, ctx)));
