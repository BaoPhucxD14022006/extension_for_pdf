// translate.js - Translation service for Edge AI PDF Reader
// Powered by NVIDIA Riva Translate (nvidia/riva-translate-4b-instruct-v2)

class TranslationService {
  constructor() {
    this.apiUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
    this.defaultModel = 'nvidia/riva-translate-4b-instruct-v2';
  }

  /**
   * Cleans text copied from PDF:
   * - Glues hyphenated line breaks (e.g. "con- \n dition" -> "condition")
   * - Glues single newlines inside sentences into spaces
   * - Preserves double newlines (paragraphs)
   */
  cleanPdfText(rawText) {
    if (!rawText) return '';
    return rawText
      // Replace hyphen at end of line (e.g. "inter-\nnational" -> "international")
      .replace(/(\w+)-\s*[\r\n]+\s*(\w+)/g, '$1$2')
      // Replace single newline with space (unless followed by bullet or numbered item)
      .replace(/([^\r\n])\r?\n([^\r\n])/g, (match, p1, p2) => {
        // If p2 starts with bullet or number like "1." or "-", keep newline
        if (/^[\-\*\•\d]\.?\s/.test(p2)) {
          return `${p1}\n${p2}`;
        }
        return `${p1} ${p2}`;
      })
      // Clean up multiple spaces
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * Retrieves configured settings from chrome.storage.local or localStorage
   */
  async getSettings() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['nvidiaApiKey', 'model', 'targetLang'], (res) => {
          resolve({
            apiKey: res.nvidiaApiKey || '',
            model: res.model || this.defaultModel,
            targetLang: res.targetLang || 'vi'
          });
        });
      } else {
        resolve({
          apiKey: localStorage.getItem('nvidiaApiKey') || '',
          model: localStorage.getItem('nvidiaModel') || this.defaultModel,
          targetLang: localStorage.getItem('targetLang') || 'vi'
        });
      }
    });
  }

  /**
   * Translates text using NVIDIA Riva Translate model
   */
  async translate(text, targetLang = 'vi') {
    const cleanedText = this.cleanPdfText(text);
    if (!cleanedText) return { text: '', source: 'empty' };

    const settings = await this.getSettings();
    const apiKey = settings.apiKey.trim();

    if (!apiKey) {
      // Fallback: If no API key is provided, use Google Translate public endpoint with clear notice
      return this.fallbackTranslate(cleanedText, targetLang);
    }

    try {
      const languageName = targetLang === 'vi' ? 'Vietnamese' : (targetLang === 'en' ? 'English' : targetLang);
      
      const prompt = `Translate the following text into natural, accurate ${languageName}. Output only the translation without any explanations or introductory remarks:\n\n${cleanedText}`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: settings.model || this.defaultModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          top_p: 0.8,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const errorMsg = errorJson.detail || errorJson.message || `Lỗi NVIDIA API (HTTP ${response.status})`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const translation = data.choices?.[0]?.message?.content?.trim() || '';

      return {
        text: translation,
        cleanedOriginal: cleanedText,
        engine: 'NVIDIA Riva Translate',
        model: settings.model || this.defaultModel
      };
    } catch (err) {
      console.warn('NVIDIA API call failed, falling back to backup translator:', err);
      const fallback = await this.fallbackTranslate(cleanedText, targetLang);
      fallback.warning = `NVIDIA API: ${err.message}. Đã chuyển sang bản dịch dự phòng.`;
      return fallback;
    }
  }

  /**
   * Fallback translator (Google web endpoint) in case NVIDIA key is missing or quota exceeded
   */
  async fallbackTranslate(text, targetLang = 'vi') {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      
      let translated = '';
      if (Array.isArray(data) && Array.isArray(data[0])) {
        translated = data[0].map(item => item[0]).join('');
      }

      return {
        text: translated,
        cleanedOriginal: text,
        engine: 'Dự phòng (Google Translate)',
        isFallback: true
      };
    } catch (err) {
      return {
        text: 'Không thể kết nối dịch thuật. Vui lòng kiểm tra lại mạng hoặc API Key.',
        cleanedOriginal: text,
        error: err.message
      };
    }
  }

  /**
   * Text-to-Speech using native Web Speech API
   */
  speak(text, lang = 'en-US') {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
}

// Global instance
window.translationService = new TranslationService();
