/* ==========================================================================
   UI OCR Scanner Prototype - Interactivity & Simulator
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- Constants & Data ---
  const VARIANTS = [
    { key: 'A', title: 'Camera HUD Viewport' },
    { key: 'B', title: 'Split Screen Form' },
    { key: 'C', title: 'Step-by-Step Wizard' }
  ];

  const NAMEPLATE_DATA = {
    goodman: {
      oem: 'goodman',
      name: 'Goodman',
      model: 'GSX140361',
      serial: '1908234561',
      refrigerant: 'R-410A'
    },
    carrier: {
      oem: 'carrier',
      name: 'Carrier',
      model: '24AAA536A003',
      serial: '4518E12345',
      refrigerant: 'R-410A'
    },
    trane: {
      oem: 'trane',
      name: 'Trane',
      model: '4TTR6036B1000A',
      serial: '18423ABCD4',
      refrigerant: 'R-22'
    }
  };

  // --- State Variables ---
  let currentVariant = 'A';
  let activeTheme = 'light';
  let activeNameplate = 'goodman';
  let isScanning = false;
  let audioContext = null;
  let autoCaptureTimeout = null;

  // --- DOM Elements ---
  const appViewport = document.getElementById('app-viewport');
  const phoneEnclosure = document.querySelector('.phone-enclosure');
  const glareOverlay = document.getElementById('glare-overlay');
  const hapticToast = document.getElementById('haptic-toast');
  const nameplateSelect = document.getElementById('nameplate-select');
  const variantTitleLabel = document.getElementById('variant-title-label');
  const switcherKey = document.querySelector('.switcher-key');
  
  // Theme options
  const themeOptions = document.querySelectorAll('.theme-toggle-option');

  // Sidebar Controls
  const toggleGlareBtn = document.getElementById('toggle-glare');
  const toggleGloveBtn = document.getElementById('toggle-glove-zones');

  // View projections
  const cameraProjections = document.querySelectorAll('.camera-feed-projection');

  // Input Fields
  const hudModelInput = document.getElementById('hud-input-model');
  const hudSerialInput = document.getElementById('hud-input-serial');
  const hudRefrigerantInput = document.getElementById('hud-input-refrigerant');

  const splitModelInput = document.getElementById('split-input-model');
  const splitSerialInput = document.getElementById('split-input-serial');
  const splitRefrigerantInput = document.getElementById('split-input-refrigerant');
  const ocrStatusBadge = document.getElementById('ocr-status-badge');

  const wizardRefrigerantInput = document.getElementById('wizard-input-refrigerant');

  // --- OEM Brand Badge Rendering ---
  function renderOemBadges(clear = false) {
    const hudContainer = document.getElementById('hud-oem-badge-container');
    const splitContainer = document.getElementById('split-oem-badge-container');
    const wizardContainer = document.getElementById('wizard-oem-badge-container');
    
    if (clear) {
      const pendingHtml = '<span class="oem-logo-badge" style="background:#555; color:#fff; border-color:#444;">Pending scan...</span>';
      if (hudContainer) hudContainer.innerHTML = pendingHtml;
      if (splitContainer) splitContainer.innerHTML = pendingHtml;
      if (wizardContainer) wizardContainer.innerHTML = pendingHtml;
      return;
    }

    const data = NAMEPLATE_DATA[activeNameplate];
    const badgeHtml = `<span class="oem-logo-badge ${data.oem}">${data.name}</span>`;
    
    if (hudContainer) hudContainer.innerHTML = badgeHtml;
    if (splitContainer) splitContainer.innerHTML = badgeHtml;
    if (wizardContainer) wizardContainer.innerHTML = badgeHtml;
  }

  // --- Initializer functions ---
  function init() {
    // Read variant from URL param or default to A
    const urlParams = new URLSearchParams(window.location.search);
    const variantParam = urlParams.get('variant');
    if (variantParam && ['A', 'B', 'C'].includes(variantParam.toUpperCase())) {
      currentVariant = variantParam.toUpperCase();
    }
    
    // Set initial projection image
    updateCameraProjections();
    // Render current variant view
    applyVariant(currentVariant);
    
    // Set default values for inputs based on Goodman
    resetInputs();
    renderOemBadges(true);

    // Event listeners
    setupEventListeners();
  }

  // --- Audio & Haptic Feedback Simulation ---
  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playSound(type) {
    try {
      initAudio();
      if (!audioContext) return;

      const osc = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'click') {
        osc.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
        osc.start();
        osc.stop(audioContext.currentTime + 0.05);
      } else if (type === 'success') {
        // Dual chime
        osc.frequency.setValueAtTime(600, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        osc.frequency.setValueAtTime(900, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        osc.start();
        osc.stop(audioContext.currentTime + 0.3);
      } else if (type === 'laser') {
        // Frequency sweep
        osc.frequency.setValueAtTime(150, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.8);
        gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);
        osc.start();
        osc.stop(audioContext.currentTime + 0.8);
      }
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  function triggerHaptic(duration = 100, message = 'Haptic pulse') {
    playSound('click');
    hapticToast.textContent = `📳 ${message} (${duration}ms)`;
    hapticToast.classList.remove('haptic-toast-hidden');
    hapticToast.classList.add('haptic-toast-active');
    
    // Vibrate phone UI
    phoneEnclosure.classList.add('shake');
    
    setTimeout(() => {
      hapticToast.classList.remove('haptic-toast-active');
      hapticToast.classList.add('haptic-toast-hidden');
    }, 1500);

    setTimeout(() => {
      phoneEnclosure.classList.remove('shake');
    }, 200);
  }

  // --- Variant Switching ---
  function applyVariant(key) {
    // Hide all views
    document.querySelectorAll('.variant-view').forEach(view => {
      view.classList.remove('active');
    });

    // Show selected view
    const activeView = document.getElementById(`variant-view-${key}`);
    if (activeView) activeView.classList.add('active');

    // Update active label in switcher
    const variantData = VARIANTS.find(v => v.key === key);
    switcherKey.textContent = `VARIANT ${key}`;
    variantTitleLabel.textContent = variantData.title;

    // Sync URL search param
    const url = new URL(window.location);
    url.searchParams.set('variant', key);
    window.history.pushState({}, '', url);

    currentVariant = key;
    
    // Clear auto-capture when shifting variant
    if (autoCaptureTimeout) {
      clearTimeout(autoCaptureTimeout);
      autoCaptureTimeout = null;
    }

    // Wizard step resets when entering Variant C
    if (key === 'C') {
      goToWizardStep(1);
    }
  }

  function cycleVariant(direction) {
    let index = VARIANTS.findIndex(v => v.key === currentVariant);
    if (direction === 'next') {
      index = (index + 1) % VARIANTS.length;
    } else {
      index = (index - 1 + VARIANTS.length) % VARIANTS.length;
    }
    triggerHaptic(80, `Switching to Variant ${VARIANTS[index].key}`);
    applyVariant(VARIANTS[index].key);
  }

  // --- Wizard specific step logic ---
  function goToWizardStep(stepNum) {
    if (autoCaptureTimeout) {
      clearTimeout(autoCaptureTimeout);
      autoCaptureTimeout = null;
    }

    document.querySelectorAll('.wizard-step').forEach(step => {
      step.classList.remove('active');
    });
    document.getElementById(`wizard-step-${stepNum}`).classList.add('active');

    // Start auto-capture sequence when entering viewfinder step (step 2)
    if (stepNum === 2 || stepNum === '2') {
      const statusEl = document.getElementById('wizard-ocr-status');
      if (statusEl) {
        statusEl.textContent = '🔍 ALIGNING... AUTO-CAPTURE RUNNING';
      }
      autoCaptureTimeout = setTimeout(() => {
        if (currentVariant === 'C' && !isScanning) {
          triggerOcrScan();
        }
      }, 2500);
    }
  }

  // --- Camera & Nameplate loading logic ---
  function updateCameraProjections() {
    // Draw visual representation in the camera feed using css SVG mapping or gradient borders
    cameraProjections.forEach(projection => {
      // Remove previous class names
      projection.classList.remove('goodman', 'carrier', 'trane');
      projection.classList.add(activeNameplate);
      
      // Inject some mock nameplate HTML contents directly into viewport projection to make it look like raw text
      const nameplateData = NAMEPLATE_DATA[activeNameplate];
      projection.innerHTML = `
        <div class="viewport-plate-mock font-family-mono">
          <div style="font-size: 8px; font-weight: bold; margin-bottom: 2px;">${activeNameplate.toUpperCase()} UNIT</div>
          <div style="font-size: 7px; color: #7fffd4;">MODEL: ${nameplateData.model}</div>
          <div style="font-size: 7px; color: #7fffd4;">SERIAL: ${nameplateData.serial}</div>
          <div style="font-size: 6px;">REFRIG: ${nameplateData.refrigerant}</div>
        </div>
      `;
    });
  }

  function resetInputs() {
    hudModelInput.value = '';
    hudSerialInput.value = '';
    hudRefrigerantInput.value = '';

    splitModelInput.value = '';
    splitSerialInput.value = '';
    splitRefrigerantInput.value = '';
    if (ocrStatusBadge) ocrStatusBadge.textContent = 'READY TO CAPTURE';

    // Goodman details preset
    const data = NAMEPLATE_DATA[activeNameplate];
    
    // In wizard we pre-bind scanned outputs to success review crop matches
    document.querySelectorAll('.ocr-model').forEach(el => {
      if (el.tagName === 'INPUT') el.value = data.model;
      else el.textContent = data.model;
    });
    document.querySelectorAll('.ocr-serial').forEach(el => {
      if (el.tagName === 'INPUT') el.value = data.serial;
      else el.textContent = data.serial;
    });
    document.querySelectorAll('.ocr-refrigerant').forEach(el => {
      if (el.tagName === 'INPUT') el.value = data.refrigerant;
      else el.textContent = data.refrigerant;
    });
    
    renderOemBadges(true);
    updateCropPreviews();
  }

  // --- Dynamic Crop Previews ---
  function updateCropPreviews() {
    const modelCrop = document.querySelector('.model-crop');
    const serialCrop = document.querySelector('.serial-crop');
    if (!modelCrop || !serialCrop) return;

    const data = NAMEPLATE_DATA[activeNameplate];
    let nameplateTitle = '';
    let modelPrefix = 'MODEL NO:';
    let serialPrefix = 'SERIAL NO:';
    
    if (activeNameplate === 'goodman') {
      nameplateTitle = 'GOODMAN MFG. CO.';
    } else if (activeNameplate === 'carrier') {
      nameplateTitle = 'CARRIER CORPORATION';
      modelPrefix = 'MODEL:';
      serialPrefix = 'SERIAL:';
    } else if (activeNameplate === 'trane') {
      nameplateTitle = 'TRANE INC.';
      modelPrefix = 'MODEL NO:';
      serialPrefix = 'SERIAL NO:';
    }

    const htmlContent = `
      <div class="sim-plate-crop-content">
        <div class="sim-plate-crop-header">${nameplateTitle}</div>
        <div class="sim-plate-crop-row">
          <span>${modelPrefix}</span> 
          <strong class="crop-highlight model-highlight">${data.model}</strong>
        </div>
        <div class="sim-plate-crop-row">
          <span>${serialPrefix}</span> 
          <strong class="crop-highlight serial-highlight">${data.serial}</strong>
        </div>
        <div class="sim-plate-crop-row">
          <span>REFRIGERANT:</span> 
          <strong>${data.refrigerant}</strong>
        </div>
      </div>
    `;

    modelCrop.innerHTML = htmlContent;
    serialCrop.innerHTML = htmlContent;
  }

  // --- OCR Scanner Simulator ---
  function triggerOcrScan() {
    if (isScanning) return;
    isScanning = true;

    // Clear auto capture timer so it doesn't double trigger
    if (autoCaptureTimeout) {
      clearTimeout(autoCaptureTimeout);
      autoCaptureTimeout = null;
    }
    
    // Play sweep laser sound and shake screen
    playSound('laser');
    triggerHaptic(300, 'Laser scanner active');
    
    // Display dynamic visual scanners running
    const laserScannerLines = document.querySelectorAll('.laser-scanner-line');
    laserScannerLines.forEach(line => line.style.animationDuration = '0.5s');

    const statusEl = document.getElementById('wizard-ocr-status');
    if (statusEl) {
      statusEl.textContent = '⚡ CAPTURED! PARSING DATA...';
    }

    setTimeout(() => {
      // Complete scan
      isScanning = false;
      laserScannerLines.forEach(line => line.style.animationDuration = '2s');
      playSound('success');
      triggerHaptic(150, 'OCR capture successful');

      const data = NAMEPLATE_DATA[activeNameplate];

      // Render OEM Badges
      renderOemBadges(false);

      // Populate input values
      if (currentVariant === 'A') {
        hudModelInput.value = data.model;
        hudSerialInput.value = data.serial;
        hudRefrigerantInput.value = data.refrigerant;
        
        // Show manual overlay with parsed details
        document.querySelector('.form-overlay').classList.remove('hidden');
      } else if (currentVariant === 'B') {
        splitModelInput.value = data.model;
        splitSerialInput.value = data.serial;
        splitRefrigerantInput.value = data.refrigerant;
        ocrStatusBadge.textContent = 'OCR MATCH SUCCESS (100%)';
      } else if (currentVariant === 'C') {
        // Ensure crop preview boxes are visible and updated
        document.querySelectorAll('.crop-preview-box').forEach(box => {
          box.style.display = 'block';
        });
        updateCropPreviews();

        // Populate step 3 crops
        document.querySelectorAll('.ocr-model').forEach(el => {
          if (el.tagName === 'INPUT') el.value = data.model;
          else el.textContent = data.model;
        });
        document.querySelectorAll('.ocr-serial').forEach(el => {
          if (el.tagName === 'INPUT') el.value = data.serial;
          else el.textContent = data.serial;
        });
        wizardRefrigerantInput.value = data.refrigerant;

        // Auto-extract dynamic fields from the main nameplate scan itself!
        const customContainer = document.getElementById('custom-fields-dynamic-container');
        if (customContainer) {
          customContainer.innerHTML = '';
          let initialSpecs = [];
          if (activeNameplate === 'goodman') {
            initialSpecs = [
              { name: 'Volts/Phase', val: '208/230V - 1 Ph' },
              { name: 'Tonnage', val: '3.0 Ton' },
              { name: 'SEER Rating', val: '14 SEER' }
            ];
          } else if (activeNameplate === 'carrier') {
            initialSpecs = [
              { name: 'Tonnage', val: '3.0 Ton' },
              { name: 'MCA (Amps)', val: '20.0 A' },
              { name: 'Max Fuse', val: '35 A' }
            ];
          } else if (activeNameplate === 'trane') {
            initialSpecs = [
              { name: 'MCA (Amps)', val: '22.0 A' },
              { name: 'Max Fuse', val: '30 A' },
              { name: 'Factory Chg', val: '8.5 LBS' }
            ];
          }
          initialSpecs.forEach(spec => {
            const row = document.createElement('div');
            row.className = 'custom-field-row';
            row.innerHTML = `
              <span class="custom-field-name">${spec.name}</span>
              <input type="text" class="glove-input custom-field-input" style="min-height:44px; width:120px; font-size:var(--text-sm); padding:0 var(--space-sm);" value="${spec.val}">
            `;
            customContainer.appendChild(row);
          });
        }

        goToWizardStep(3);
      }
    }, 1500);
  }

  // --- Setup Listeners ---
  function setupEventListeners() {
    // Switcher controls
    document.getElementById('switch-prev').addEventListener('click', () => cycleVariant('prev'));
    document.getElementById('switch-next').addEventListener('click', () => cycleVariant('next'));

    // Theme Selector
    themeOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        const theme = e.target.getAttribute('data-theme');
        themeOptions.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        appViewport.setAttribute('data-theme', theme);
        activeTheme = theme;
        triggerHaptic(50, `Theme mode set to ${theme}`);
      });
    });

    // Glare simulator toggle
    toggleGlareBtn.addEventListener('click', () => {
      glareOverlay.classList.toggle('glare-overlay-active');
      toggleGlareBtn.classList.toggle('active');
      const isActive = glareOverlay.classList.contains('glare-overlay-active');
      triggerHaptic(100, isActive ? 'Solar glare enabled' : 'Solar glare disabled');
    });

    // Glove zones toggle
    toggleGloveBtn.addEventListener('click', () => {
      appViewport.classList.toggle('show-glove-targets');
      toggleGloveBtn.classList.toggle('active');
      const isActive = appViewport.classList.contains('show-glove-targets');
      triggerHaptic(100, isActive ? 'Glove targets shown' : 'Glove targets hidden');
    });

    // Nameplate Select changes
    nameplateSelect.addEventListener('click', () => initAudio()); // user interaction start
    nameplateSelect.addEventListener('change', (e) => {
      activeNameplate = e.target.value;
      
      // Update visible physical nameplate preview on side
      document.querySelectorAll('.hvac-nameplate').forEach(plate => {
        plate.classList.remove('active');
      });
      document.getElementById(`plate-${activeNameplate}`).classList.add('active');

      // Update viewfinder projections
      updateCameraProjections();
      resetInputs();
      triggerHaptic(80, `Swapped to ${activeNameplate.toUpperCase()} plate`);

      // Restart auto-capture if in wizard viewfinder step
      const step2 = document.getElementById('wizard-step-2');
      if (currentVariant === 'C' && step2 && step2.classList.contains('active')) {
        goToWizardStep(2);
      }
    });

    // Scanning action triggers
    document.querySelectorAll('.scan-action-btn').forEach(btn => {
      btn.addEventListener('click', triggerOcrScan);
    });

    // Variant A Bypasses & overlays
    document.querySelector('.manual-bypass-btn').addEventListener('click', () => {
      triggerHaptic(80, 'Manual bypass activated');
      // Load current inputs (could be empty)
      document.querySelector('.form-overlay').classList.remove('hidden');
    });

    document.querySelector('.btn-close-overlay').addEventListener('click', () => {
      triggerHaptic(50, 'Overlay closed');
      document.querySelector('.form-overlay').classList.add('hidden');
    });

    document.querySelectorAll('.save-fields-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        triggerHaptic(120, 'Equipment details confirmed');
        // Overlay close if A
        document.querySelector('.form-overlay').classList.add('hidden');
        if (currentVariant === 'C') {
          // Complete and reset wizard
          alert('Equipment parameters confirmed and saved to SQLite Job Outbox snapshot!');
          goToWizardStep(1);
        } else {
          alert('Equipment parameters confirmed and saved!');
        }
      });
    });

    // Variant C wizard button flows
    document.querySelectorAll('.wizard-next-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const nextStep = e.target.closest('button').dataset.goto;
        triggerHaptic(80, 'Camera initialized');
        goToWizardStep(nextStep);
      });
    });

    document.querySelectorAll('.wizard-back-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prevStep = e.target.closest('button').dataset.goto;
        triggerHaptic(50, 'Navigated back');
        goToWizardStep(prevStep);
      });
    });

    document.querySelector('.wizard-bypass-btn').addEventListener('click', () => {
      triggerHaptic(80, 'Manual bypass activated');
      
      // Clear inputs for manual entry
      document.querySelectorAll('.ocr-model').forEach(el => {
        if (el.tagName === 'INPUT') el.value = '';
        else el.textContent = 'MANUAL';
      });
      document.querySelectorAll('.ocr-serial').forEach(el => {
        if (el.tagName === 'INPUT') el.value = '';
        else el.textContent = 'MANUAL';
      });
      wizardRefrigerantInput.value = '';

      // Hide crop boxes since no scan photo exists
      document.querySelectorAll('.crop-preview-box').forEach(box => {
        box.style.display = 'none';
      });
      
      // Set OEM badge to generic/pending
      renderOemBadges(true);

      goToWizardStep(3);
    });

    document.querySelector('.capture-trigger-btn').addEventListener('click', triggerOcrScan);

    // Service Tag uploads simulator
    let uploadedTagsCount = 1;
    const btnUploadTag = document.getElementById('btn-upload-service-tag');
    const tagsListContainer = document.getElementById('service-tags-list-container');
    const tagCountLabel = document.getElementById('tag-count-label');

    if (btnUploadTag) {
      btnUploadTag.addEventListener('click', () => {
        uploadedTagsCount++;
        tagCountLabel.textContent = uploadedTagsCount;
        
        const dateStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newThumb = document.createElement('div');
        newThumb.className = 'tag-thumbnail-card';
        newThumb.innerHTML = `
          <span class="tag-thumb-icon">📷</span>
          <span class="tag-thumb-date">Tag ${dateStr}</span>
        `;
        tagsListContainer.appendChild(newThumb);
        
        // Auto-extract simulated custom fields depending on active nameplate to save technician time!
        let simulatedFields = [];
        if (activeNameplate === 'goodman') {
          simulatedFields = [
            { name: 'Install Date', val: '2020-08-12' },
            { name: 'Installer Company', val: 'Apex Comfort' }
          ];
        } else if (activeNameplate === 'carrier') {
          simulatedFields = [
            { name: 'Design Press High', val: '450 PSI' },
            { name: 'Design Press Low', val: '250 PSI' }
          ];
        } else if (activeNameplate === 'trane') {
          simulatedFields = [
            { name: 'MCA (Amps)', val: '22.0 A' },
            { name: 'Max Fuse', val: '30 A' }
          ];
        }

        simulatedFields.forEach(f => {
          const newRow = document.createElement('div');
          newRow.className = 'custom-field-row';
          newRow.innerHTML = `
            <span class="custom-field-name">${f.name}</span>
            <input type="text" class="glove-input custom-field-input" style="min-height:44px; width:120px; font-size:var(--text-sm); padding:0 var(--space-sm);" value="${f.val}">
          `;
          customFieldsContainer.appendChild(newRow);
        });

        triggerHaptic(200, `Tag uploaded & auto-parsed!`);
        playSound('success');
        
        // Auto scroll list
        tagsListContainer.scrollLeft = tagsListContainer.scrollWidth;
      });
    }

    // Dynamic custom fields adder
    const btnAddCustomField = document.getElementById('btn-add-custom-field');
    const customFieldsContainer = document.getElementById('custom-fields-dynamic-container');

    if (btnAddCustomField) {
      btnAddCustomField.addEventListener('click', () => {
        const fieldName = prompt('Enter custom equipment field name:', 'Design Pressure');
        if (fieldName && fieldName.trim() !== '') {
          const cleanName = fieldName.trim();
          const newRow = document.createElement('div');
          newRow.className = 'custom-field-row';
          newRow.innerHTML = `
            <span class="custom-field-name">${cleanName}</span>
            <input type="text" class="glove-input custom-field-input" style="min-height:44px; width:120px; font-size:var(--text-sm); padding:0 var(--space-sm);" placeholder="Value">
          `;
          customFieldsContainer.appendChild(newRow);
          triggerHaptic(100, `Added field: ${cleanName}`);
        }
      });
    }

    // Physical home button simulation to reset app state
    document.querySelector('.phone-home-button').addEventListener('click', () => {
      triggerHaptic(150, 'System reset');
      resetInputs();
      if (currentVariant === 'C') {
        goToWizardStep(1);
      }
      document.querySelector('.form-overlay').classList.add('hidden');
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't capture keyboard actions if in input fields
      const isInput = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (isInput) return;

      const key = e.key.toLowerCase();

      if (e.key === 'ArrowLeft') {
        cycleVariant('prev');
      } else if (e.key === 'ArrowRight') {
        cycleVariant('next');
      } else if (key === 's') {
        // Toggle sunlight mode
        themeOptions.forEach(btn => btn.classList.remove('active'));
        let targetTheme = 'sunlight';
        if (activeTheme === 'sunlight') {
          targetTheme = 'light';
        }
        document.querySelector(`.theme-toggle-option[data-theme="${targetTheme}"]`).classList.add('active');
        appViewport.setAttribute('data-theme', targetTheme);
        activeTheme = targetTheme;
        triggerHaptic(80, `Sunlight override toggled: ${targetTheme}`);
      } else if (key === 'g') {
        glareOverlay.classList.toggle('glare-overlay-active');
        toggleGlareBtn.classList.toggle('active');
        const isActive = glareOverlay.classList.contains('glare-overlay-active');
        triggerHaptic(100, isActive ? 'Solar glare enabled' : 'Solar glare disabled');
      } else if (key === 'l') {
        triggerOcrScan();
      } else if (key === 'r') {
        resetInputs();
        triggerHaptic(100, 'Form data wiped');
      }
    });
  }

  // Start the prototype logic
  init();
});
