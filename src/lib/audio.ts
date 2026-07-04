/**
 * Text-to-Speech utility
 * 
 * Uses macOS high-quality voices for the best pronunciation.
 * Falls back to browser default if premium voices aren't available.
 */

// Premium voice names in priority order - these sound much more natural
const PREMIUM_VOICES = [
  "Samantha",    // en-US - Very natural, classic Mac voice
  "Karen",       // en-AU - Excellent quality
  "Daniel",      // en-GB - British male voice
  "Fiona",       // en-GB - British female (Enhanced)
  "Kate",        // en-US - Natural US voice
  "Moira",       // en-IE - Irish voice
  "Veena",       // en-US - US female
  "Alex",        // en-US - Default US male (better than standard)
];

let cachedVoice: SpeechSynthesisVoice | null = null;

function getBestVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // First pass: look for premium voices
  for (const premiumName of PREMIUM_VOICES) {
    const match = voices.find(
      (v) => v.name.includes(premiumName) && v.lang.startsWith("en")
    );
    if (match) {
      cachedVoice = match;
      return match;
    }
  }

  // Second pass: any en-US or en-GB voice
  const englishVoice = voices.find(
    (v) => v.lang.startsWith("en") && v.localService === true
  );
  if (englishVoice) {
    cachedVoice = englishVoice;
    return englishVoice;
  }

  // Last resort: any English voice
  const anyEnglish = voices.find((v) => v.lang.startsWith("en"));
  if (anyEnglish) {
    cachedVoice = anyEnglish;
    return anyEnglish;
  }

  return null;
}

/**
 * Speak a word or phrase using the best available voice
 */
export function speak(text: string, rate: number = 0.85): void {
  if (!text || typeof window === "undefined") return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;

  // Try to get the best voice
  const voice = getBestVoice();
  if (voice) {
    utterance.voice = voice;
  } else {
    // If no voice found yet, try again after voices loaded
    window.speechSynthesis.onvoiceschanged = () => {
      const v = getBestVoice();
      if (v) {
        utterance.voice = v;
        window.speechSynthesis.speak(utterance);
      }
    };
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Speak a single word (slightly slower rate for clarity)
 */
export function speakWord(word: string): void {
  speak(word, 0.8);
}

/**
 * Speak a sentence or paragraph
 */
export function speakText(text: string): void {
  speak(text, 0.85);
}

export default { speak, speakWord, speakText };
