// Background Service Worker for Edge AI PDF Translator

chrome.runtime.onInstalled.addListener(() => {
  // Set default settings if not already stored
  chrome.storage.local.get(['nvidiaApiKey', 'model', 'targetLang', 'theme', 'autoTranslate'], (res) => {
    const defaults = {};
    if (res.nvidiaApiKey === undefined) defaults.nvidiaApiKey = '';
    if (!res.model) defaults.model = 'nvidia/riva-translate-4b-instruct-v2';
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

// Listen for external messages (e.g., from viewer or popup)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'OPEN_VIEWER') {
    const url = message.fileUrl 
      ? chrome.runtime.getURL(`viewer/viewer.html?file=${encodeURIComponent(message.fileUrl)}`)
      : chrome.runtime.getURL('viewer/viewer.html');
    chrome.tabs.create({ url });
    sendResponse({ success: true });
  }
  return true;
});
