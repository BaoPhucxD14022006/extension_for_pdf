// Background Service Worker for Edge AI PDF Translator
// Handles settings, tab management, and privileged API calls (bypassing CORS)

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'nvidia/riva-translate-4b-instruct-v2';

chrome.runtime.onInstalled.addListener(() => {
  // Set default settings if not already stored
  chrome.storage.local.get(['nvidiaApiKey', 'model', 'targetLang', 'theme', 'autoTranslate'], (res) => {
    const defaults = {};
    if (res.nvidiaApiKey === undefined) defaults.nvidiaApiKey = '';
    if (!res.model) defaults.model = DEFAULT_MODEL;
    if (!res.targetLang) defaults.targetLang = 'vi';
    if (!res.theme) defaults.theme = 'light';
    if (res.autoTranslate === undefined) defaults.autoTranslate = true;

    if (Object.keys(defaults).length > 0) {
      chrome.storage.local.set(defaults);
    }
  });

  // Create Context Menus
  chrome.contextMenus.create({
    id: 'open_in_ai_pdf_reader',
    title: 'Mở Trình đọc PDF AI (NVIDIA)',
    contexts: ['action']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open_in_ai_pdf_reader') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('viewer/viewer.html')
    });
  }
});

/**
 * Call NVIDIA NIM API
 */
async function callNvidiaApi(apiKey, model, messages, maxTokens = 1024) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    throw new Error('API Key không được để trống.');
  }

  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cleanKey}`
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: messages,
      temperature: 0.1,
      top_p: 0.8,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const errorMsg = errorJson.detail || errorJson.error?.message || errorJson.message || `Lỗi HTTP ${response.status}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Mô hình không trả về nội dung bản dịch.');
  }
  return content;
}

/**
 * Google Translate Fallback
 */
async function callFallbackTranslate(text, targetLang = 'vi') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  const data = await res.json();
  
  let translated = '';
  if (Array.isArray(data) && Array.isArray(data[0])) {
    translated = data[0].map(item => item[0]).join('');
  }
  return translated;
}

// Listen for external messages (e.g., from viewer or popup)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'OPEN_VIEWER') {
    const url = message.fileUrl 
      ? chrome.runtime.getURL(`viewer/viewer.html?file=${encodeURIComponent(message.fileUrl)}`)
      : chrome.runtime.getURL('viewer/viewer.html');
    chrome.tabs.create({ url });
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'TEST_NVIDIA_API') {
    (async () => {
      try {
        const result = await callNvidiaApi(
          message.apiKey,
          message.model || DEFAULT_MODEL,
          [
            {
              role: 'user',
              content: 'Translate the following English word to Vietnamese: "Artificial Intelligence"'
            }
          ],
          60
        );
        sendResponse({ success: true, translation: result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep channel open for async response
  }

  if (message.action === 'TRANSLATE_NVIDIA') {
    (async () => {
      try {
        const languageName = message.targetLang === 'vi' ? 'Vietnamese' : (message.targetLang === 'en' ? 'English' : message.targetLang);
        const prompt = `Translate the following text into natural, accurate ${languageName}. Output only the translation without any explanations or introductory remarks:\n\n${message.text}`;

        const result = await callNvidiaApi(
          message.apiKey,
          message.model || DEFAULT_MODEL,
          [
            {
              role: 'user',
              content: prompt
            }
          ],
          1024
        );

        sendResponse({
          success: true,
          translation: result,
          engine: 'NVIDIA Riva Translate 4B',
          model: message.model || DEFAULT_MODEL
        });
      } catch (err) {
        // Attempt fallback if NVIDIA fails
        try {
          const fallbackResult = await callFallbackTranslate(message.text, message.targetLang || 'vi');
          sendResponse({
            success: true,
            translation: fallbackResult,
            engine: 'Dự phòng (Google Translate)',
            isFallback: true,
            warning: `NVIDIA API lỗi: ${err.message}. Đã chuyển sang bản dịch dự phòng.`
          });
        } catch (fallbackErr) {
          sendResponse({
            success: false,
            error: `NVIDIA: ${err.message}. Dự phòng: ${fallbackErr.message}`
          });
        }
      }
    })();
    return true; // Keep channel open for async response
  }

  if (message.action === 'TRANSLATE_FALLBACK') {
    (async () => {
      try {
        const fallbackResult = await callFallbackTranslate(message.text, message.targetLang || 'vi');
        sendResponse({ success: true, translation: fallbackResult });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  return false;
});
