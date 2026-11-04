/**
 * src/ui/speech.js
 * Web Speech API session manager for page 888.
 * DOM-only module.
 *
 * Exposes:
 *   startSpeech(onUpdate)  — starts continuous recognition, calls onUpdate(lines[])
 *   stopSpeech()           — stops recognition
 *   isSpeechSupported()    — true if SpeechRecognition available
 */

const SpeechRecognition =
  window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;

/** @type {SpeechRecognition|null} */
let _rec = null;

/** Accumulated final transcript lines. */
let _lines = [];

/** Max lines to keep in memory (older are dropped). */
const MAX_LINES = 40;

/**
 * Whether the browser supports the Web Speech API.
 */
export function isSpeechSupported() {
  return SpeechRecognition !== null;
}

/**
 * Start speech recognition.
 *
 * @param {(lines: string[]) => void} onUpdate  Called on each result.
 */
export function startSpeech(onUpdate) {
  if (!SpeechRecognition) return;
  stopSpeech(); // ensure clean state

  _lines = [];
  _rec   = new SpeechRecognition();
  _rec.continuous      = true;
  _rec.interimResults  = true;
  _rec.lang            = 'en-US';
  _rec.maxAlternatives = 1;

  _rec.onresult = (event) => {
    // Rebuild transcript from all results.
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        _lines.push(transcript.trim());
        if (_lines.length > MAX_LINES) _lines.shift();
      } else {
        interim = transcript;
      }
    }
    // Report finalised lines + current interim as last entry.
    const snapshot = interim
      ? [..._lines, `\u25B6 ${interim}`]
      : [..._lines];
    onUpdate(snapshot);
  };

  _rec.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      stopSpeech();
      onUpdate(['MICROPHONE PERMISSION DENIED.', 'ALLOW MIC ACCESS AND REVISIT P888.']);
    }
  };

  // Auto-restart on end (browser often stops after silence).
  _rec.onend = () => {
    if (_rec) {
      try { _rec.start(); } catch { /* already stopped */ }
    }
  };

  try {
    _rec.start();
  } catch {
    _rec = null;
  }
}

/**
 * Stop speech recognition immediately.
 */
export function stopSpeech() {
  if (_rec) {
    _rec.onend = null; // prevent auto-restart
    try { _rec.stop(); } catch { /* ignore */ }
    _rec   = null;
    _lines = [];
  }
}

/**
 * Whether recognition is currently active.
 */
export function isSpeechActive() {
  return _rec !== null;
}
