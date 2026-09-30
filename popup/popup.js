// popup.js - Edge AI PDF Translator

document.addEventListener('DOMContentLoaded', async () => {
  const btnOpenViewer = document.getElementById('btnOpenViewer');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const btnToggleKey = document.getElementById('btnToggleKey');
  const btnSaveKey = document.getElementById('btnSaveKey');
  const btnTestKey = document.getElementById('btnTestKey');
  const apiStatus = document.getElementById('apiStatus');
  const testResult = document.getElementById('testResult');

  // Load existing API Key
  chrome.storage.local.get(['nvidiaApiKey'], (res) => {
    if (res.nvidiaApiKey && res.nvidiaApiKey.trim() !== '') {
      apiKeyInput.value = res.nvidiaApiKey;
      updateStatusBadge(true);
    } else {
      updateStatusBadge(false);
    }
  });

  function updateStatusBadge(isReady) {
    if (isReady) {
      apiStatus.textContent = 'Đã sẵn sàng';
      apiStatus.className = 'status-pill status-ready';
    } else {
      apiStatus.textContent = 'Chưa có key';
      apiStatus.className = 'status-pill status-unconfigured';
    }
  }

  // Toggle key visibility
  btnToggleKey.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
    } else {
      apiKeyInput.type = 'password';
    }
  });

  // Save API Key
  btnSaveKey.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    chrome.storage.local.set({ nvidiaApiKey: key }, () => {
      updateStatusBadge(!!key);
      showResult('success', 'Đã lưu API Key thành công!');
    });
  });

  // Test NVIDIA API connection via background worker (avoids CORS)
  btnTestKey.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      showResult('error', 'Vui lòng nhập API Key trước khi kiểm tra!');
      return;
    }

    btnTestKey.disabled = true;
    btnTestKey.textContent = 'Đang thử...';
    testResult.className = 'test-result hidden';

    chrome.runtime.sendMessage({
      action: 'TEST_NVIDIA_API',
      apiKey: key,
      model: 'nvidia/nemotron-3.5-lightning-30b-a3b'
    }, (response) => {
      btnTestKey.disabled = false;
      btnTestKey.textContent = 'Kiểm tra kết nối';

      if (chrome.runtime.lastError) {
        showResult('error', `Lỗi tiện ích: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (!response) {
        showResult('error', 'Không nhận được phản hồi từ tiện ích. Vui lòng tải lại extension.');
        return;
      }

      if (response.success) {
        showResult('success', `Kết nối NVIDIA API thành công! Thử nghiệm: "${response.translation}"`);
        updateStatusBadge(true);
        chrome.storage.local.set({ nvidiaApiKey: key });
      } else {
        showResult('error', `Kết nối thất bại: ${response.error}`);
      }
    });
  });

  function showResult(type, message) {
    testResult.className = `test-result ${type}`;
    testResult.textContent = message;
  }

  // Open Viewer Page
  btnOpenViewer.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('viewer/viewer.html')
    });
  });

  // File Drop / Picker
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Vui lòng chọn một file PDF hợp lệ!');
      return;
    }

    // Save file buffer to IndexedDB or pass to viewer
    const reader = new FileReader();
    reader.onload = async () => {
      // Store temporarily in IndexedDB for the viewer
      await storePdfInDB(file.name, reader.result);
      chrome.tabs.create({
        url: chrome.runtime.getURL('viewer/viewer.html?loadRecent=1')
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // Simple IndexedDB storage for passing large PDF files between popup and viewer
  function storePdfInDB(fileName, arrayBuffer) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EdgeAiPdfDB', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('activeFiles')) {
          db.createObjectStore('activeFiles', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('activeFiles', 'readwrite');
        const store = tx.objectStore('activeFiles');
        store.put({
          id: 'currentPdf',
          name: fileName,
          data: arrayBuffer,
          updatedAt: Date.now()
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }
});
