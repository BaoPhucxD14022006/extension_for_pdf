// viewer.js - Core application logic for Edge AI PDF Reader & Translator

// Set PDF.js worker path
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
}

class EdgeAiPdfViewer {
  constructor() {
    this.pdfDoc = null;
    this.pdfViewer = null;
    this.pdfLinkService = null;
    this.pdfFindController = null;
    this.eventBus = null;

    this.currentDocId = 'untitled';
    this.currentDocName = 'Document.pdf';
    this.originalPdfBytes = null;
    
    this.currentPage = 1;
    this.totalPages = 0;
    this.currentScale = 1.0;
    this.rotation = 0;
    this.currentColor = '#fef08a'; // Default Yellow
    this.autoTranslate = true;
    this.currentTheme = 'light';
    this.targetLang = 'vi';

    // In-memory list of annotations for the current PDF
    this.annotations = [];

    // Current selection tracking
    this.activeSelection = null;
    this.currentCardData = null;

    this.initDOMElements();
    this.initEventListeners();
    this.initPdfViewerInstance();
    this.loadSettings();
    this.checkInitialFileLoad();
  }

  initDOMElements() {
    this.dom = {
      appContainer: document.getElementById('appContainer'),
      viewerContainer: document.getElementById('viewerContainer'),
      viewer: document.getElementById('viewer'),
      welcomeScreen: document.getElementById('welcomeScreen'),
      btnWelcomeOpen: document.getElementById('btnWelcomeOpen'),
      btnWelcomeSample: document.getElementById('btnWelcomeSample'),
      
      // Toolbar
      docTitle: document.getElementById('docTitle'),
      btnToggleSidebar: document.getElementById('btnToggleSidebar'),
      sidebar: document.getElementById('sidebar'),
      annotationCountBadge: document.getElementById('annotationCountBadge'),
      
      btnPrevPage: document.getElementById('btnPrevPage'),
      btnNextPage: document.getElementById('btnNextPage'),
      pageNumberInput: document.getElementById('pageNumberInput'),
      totalPagesCount: document.getElementById('totalPagesCount'),
      
      btnZoomIn: document.getElementById('btnZoomIn'),
      btnZoomOut: document.getElementById('btnZoomOut'),
      zoomSelector: document.getElementById('zoomSelector'),
      btnRotate: document.getElementById('btnRotate'),
      
      btnHighlightTool: document.getElementById('btnHighlightTool'),
      activeColorDot: document.getElementById('activeColorDot'),
      colorDropdown: document.getElementById('colorDropdown'),
      
      btnSearch: document.getElementById('btnSearch'),
      searchBar: document.getElementById('searchBar'),
      findInput: document.getElementById('findInput'),
      findResultsCount: document.getElementById('findResultsCount'),
      btnFindPrev: document.getElementById('btnFindPrev'),
      btnFindNext: document.getElementById('btnFindNext'),
      btnCloseSearch: document.getElementById('btnCloseSearch'),
      
      btnTheme: document.getElementById('btnTheme'),
      btnExport: document.getElementById('btnExport'),
      exportDropdownWrapper: document.querySelector('.export-dropdown-wrapper'),
      menuExportPdf: document.getElementById('menuExportPdf'),
      menuExportVocabMd: document.getElementById('menuExportVocabMd'),
      menuExportVocabAnki: document.getElementById('menuExportVocabAnki'),
      
      btnOpenFile: document.getElementById('btnOpenFile'),
      pdfFileInput: document.getElementById('pdfFileInput'),
      
      // Sidebar Panels
      tabButtons: document.querySelectorAll('.sidebar-tabs .tab-btn'),
      tabPanels: document.querySelectorAll('.sidebar-content .tab-panel'),
      annotationsList: document.getElementById('annotationsList'),
      annotationSearchInput: document.getElementById('annotationSearchInput'),
      outlineView: document.getElementById('outlineView'),
      
      // Settings in sidebar
      settingApiKey: document.getElementById('settingApiKey'),
      btnToggleSettingKey: document.getElementById('btnToggleSettingKey'),
      settingModel: document.getElementById('settingModel'),
      settingTargetLang: document.getElementById('settingTargetLang'),
      settingAutoTranslate: document.getElementById('settingAutoTranslate'),
      btnSaveSettings: document.getElementById('btnSaveSettings'),
      btnTestApiSidebar: document.getElementById('btnTestApiSidebar'),
      sidebarTestResult: document.getElementById('sidebarTestResult'),
      
      // Floating Bubble & Translation Card
      floatingActionBubble: document.getElementById('floatingActionBubble'),
      bubbleBtnTranslate: document.getElementById('bubbleBtnTranslate'),
      bubbleColors: document.querySelectorAll('.bubble-color-btn'),
      bubbleBtnNote: document.getElementById('bubbleBtnNote'),
      bubbleBtnSpeak: document.getElementById('bubbleBtnSpeak'),
      bubbleBtnCopy: document.getElementById('bubbleBtnCopy'),
      
      translationCard: document.getElementById('translationCard'),
      transLoading: document.getElementById('transLoading'),
      transResultWrapper: document.getElementById('transResultWrapper'),
      transOriginalSnippet: document.getElementById('transOriginalSnippet'),
      transResultText: document.getElementById('transResultText'),
      transEngineLabel: document.getElementById('transEngineLabel'),
      cardBtnSpeakOriginal: document.getElementById('cardBtnSpeakOriginal'),
      cardBtnCopyTrans: document.getElementById('cardBtnCopyTrans'),
      cardBtnClose: document.getElementById('cardBtnClose'),
      cardBtnSaveVocab: document.getElementById('cardBtnSaveVocab'),
      cardBtnAddNote: document.getElementById('cardBtnAddNote'),
      
      // Note Modal
      noteModal: document.getElementById('noteModal'),
      noteQuotedText: document.getElementById('noteQuotedText'),
      noteInput: document.getElementById('noteInput'),
      btnCloseNoteModal: document.getElementById('btnCloseNoteModal'),
      btnSaveNote: document.getElementById('btnSaveNote'),
      btnDeleteNote: document.getElementById('btnDeleteNote'),
      
      // Highlight Hover Card
      highlightHoverCard: document.getElementById('highlightHoverCard'),
      hoverTransText: document.getElementById('hoverTransText'),
      hoverNoteText: document.getElementById('hoverNoteText'),
      hoverBtnEditNote: document.getElementById('hoverBtnEditNote'),
      hoverBtnDelete: document.getElementById('hoverBtnDelete')
    };
  }

  initPdfViewerInstance() {
    this.eventBus = new pdfjsViewer.EventBus();
    this.pdfLinkService = new pdfjsViewer.PDFLinkService({ eventBus: this.eventBus });
    this.pdfFindController = new pdfjsViewer.PDFFindController({
      eventBus: this.eventBus,
      linkService: this.pdfLinkService
    });

    this.pdfViewer = new pdfjsViewer.PDFViewer({
      container: this.dom.viewerContainer,
      viewer: this.dom.viewer,
      eventBus: this.eventBus,
      linkService: this.pdfLinkService,
      findController: this.pdfFindController,
      textLayerMode: 2, // Enable text layer for selection
      removePageBorders: false
    });

    this.pdfLinkService.setViewer(this.pdfViewer);

    // Event: Page changed during scroll
    this.eventBus.on('pagechanging', (evt) => {
      this.currentPage = evt.pageNumber;
      this.dom.pageNumberInput.value = this.currentPage;
    });

    // Event: Page rendered -> Render highlights for this page!
    this.eventBus.on('pagerendered', (evt) => {
      this.renderHighlightsForPage(evt.pageNumber);
    });

    // Event: Text layer rendered -> ensure text is selectable
    this.eventBus.on('textlayerrendered', (evt) => {
      // Re-verify highlights if text layer finished after page
      this.renderHighlightsForPage(evt.pageNumber);
    });

    // Event: Find results update
    this.eventBus.on('updatefindmatchescount', (evt) => {
      const { total, current } = evt.matchesCount;
      if (total > 0) {
        this.dom.findResultsCount.textContent = `${current} / ${total}`;
      } else {
        this.dom.findResultsCount.textContent = '0 / 0';
      }
    });
  }

  initEventListeners() {
    // Open file triggers
    this.dom.btnOpenFile.addEventListener('click', () => this.dom.pdfFileInput.click());
    this.dom.btnWelcomeOpen.addEventListener('click', () => this.dom.pdfFileInput.click());
    if (this.dom.btnWelcomeSample) {
      this.dom.btnWelcomeSample.addEventListener('click', () => this.loadPdfFromUrl('sample.pdf'));
    }
    this.dom.pdfFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.loadFile(e.target.files[0]);
      }
    });

    // Drag and drop onto viewer
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
          this.loadFile(file);
        }
      }
    });

    // Page navigation
    this.dom.btnPrevPage.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.pdfViewer.currentPageNumber = this.currentPage - 1;
      }
    });

    this.dom.btnNextPage.addEventListener('click', () => {
      if (this.currentPage < this.totalPages) {
        this.pdfViewer.currentPageNumber = this.currentPage + 1;
      }
    });

    this.dom.pageNumberInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const page = parseInt(this.dom.pageNumberInput.value, 10);
        if (page >= 1 && page <= this.totalPages) {
          this.pdfViewer.currentPageNumber = page;
        } else {
          this.dom.pageNumberInput.value = this.currentPage;
        }
      }
    });

    // Zoom controls
    this.dom.btnZoomIn.addEventListener('click', () => {
      let scale = this.pdfViewer.currentScale * 1.2;
      this.pdfViewer.currentScale = Math.min(scale, 4.0);
    });

    this.dom.btnZoomOut.addEventListener('click', () => {
      let scale = this.pdfViewer.currentScale / 1.2;
      this.pdfViewer.currentScale = Math.max(scale, 0.3);
    });

    this.dom.zoomSelector.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'auto' || val === 'page-fit' || val === 'page-width') {
        this.pdfViewer.currentScaleValue = val;
      } else {
        this.pdfViewer.currentScale = parseFloat(val);
      }
    });

    // Rotate
    this.dom.btnRotate.addEventListener('click', () => {
      this.rotation = (this.rotation + 90) % 360;
      this.pdfViewer.pagesRotation = this.rotation;
    });

    // Sidebar Toggle
    this.dom.btnToggleSidebar.addEventListener('click', () => {
      this.dom.sidebar.classList.toggle('collapsed');
    });

    // Sidebar Tabs
    this.dom.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.dom.tabButtons.forEach(b => b.classList.remove('active'));
        this.dom.tabPanels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const targetPanel = document.getElementById(`panel${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });

    // Highlight Tool Color Palette in Toolbar
    this.dom.colorDropdown.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.dom.colorDropdown.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentColor = btn.dataset.color;
        this.dom.activeColorDot.style.background = this.currentColor;
      });
    });

    // Find / Search In Document
    this.dom.btnSearch.addEventListener('click', () => {
      this.dom.searchBar.classList.toggle('hidden');
      if (!this.dom.searchBar.classList.contains('hidden')) {
        this.dom.findInput.focus();
        this.dom.findInput.select();
      }
    });

    this.dom.btnCloseSearch.addEventListener('click', () => {
      this.dom.searchBar.classList.add('hidden');
      this.pdfFindController.executeCommand('find', { query: '' });
    });

    this.dom.findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = this.dom.findInput.value.trim();
        if (query) {
          this.pdfFindController.executeCommand('find', {
            query: query,
            highlightAll: true,
            findPrevious: e.shiftKey
          });
        }
      } else if (e.key === 'Escape') {
        this.dom.searchBar.classList.add('hidden');
      }
    });

    this.dom.btnFindNext.addEventListener('click', () => {
      this.pdfFindController.executeCommand('again', { findPrevious: false });
    });

    this.dom.btnFindPrev.addEventListener('click', () => {
      this.pdfFindController.executeCommand('again', { findPrevious: true });
    });

    // Theme Switcher (Cycle: light -> dark -> sepia -> green -> light)
    const themes = ['light', 'dark', 'sepia', 'green'];
    this.dom.btnTheme.addEventListener('click', () => {
      const nextIndex = (themes.indexOf(this.currentTheme) + 1) % themes.length;
      this.setTheme(themes[nextIndex]);
    });

    // Export Dropdown
    this.dom.btnExport.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.exportDropdownWrapper.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!this.dom.exportDropdownWrapper.contains(e.target)) {
        this.dom.exportDropdownWrapper.classList.remove('open');
      }
    });

    this.dom.menuExportPdf.addEventListener('click', () => this.exportAnnotatedPdf());
    this.dom.menuExportVocabMd.addEventListener('click', () => this.exportVocabularyMarkdown());
    this.dom.menuExportVocabAnki.addEventListener('click', () => this.exportVocabularyAnki());

    // Settings in Sidebar
    this.dom.btnToggleSettingKey.addEventListener('click', () => {
      this.dom.settingApiKey.type = this.dom.settingApiKey.type === 'password' ? 'text' : 'password';
    });

    this.dom.btnSaveSettings.addEventListener('click', () => this.saveSettings());
    this.dom.btnTestApiSidebar.addEventListener('click', () => this.testApiSidebar());

    // Text Selection & Mouse Up in Viewer
    this.dom.viewerContainer.addEventListener('mouseup', (e) => this.handleTextSelection(e));
    
    // Bubble Actions
    this.dom.bubbleBtnTranslate.addEventListener('click', () => this.triggerTranslation());
    
    this.dom.bubbleColors.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const color = btn.dataset.color;
        this.createHighlightFromActiveSelection(color);
      });
    });

    this.dom.bubbleBtnNote.addEventListener('click', () => {
      if (!this.activeSelection) return;
      this.openNoteModal({
        text: this.activeSelection.cleanedText,
        pageNumber: this.activeSelection.pageNumber,
        rects: this.activeSelection.rects,
        translation: ''
      });
    });

    this.dom.bubbleBtnSpeak.addEventListener('click', () => {
      if (this.activeSelection) {
        window.translationService.speak(this.activeSelection.cleanedText, 'en-US');
      }
    });

    this.dom.bubbleBtnCopy.addEventListener('click', () => {
      if (this.activeSelection) {
        navigator.clipboard.writeText(this.activeSelection.cleanedText);
        this.showTemporaryNotification('Đã sao chép vào bộ nhớ tạm!');
      }
    });

    // Translation Card Actions
    this.dom.cardBtnClose.addEventListener('click', () => this.hideTranslationCard());
    
    this.dom.cardBtnCopyTrans.addEventListener('click', () => {
      if (this.currentCardData?.translation) {
        navigator.clipboard.writeText(this.currentCardData.translation);
        this.showTemporaryNotification('Đã sao chép bản dịch!');
      }
    });

    this.dom.cardBtnSpeakOriginal.addEventListener('click', () => {
      if (this.currentCardData?.cleanedOriginal) {
        window.translationService.speak(this.currentCardData.cleanedOriginal, 'en-US');
      }
    });

    this.dom.cardBtnSaveVocab.addEventListener('click', () => {
      if (!this.currentCardData || !this.activeSelection) return;
      this.createHighlightFromActiveSelection(this.currentColor, this.currentCardData.translation);
      this.hideTranslationCard();
    });

    this.dom.cardBtnAddNote.addEventListener('click', () => {
      if (!this.activeSelection) return;
      this.openNoteModal({
        text: this.activeSelection.cleanedText,
        pageNumber: this.activeSelection.pageNumber,
        rects: this.activeSelection.rects,
        translation: this.currentCardData?.translation || ''
      });
      this.hideTranslationCard();
    });

    // Note Modal Actions
    this.dom.btnCloseNoteModal.addEventListener('click', () => this.closeNoteModal());
    this.dom.btnSaveNote.addEventListener('click', () => this.saveNoteModal());
    this.dom.btnDeleteNote.addEventListener('click', () => this.deleteNoteModal());

    // Highlight Hover Actions
    this.dom.hoverBtnEditNote.addEventListener('click', () => {
      if (this.currentHoverAnnotation) {
        this.hideHighlightHoverCard();
        this.openNoteModal(this.currentHoverAnnotation, true);
      }
    });

    this.dom.hoverBtnDelete.addEventListener('click', () => {
      if (this.currentHoverAnnotation) {
        this.deleteAnnotation(this.currentHoverAnnotation.id);
        this.hideHighlightHoverCard();
      }
    });

    // Annotation Search Filter in Sidebar
    this.dom.annotationSearchInput.addEventListener('input', (e) => {
      this.filterAnnotationsInSidebar(e.target.value.trim().toLowerCase());
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        this.dom.btnSearch.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.dom.btnToggleSidebar.click();
      } else if (e.key === 'h' || e.key === 'H') {
        if (this.activeSelection) {
          this.createHighlightFromActiveSelection(this.currentColor);
        }
      } else if (e.key === 't' || e.key === 'T') {
        if (this.activeSelection) {
          this.triggerTranslation();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        this.dom.btnNextPage.click();
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        this.dom.btnPrevPage.click();
      }
    });
  }

  // --- Theme Management ---
  setTheme(theme) {
    this.currentTheme = theme;
    document.body.className = `theme-${theme}`;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ theme });
    } else {
      localStorage.setItem('theme', theme);
    }
  }

  // --- Settings Management ---
  loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['nvidiaApiKey', 'model', 'targetLang', 'theme', 'autoTranslate'], (res) => {
        if (res.nvidiaApiKey) this.dom.settingApiKey.value = res.nvidiaApiKey;
        if (res.model) this.dom.settingModel.value = res.model;
        if (res.targetLang) {
          this.targetLang = res.targetLang;
          this.dom.settingTargetLang.value = res.targetLang;
        }
        if (res.theme) this.setTheme(res.theme);
        if (res.autoTranslate !== undefined) {
          this.autoTranslate = res.autoTranslate;
          this.dom.settingAutoTranslate.checked = res.autoTranslate;
        }
      });
    } else {
      const apiKey = localStorage.getItem('nvidiaApiKey') || '';
      const theme = localStorage.getItem('theme') || 'light';
      this.dom.settingApiKey.value = apiKey;
      this.setTheme(theme);
    }
  }

  saveSettings() {
    const apiKey = this.dom.settingApiKey.value.trim();
    const targetLang = this.dom.settingTargetLang.value;
    const autoTranslate = this.dom.settingAutoTranslate.checked;

    this.targetLang = targetLang;
    this.autoTranslate = autoTranslate;

    const data = {
      nvidiaApiKey: apiKey,
      targetLang,
      autoTranslate
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(data, () => {
        this.showTemporaryNotification('Đã lưu cấu hình cài đặt thành công!');
      });
    } else {
      localStorage.setItem('nvidiaApiKey', apiKey);
      localStorage.setItem('targetLang', targetLang);
      localStorage.setItem('autoTranslate', autoTranslate);
      this.showTemporaryNotification('Đã lưu cấu hình cài đặt!');
    }
  }

  testApiSidebar() {
    const key = this.dom.settingApiKey.value.trim();
    if (!key) {
      this.showSidebarResult('error', 'Vui lòng nhập API Key trước khi kiểm tra!');
      return;
    }

    this.dom.btnTestApiSidebar.disabled = true;
    this.dom.btnTestApiSidebar.textContent = 'Đang kiểm tra...';
    this.dom.sidebarTestResult.className = 'test-result hidden';

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'TEST_NVIDIA_API',
        apiKey: key,
        model: 'nvidia/riva-translate-4b-instruct-v2'
      }, (res) => {
        this.dom.btnTestApiSidebar.disabled = false;
        this.dom.btnTestApiSidebar.textContent = 'Kiểm tra kết nối API';

        if (chrome.runtime.lastError || !res) {
          this.showSidebarResult('error', 'Lỗi tiện ích: ' + (chrome.runtime.lastError?.message || 'Không có phản hồi'));
          return;
        }

        if (res.success) {
          this.showSidebarResult('success', `Kết nối thành công! Bản dịch mẫu: "${res.translation}"`);
        } else {
          this.showSidebarResult('error', `Kết nối thất bại: ${res.error}`);
        }
      });
    } else {
      this.dom.btnTestApiSidebar.disabled = false;
      this.dom.btnTestApiSidebar.textContent = 'Kiểm tra kết nối API';
      this.showSidebarResult('error', 'Không tìm thấy chrome.runtime. Vui lòng mở trong tiện ích mở rộng.');
    }
  }

  showSidebarResult(type, msg) {
    this.dom.sidebarTestResult.className = `test-result ${type}`;
    this.dom.sidebarTestResult.textContent = msg;
  }

  // --- Document Loading ---
  async checkInitialFileLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('loadRecent') === '1') {
      // Load recent from IndexedDB
      this.loadPdfFromIndexedDB();
    } else if (urlParams.get('file')) {
      const fileUrl = decodeURIComponent(urlParams.get('file'));
      this.loadPdfFromUrl(fileUrl);
    }
  }

  loadPdfFromIndexedDB() {
    const request = indexedDB.open('EdgeAiPdfDB', 1);
    request.onsuccess = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('activeFiles')) return;
      const tx = db.transaction('activeFiles', 'readonly');
      const store = tx.objectStore('activeFiles');
      const getReq = store.get('currentPdf');
      getReq.onsuccess = () => {
        if (getReq.result && getReq.result.data) {
          this.loadPdfData(getReq.result.data, getReq.result.name);
        }
      };
    };
  }

  async loadPdfFromUrl(url) {
    try {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      const fileName = url.substring(url.lastIndexOf('/') + 1) || 'Document.pdf';
      this.loadPdfData(buffer, fileName);
    } catch (err) {
      console.error('Error fetching PDF from URL:', err);
    }
  }

  loadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      this.loadPdfData(reader.result, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  async loadPdfData(arrayBuffer, fileName = 'Document.pdf') {
    this.originalPdfBytes = arrayBuffer.slice(0); // clone for export
    this.currentDocName = fileName;
    this.currentDocId = this.generateDocId(fileName, arrayBuffer.byteLength);
    this.dom.docTitle.textContent = fileName;
    this.dom.welcomeScreen.classList.add('hidden');

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true
      });

      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.dom.totalPagesCount.textContent = this.totalPages;
      this.dom.pageNumberInput.max = this.totalPages;

      this.pdfViewer.setDocument(this.pdfDoc);
      this.pdfLinkService.setDocument(this.pdfDoc, null);

      // Load document outline (bookmarks)
      this.loadDocumentOutline();

      // Load saved annotations for this document
      this.loadAnnotations();

    } catch (err) {
      console.error('Error loading PDF document:', err);
      alert('Không thể mở file PDF: ' + err.message);
    }
  }

  generateDocId(name, size) {
    return 'doc_' + name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + size;
  }

  async loadDocumentOutline() {
    this.dom.outlineView.innerHTML = '';
    const outline = await this.pdfDoc.getOutline();
    if (!outline || outline.length === 0) {
      this.dom.outlineView.innerHTML = '<div class="empty-state"><p>Tài liệu này không có mục lục.</p></div>';
      return;
    }

    const renderItems = (items, container) => {
      items.forEach(item => {
        const link = document.createElement('a');
        link.className = 'outline-item';
        link.textContent = item.title;
        link.href = '#';
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          if (item.dest) {
            let pageIndex;
            if (typeof item.dest === 'string') {
              const destObj = await this.pdfDoc.getDestination(item.dest);
              const ref = destObj[0];
              pageIndex = await this.pdfDoc.getPageIndex(ref);
            } else {
              pageIndex = await this.pdfDoc.getPageIndex(item.dest[0]);
            }
            this.pdfViewer.currentPageNumber = pageIndex + 1;
          }
        });
        container.appendChild(link);

        if (item.items && item.items.length > 0) {
          const subContainer = document.createElement('div');
          subContainer.style.paddingLeft = '14px';
          renderItems(item.items, subContainer);
          container.appendChild(subContainer);
        }
      });
    };

    renderItems(outline, this.dom.outlineView);
  }

  // --- Text Selection & Floating Bubble ---
  handleTextSelection(e) {
    // If clicking on floating bubble or translation card or modals, don't dismiss
    if (this.dom.floatingActionBubble.contains(e.target) || 
        this.dom.translationCard.contains(e.target) ||
        this.dom.noteModal.contains(e.target) ||
        this.dom.highlightHoverCard.contains(e.target)) {
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    if (!selectedText || selectedText.length < 2) {
      this.hideFloatingBubble();
      this.activeSelection = null;
      return;
    }

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length === 0) return;

    // Find the enclosing PDF page element
    let node = range.startContainer;
    while (node && !node.classList?.contains('page')) {
      node = node.parentElement;
    }

    if (!node) return;
    const pageElement = node;
    const pageNumber = parseInt(pageElement.dataset.pageNumber, 10);
    const pageRect = pageElement.getBoundingClientRect();

    // Compute relative percentage rects for stable zooming
    const relativeRects = [];
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      relativeRects.push({
        left: ((r.left - pageRect.left) / pageRect.width) * 100,
        top: ((r.top - pageRect.top) / pageRect.height) * 100,
        width: (r.width / pageRect.width) * 100,
        height: (r.height / pageRect.height) * 100
      });
    }

    const cleanedText = window.translationService.cleanPdfText(selectedText);

    this.activeSelection = {
      rawText: selectedText,
      cleanedText,
      pageNumber,
      rects: relativeRects,
      clientRect: rects[0]
    };

    // Position floating action bubble
    const firstRect = rects[0];
    const bubbleX = Math.max(10, firstRect.left + (firstRect.width / 2) - 130);
    const bubbleY = Math.max(60, firstRect.top - 46 + window.scrollY);

    this.dom.floatingActionBubble.style.left = `${bubbleX}px`;
    this.dom.floatingActionBubble.style.top = `${bubbleY}px`;
    this.dom.floatingActionBubble.classList.remove('hidden');

    // Auto-translate if enabled!
    if (this.autoTranslate) {
      this.triggerTranslation();
    }
  }

  hideFloatingBubble() {
    this.dom.floatingActionBubble.classList.add('hidden');
  }

  // --- Translation Action ---
  async triggerTranslation() {
    if (!this.activeSelection) return;

    const sel = this.activeSelection;
    this.hideFloatingBubble();
    this.showTranslationCard(sel.clientRect, sel.cleanedText);

    try {
      const result = await window.translationService.translate(sel.cleanedText, this.targetLang);
      
      this.currentCardData = {
        cleanedOriginal: sel.cleanedText,
        translation: result.text,
        engine: result.engine || 'NVIDIA Riva Translate 4B'
      };

      this.dom.transLoading.classList.add('hidden');
      this.dom.transResultWrapper.classList.remove('hidden');
      this.dom.transOriginalSnippet.textContent = sel.cleanedText.length > 120 
        ? sel.cleanedText.slice(0, 120) + '...' 
        : sel.cleanedText;
      this.dom.transResultText.textContent = result.text;
      this.dom.transEngineLabel.textContent = result.engine || 'NVIDIA Riva Translate 4B';

    } catch (err) {
      this.dom.transLoading.classList.add('hidden');
      this.dom.transResultWrapper.classList.remove('hidden');
      this.dom.transResultText.textContent = 'Lỗi dịch: ' + err.message;
    }
  }

  showTranslationCard(anchorRect, snippet) {
    const card = this.dom.translationCard;
    const cardWidth = 340;
    
    // Position below or above anchor
    let left = anchorRect.left + (anchorRect.width / 2) - (cardWidth / 2);
    left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, left));

    let top = anchorRect.bottom + 10;
    if (top + 250 > window.innerHeight) {
      top = anchorRect.top - 240;
    }

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;

    this.dom.transLoading.classList.remove('hidden');
    this.dom.transResultWrapper.classList.add('hidden');
    card.classList.remove('hidden');
  }

  hideTranslationCard() {
    this.dom.translationCard.classList.add('hidden');
  }

  // --- Highlights & Annotations ---
  createHighlightFromActiveSelection(color, translation = '', note = '') {
    if (!this.activeSelection) return;

    const annotation = {
      id: 'anno_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      docId: this.currentDocId,
      pageNumber: this.activeSelection.pageNumber,
      text: this.activeSelection.rawText,
      cleanedText: this.activeSelection.cleanedText,
      translation: translation || '',
      note: note || '',
      color: color || this.currentColor,
      rects: this.activeSelection.rects,
      createdAt: Date.now()
    };

    this.annotations.push(annotation);
    this.saveAnnotations();
    this.renderHighlightsForPage(annotation.pageNumber);
    this.updateSidebarAnnotations();
    this.hideFloatingBubble();
    this.showTemporaryNotification('Đã lưu highlight & từ vựng!');
  }

  renderHighlightsForPage(pageNumber) {
    const pageElement = this.dom.viewer.querySelector(`.page[data-page-number="${pageNumber}"]`);
    if (!pageElement) return;

    // Check if custom highlight layer already exists
    let layer = pageElement.querySelector('.custom-highlight-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'custom-highlight-layer';
      pageElement.appendChild(layer);
    } else {
      layer.innerHTML = '';
    }

    const pageAnnos = this.annotations.filter(a => a.pageNumber === pageNumber);

    pageAnnos.forEach(anno => {
      anno.rects.forEach(r => {
        const rectDiv = document.createElement('div');
        rectDiv.className = 'highlight-rect';
        rectDiv.style.left = `${r.left}%`;
        rectDiv.style.top = `${r.top}%`;
        rectDiv.style.width = `${r.width}%`;
        rectDiv.style.height = `${r.height}%`;
        rectDiv.style.backgroundColor = anno.color;
        rectDiv.dataset.annoId = anno.id;

        // Hover events for quick popup preview
        rectDiv.addEventListener('mouseenter', (e) => this.showHighlightHoverCard(e, anno));
        rectDiv.addEventListener('mouseleave', () => this.scheduleHideHoverCard());

        rectDiv.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openNoteModal(anno, true);
        });

        layer.appendChild(rectDiv);
      });
    });
  }

  showHighlightHoverCard(e, anno) {
    clearTimeout(this.hoverHideTimeout);
    this.currentHoverAnnotation = anno;

    const card = this.dom.highlightHoverCard;
    const rect = e.target.getBoundingClientRect();

    if (anno.translation) {
      this.dom.hoverTransText.textContent = anno.translation;
      this.dom.hoverTransText.style.display = 'block';
    } else {
      this.dom.hoverTransText.style.display = 'none';
    }

    if (anno.note) {
      this.dom.hoverNoteText.textContent = `"${anno.note}"`;
      this.dom.hoverNoteText.style.display = 'block';
    } else {
      this.dom.hoverNoteText.style.display = 'none';
    }

    card.style.left = `${Math.min(window.innerWidth - 280, rect.left)}px`;
    card.style.top = `${rect.bottom + 6}px`;
    card.classList.remove('hidden');

    card.onmouseenter = () => clearTimeout(this.hoverHideTimeout);
    card.onmouseleave = () => this.scheduleHideHoverCard();
  }

  scheduleHideHoverCard() {
    this.hoverHideTimeout = setTimeout(() => {
      this.hideHighlightHoverCard();
    }, 200);
  }

  hideHighlightHoverCard() {
    this.dom.highlightHoverCard.classList.add('hidden');
  }

  // --- Note Modal ---
  openNoteModal(annoData, isEditing = false) {
    this.modalAnnoData = annoData;
    this.isEditingNote = isEditing;

    this.dom.noteQuotedText.textContent = annoData.text || annoData.cleanedText;
    this.dom.noteInput.value = annoData.note || '';

    if (isEditing) {
      this.dom.btnDeleteNote.classList.remove('hidden');
    } else {
      this.dom.btnDeleteNote.classList.add('hidden');
    }

    this.dom.noteModal.classList.remove('hidden');
    this.dom.noteInput.focus();
  }

  closeNoteModal() {
    this.dom.noteModal.classList.add('hidden');
    this.modalAnnoData = null;
  }

  saveNoteModal() {
    const noteText = this.dom.noteInput.value.trim();
    if (!this.modalAnnoData) return;

    if (this.isEditingNote) {
      // Update existing annotation
      const anno = this.annotations.find(a => a.id === this.modalAnnoData.id);
      if (anno) {
        anno.note = noteText;
        this.saveAnnotations();
        this.updateSidebarAnnotations();
      }
    } else {
      // Create new annotation with note
      this.createHighlightFromActiveSelection(
        this.currentColor,
        this.modalAnnoData.translation,
        noteText
      );
    }

    this.closeNoteModal();
  }

  deleteNoteModal() {
    if (this.modalAnnoData && this.modalAnnoData.id) {
      this.deleteAnnotation(this.modalAnnoData.id);
      this.closeNoteModal();
    }
  }

  deleteAnnotation(id) {
    const index = this.annotations.findIndex(a => a.id === id);
    if (index !== -1) {
      const pageNumber = this.annotations[index].pageNumber;
      this.annotations.splice(index, 1);
      this.saveAnnotations();
      this.renderHighlightsForPage(pageNumber);
      this.updateSidebarAnnotations();
      this.showTemporaryNotification('Đã xóa ghi chú/highlight!');
    }
  }

  // --- Annotations Persistence ---
  saveAnnotations() {
    const key = `annotations_${this.currentDocId}`;
    localStorage.setItem(key, JSON.stringify(this.annotations));

    // Also sync to chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const obj = {};
      obj[key] = this.annotations;
      chrome.storage.local.set(obj);
    }
  }

  loadAnnotations() {
    const key = `annotations_${this.currentDocId}`;
    const local = localStorage.getItem(key);
    if (local) {
      try {
        this.annotations = JSON.parse(local);
        this.updateSidebarAnnotations();
      } catch (e) {
        this.annotations = [];
      }
    } else {
      this.annotations = [];
      this.updateSidebarAnnotations();
    }
  }

  updateSidebarAnnotations() {
    this.dom.annotationCountBadge.textContent = this.annotations.length;
    if (this.annotations.length > 0) {
      this.dom.annotationCountBadge.classList.remove('hidden');
    } else {
      this.dom.annotationCountBadge.classList.add('hidden');
    }

    this.filterAnnotationsInSidebar('');
  }

  filterAnnotationsInSidebar(query = '') {
    const list = this.dom.annotationsList;
    list.innerHTML = '';

    const filtered = this.annotations.filter(a => {
      if (!query) return true;
      return (a.cleanedText && a.cleanedText.toLowerCase().includes(query)) ||
             (a.translation && a.translation.toLowerCase().includes(query)) ||
             (a.note && a.note.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p>${query ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có từ vựng hoặc ghi chú nào'}</p>
        </div>`;
      return;
    }

    filtered.forEach(anno => {
      const item = document.createElement('div');
      item.className = 'annotation-item';
      
      item.innerHTML = `
        <div class="anno-header">
          <span class="anno-page-badge">Trang ${anno.pageNumber}</span>
          <span class="anno-color-bar" style="background:${anno.color};"></span>
        </div>
        <div class="anno-text">${this.escapeHtml(anno.cleanedText)}</div>
        ${anno.translation ? `<div class="anno-trans"><strong>Dịch:</strong> ${this.escapeHtml(anno.translation)}</div>` : ''}
        ${anno.note ? `<div class="anno-note">${this.escapeHtml(anno.note)}</div>` : ''}
        <div class="anno-actions">
          <button class="anno-btn-delete" title="Xóa">Xóa</button>
        </div>
      `;

      // Jump to annotation on click
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('anno-btn-delete')) return;
        this.pdfViewer.currentPageNumber = anno.pageNumber;
      });

      // Delete button
      item.querySelector('.anno-btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteAnnotation(anno.id);
      });

      list.appendChild(item);
    });
  }

  // --- Export Functions ---
  async exportAnnotatedPdf() {
    if (!this.originalPdfBytes) {
      alert('Không có dữ liệu PDF gốc để xuất.');
      return;
    }

    this.showTemporaryNotification('Đang tạo file PDF có kèm Highlight...');

    try {
      const { PDFDocument, rgb } = PDFLib;
      const pdfDoc = await PDFDocument.load(this.originalPdfBytes);
      const pages = pdfDoc.getPages();

      // Convert hex color to rgb
      const hexToRgb = (hex) => {
        const c = hex.replace('#', '');
        return rgb(
          parseInt(c.substring(0, 2), 16) / 255,
          parseInt(c.substring(2, 4), 16) / 255,
          parseInt(c.substring(4, 6), 16) / 255
        );
      };

      this.annotations.forEach(anno => {
        const pageIdx = anno.pageNumber - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) return;
        const page = pages[pageIdx];
        const { width: pWidth, height: pHeight } = page.getSize();
        const color = hexToRgb(anno.color || '#fef08a');

        anno.rects.forEach(r => {
          // In PDF, origin (0,0) is bottom-left, while in HTML DOM it's top-left!
          const x = (r.left / 100) * pWidth;
          const w = (r.width / 100) * pWidth;
          const h = (r.height / 100) * pHeight;
          const y = pHeight - ((r.top / 100) * pHeight) - h;

          page.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            color,
            opacity: 0.4
          });
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = this.currentDocName.replace(/\.pdf$/i, '') + '_annotated.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      this.showTemporaryNotification('Đã tải xuống PDF có Highlight thành công!');
    } catch (err) {
      console.error('Error generating annotated PDF:', err);
      alert('Không thể xuất PDF: ' + err.message);
    }
  }

  exportVocabularyMarkdown() {
    if (this.annotations.length === 0) {
      alert('Chưa có từ vựng hoặc ghi chú nào để xuất!');
      return;
    }

    let md = `# Sổ Từ Vựng & Chú Thích - ${this.currentDocName}\n\n`;
    md += `*Thời gian xuất: ${new Date().toLocaleString()}*\n\n`;
    md += `| STT | Trang | Từ vựng / Đoạn văn gốc | Bản dịch (NVIDIA AI) | Ghi chú |\n`;
    md += `| :---: | :---: | :--- | :--- | :--- |\n`;

    this.annotations.forEach((a, i) => {
      const orig = (a.cleanedText || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const trans = (a.translation || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const note = (a.note || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
      md += `| ${i + 1} | ${a.pageNumber} | ${orig} | ${trans} | ${note} |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    this.downloadBlob(blob, this.currentDocName.replace(/\.pdf$/i, '') + '_vocab.md');
  }

  exportVocabularyAnki() {
    if (this.annotations.length === 0) {
      alert('Chưa có từ vựng nào để xuất sang Anki!');
      return;
    }

    // Anki TSV format: Front \t Back \t Tag
    let tsv = '';
    this.annotations.forEach(a => {
      const front = (a.cleanedText || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
      let back = (a.translation || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
      if (a.note) {
        back += `<hr><em>Ghi chú: ${a.note.replace(/\t/g, ' ').replace(/\n/g, '<br>')}</em>`;
      }
      tsv += `${front}\t${back}\tEdgeAIPDF\n`;
    });

    const blob = new Blob([tsv], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, this.currentDocName.replace(/\.pdf$/i, '') + '_anki.txt');
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showTemporaryNotification(`Đã xuất file ${filename}!`);
  }

  // --- Utilities ---
  showTemporaryNotification(msg) {
    let toast = document.getElementById('tempToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tempToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0f172a;
        color: #fff;
        padding: 10px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        z-index: 3000;
        border: 1px solid rgba(255,255,255,0.1);
        animation: popIn 0.2s ease-out;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 2800);
  }

  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.edgeAiPdfApp = new EdgeAiPdfViewer();
});
