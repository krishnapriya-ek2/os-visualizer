/**
 * OS SCHEDULING VISUALIZER - JAVASCRIPT ENGINE
 * MCA Academic Assignment Project
 * 
 * Includes:
 * 1. Disk Scheduling Algorithms: FCFS, SSTF, SCAN, C-SCAN, LOOK
 * 2. CPU Scheduling Algorithms: FCFS, Non-Preemptive SJF, Round Robin
 * 3. Interactive Step-by-Step Playback Controller (Prev, Next, Play, Pause, Reset)
 * 4. Chart.js Graphs (Textbook Zigzag Seek Chart, Comparison Bar Charts)
 * 5. Physical Track & Interactive Gantt Timeline Renderers
 * 6. Input Validation & Telemetry Benchmarks
 */

// ============================================================================
// GLOBAL STATE & INITIALIZATION
// ============================================================================

const AppState = {
  // Navigation
  activeTab: 'disk-tab',

  // Disk Simulation State
  disk: {
    size: 200,
    head: 50,
    direction: 'right',
    algorithm: 'SCAN',
    requests: [82, 170, 43, 140, 24, 16, 190],
    result: null, // Full algorithm execution result
    currentStep: 0,
    isPlaying: false,
    timer: null,
    speed: 800, // ms
    comparisonResults: {}
  },

  // CPU Simulation State
  cpu: {
    algorithm: 'SJF',
    quantum: 2,
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 6, priority: 2 },
      { id: 'P2', arrivalTime: 1, burstTime: 8, priority: 1 },
      { id: 'P3', arrivalTime: 2, burstTime: 3, priority: 4 },
      { id: 'P4', arrivalTime: 3, burstTime: 4, priority: 3 }
    ],
    result: null,
    currentStep: 0,
    isPlaying: false,
    timer: null,
    speed: 800, // ms
    comparisonResults: {}
  },

  // Chart References
  charts: {
    diskSeek: null,
    diskComparison: null,
    cpuComparison: null,
    benchmarkDisk: null,
    benchmarkCpu: null
  }
};

// ============================================================================
// DOM CONTENT LOADED ENTRY POINT
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initDiskModule();
  initCpuModule();
  initBenchmarkModule();
  initPresets();

  // Run initial default simulations so dashboard is populated immediately
  runDiskSimulation();
  runCpuSimulation();
  
  showToast('OS Scheduling Visualizer loaded successfully', 'info');
});

// ============================================================================
// NAVIGATION & TABS
// ============================================================================

function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  const quickPresetBtn = document.getElementById('quick-preset-btn');
  if (quickPresetBtn) {
    quickPresetBtn.addEventListener('click', () => {
      loadDiskPreset('textbook-silberschatz');
      loadCpuPreset('standard-academic');
      switchTab('disk-tab');
      showToast('Loaded standard textbook presets', 'success');
    });
  }
}

function switchTab(targetTabId) {
  AppState.activeTab = targetTabId;

  // Update tabs active state
  document.querySelectorAll('.nav-tab').forEach(tab => {
    const isTarget = tab.getAttribute('data-tab') === targetTabId;
    tab.classList.toggle('active', isTarget);
    tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  // Update section views
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.toggle('active', section.id === targetTabId);
  });

  // Resize charts if tab becomes visible
  setTimeout(() => {
    Object.values(AppState.charts).forEach(chart => {
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });
  }, 100);

  if (targetTabId === 'compare-tab') {
    runUnifiedBenchmarks();
  }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3200);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================================
// DISK SCHEDULING ALGORITHMS
// ============================================================================

/**
 * 1. FCFS (First-Come, First-Served)
 */
function solveDiskFCFS(head, requests) {
  const sequence = [head, ...requests];
  const steps = [];
  let totalMovement = 0;

  for (let i = 1; i < sequence.length; i++) {
    const from = sequence[i - 1];
    const to = sequence[i];
    const seek = Math.abs(to - from);
    totalMovement += seek;
    steps.push({
      step: i,
      from,
      to,
      seek,
      cumulativeMovement: totalMovement,
      isBoundary: false,
      note: `Move from ${from} to ${to}`
    });
  }

  return {
    algorithm: 'FCFS',
    sequence,
    steps,
    totalMovement,
    avgSeek: requests.length ? (totalMovement / requests.length).toFixed(2) : 0,
    boundaryHits: 0
  };
}

/**
 * 2. SSTF (Shortest Seek Time First)
 */
function solveDiskSSTF(head, requests, direction = 'right') {
  const remaining = [...requests];
  const sequence = [head];
  const steps = [];
  let current = head;
  let totalMovement = 0;
  let stepIndex = 1;

  while (remaining.length > 0) {
    let minDiff = Infinity;
    let chosenIdx = -1;

    for (let i = 0; i < remaining.length; i++) {
      const diff = Math.abs(remaining[i] - current);
      if (diff < minDiff) {
        minDiff = diff;
        chosenIdx = i;
      } else if (diff === minDiff) {
        // Consistent tie-breaker: prefer direction
        if (direction === 'right' && remaining[i] > remaining[chosenIdx]) {
          chosenIdx = i;
        } else if (direction === 'left' && remaining[i] < remaining[chosenIdx]) {
          chosenIdx = i;
        }
      }
    }

    const nextCylinder = remaining.splice(chosenIdx, 1)[0];
    const seek = Math.abs(nextCylinder - current);
    totalMovement += seek;

    sequence.push(nextCylinder);
    steps.push({
      step: stepIndex++,
      from: current,
      to: nextCylinder,
      seek,
      cumulativeMovement: totalMovement,
      isBoundary: false,
      note: `Closest cylinder from ${current} is ${nextCylinder}`
    });

    current = nextCylinder;
  }

  return {
    algorithm: 'SSTF',
    sequence,
    steps,
    totalMovement,
    avgSeek: requests.length ? (totalMovement / requests.length).toFixed(2) : 0,
    boundaryHits: 0
  };
}

/**
 * 3. SCAN (Elevator Algorithm)
 */
function solveDiskSCAN(head, requests, diskSize, direction = 'right') {
  const left = requests.filter(r => r < head).sort((a, b) => a - b);
  const right = requests.filter(r => r >= head).sort((a, b) => a - b);

  const sequence = [head];
  let boundaryHits = 0;

  if (direction === 'right') {
    // Service to the right in ascending order
    right.forEach(r => sequence.push(r));

    // If there are requests to the left, arm sweeps to disk boundary (diskSize - 1)
    if (left.length > 0) {
      const maxCylinder = diskSize - 1;
      if (sequence[sequence.length - 1] !== maxCylinder) {
        sequence.push(maxCylinder);
        boundaryHits++;
      }
      // Reverses and services left in descending order
      for (let i = left.length - 1; i >= 0; i--) {
        sequence.push(left[i]);
      }
    }
  } else {
    // Direction is left: service left in descending order
    for (let i = left.length - 1; i >= 0; i--) {
      sequence.push(left[i]);
    }

    // If there are requests to the right, sweep down to 0
    if (right.length > 0) {
      if (sequence[sequence.length - 1] !== 0) {
        sequence.push(0);
        boundaryHits++;
      }
      // Reverses and services right in ascending order
      right.forEach(r => sequence.push(r));
    }
  }

  return computeDiskSteps('SCAN', sequence, requests.length, boundaryHits, diskSize);
}

/**
 * 4. C-SCAN (Circular SCAN)
 */
function solveDiskCSCAN(head, requests, diskSize, direction = 'right') {
  const left = requests.filter(r => r < head).sort((a, b) => a - b);
  const right = requests.filter(r => r >= head).sort((a, b) => a - b);

  const sequence = [head];
  let boundaryHits = 0;

  if (direction === 'right') {
    right.forEach(r => sequence.push(r));

    if (left.length > 0) {
      const maxCylinder = diskSize - 1;
      if (sequence[sequence.length - 1] !== maxCylinder) {
        sequence.push(maxCylinder);
        boundaryHits++;
      }
      // Jump to opposite cylinder 0
      sequence.push(0);
      boundaryHits++;

      // Continue servicing in right (increasing) direction
      left.forEach(r => sequence.push(r));
    }
  } else {
    for (let i = left.length - 1; i >= 0; i--) {
      sequence.push(left[i]);
    }

    if (right.length > 0) {
      if (sequence[sequence.length - 1] !== 0) {
        sequence.push(0);
        boundaryHits++;
      }
      // Jump to opposite cylinder (diskSize - 1)
      const maxCylinder = diskSize - 1;
      sequence.push(maxCylinder);
      boundaryHits++;

      // Continue servicing in left (decreasing) direction
      for (let i = right.length - 1; i >= 0; i--) {
        sequence.push(right[i]);
      }
    }
  }

  return computeDiskSteps('C-SCAN', sequence, requests.length, boundaryHits, diskSize);
}

/**
 * 5. LOOK (Optimized SCAN)
 */
function solveDiskLOOK(head, requests, diskSize, direction = 'right') {
  const left = requests.filter(r => r < head).sort((a, b) => a - b);
  const right = requests.filter(r => r >= head).sort((a, b) => a - b);

  const sequence = [head];

  if (direction === 'right') {
    right.forEach(r => sequence.push(r));
    if (left.length > 0) {
      // Reverses directly at the highest request, no boundary hit!
      for (let i = left.length - 1; i >= 0; i--) {
        sequence.push(left[i]);
      }
    }
  } else {
    for (let i = left.length - 1; i >= 0; i--) {
      sequence.push(left[i]);
    }
    if (right.length > 0) {
      // Reverses directly at lowest request, no boundary hit!
      right.forEach(r => sequence.push(r));
    }
  }

  return computeDiskSteps('LOOK', sequence, requests.length, 0, diskSize);
}

/**
 * Helper to compute steps, seeks, and metrics for a generated sequence
 */
function computeDiskSteps(algoName, sequence, originalRequestCount, boundaryHits, diskSize) {
  const steps = [];
  let totalMovement = 0;

  for (let i = 1; i < sequence.length; i++) {
    const from = sequence[i - 1];
    const to = sequence[i];
    const seek = Math.abs(to - from);
    totalMovement += seek;

    const isBoundary = (to === 0 || to === diskSize - 1) && !isOriginalRequest(to, AppState.disk.requests);

    steps.push({
      step: i,
      from,
      to,
      seek,
      cumulativeMovement: totalMovement,
      isBoundary,
      note: isBoundary ? `Reached disk boundary cylinder ${to}` : `Serviced cylinder ${to} (Seek: ${seek})`
    });
  }

  return {
    algorithm: algoName,
    sequence,
    steps,
    totalMovement,
    avgSeek: originalRequestCount ? (totalMovement / originalRequestCount).toFixed(2) : 0,
    boundaryHits
  };
}

function isOriginalRequest(cylinder, requests) {
  return requests.includes(cylinder);
}

// ============================================================================
// DISK MODULE CONTROLLER & UI
// ============================================================================

function initDiskModule() {
  // Input elements
  const diskSizeInput = document.getElementById('disk-size');
  const diskHeadInput = document.getElementById('disk-head');
  const diskAlgoSelect = document.getElementById('disk-algorithm');
  const diskDirSelect = document.getElementById('disk-direction');
  const diskRequestsInput = document.getElementById('disk-requests');

  // Buttons
  const simulateBtn = document.getElementById('disk-simulate-btn');
  const compareAllBtn = document.getElementById('disk-compare-all-btn');
  const resetBtn = document.getElementById('disk-reset-btn');
  const randomQueueBtn = document.getElementById('disk-random-queue-btn');
  const presetSelect = document.getElementById('disk-preset-select');

  // Playback buttons
  const prevBtn = document.getElementById('disk-step-prev');
  const nextBtn = document.getElementById('disk-step-next');
  const playBtn = document.getElementById('disk-auto-play');
  const resetPlaybackBtn = document.getElementById('disk-playback-reset');
  const speedSelect = document.getElementById('disk-speed-select');

  // Synchronize disk size with head max attribute
  diskSizeInput.addEventListener('change', () => {
    const size = parseInt(diskSizeInput.value, 10) || 200;
    diskHeadInput.max = size - 1;
    document.getElementById('disk-head-range-hint').textContent = `Valid range: 0 to ${size - 1}`;
    document.getElementById('track-max-boundary').textContent = size - 1;
  });

  simulateBtn.addEventListener('click', runDiskSimulation);
  compareAllBtn.addEventListener('click', () => {
    runDiskSimulation();
    const compSection = document.getElementById('disk-comparison-section');
    if (compSection) {
      compSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  resetBtn.addEventListener('click', () => {
    diskSizeInput.value = 200;
    diskHeadInput.value = 50;
    diskAlgoSelect.value = 'SCAN';
    diskDirSelect.value = 'right';
    diskRequestsInput.value = '82, 170, 43, 140, 24, 16, 190';
    presetSelect.value = '';
    runDiskSimulation();
    showToast('Disk inputs reset to default', 'info');
  });

  randomQueueBtn.addEventListener('click', () => {
    const size = parseInt(diskSizeInput.value, 10) || 200;
    const count = 8;
    const randoms = [];
    while (randoms.length < count) {
      const val = Math.floor(Math.random() * (size - 10)) + 5;
      if (!randoms.includes(val)) randoms.push(val);
    }
    diskRequestsInput.value = randoms.join(', ');
    runDiskSimulation();
    showToast('Generated random cylinder queue', 'success');
  });

  presetSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      loadDiskPreset(e.target.value);
    }
  });

  // Playback Event Listeners
  prevBtn.addEventListener('click', () => stepDiskAnimation(-1));
  nextBtn.addEventListener('click', () => stepDiskAnimation(1));
  playBtn.addEventListener('click', toggleDiskAutoPlay);
  resetPlaybackBtn.addEventListener('click', () => setDiskStep(0));

  speedSelect.addEventListener('change', (e) => {
    AppState.disk.speed = parseInt(e.target.value, 10);
    if (AppState.disk.isPlaying) {
      pauseDiskAutoPlay();
      playDiskAutoPlay();
    }
  });

  // Keyboard navigation shortcuts
  document.addEventListener('keydown', (e) => {
    if (AppState.activeTab !== 'disk-tab') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      toggleDiskAutoPlay();
    } else if (e.code === 'ArrowRight') {
      stepDiskAnimation(1);
    } else if (e.code === 'ArrowLeft') {
      stepDiskAnimation(-1);
    }
  });
}

function loadDiskPreset(presetKey) {
  const diskSizeInput = document.getElementById('disk-size');
  const diskHeadInput = document.getElementById('disk-head');
  const diskRequestsInput = document.getElementById('disk-requests');
  const diskDirSelect = document.getElementById('disk-direction');

  if (presetKey === 'textbook-silberschatz') {
    diskSizeInput.value = 200;
    diskHeadInput.value = 53;
    diskRequestsInput.value = '98, 183, 37, 122, 14, 124, 65, 67';
    diskDirSelect.value = 'right';
  } else if (presetKey === 'galvin-standard') {
    diskSizeInput.value = 200;
    diskHeadInput.value = 50;
    diskRequestsInput.value = '82, 170, 43, 140, 24, 16, 190';
    diskDirSelect.value = 'right';
  } else if (presetKey === 'clustered') {
    diskSizeInput.value = 200;
    diskHeadInput.value = 100;
    diskRequestsInput.value = '95, 105, 92, 108, 97, 102, 115, 20';
    diskDirSelect.value = 'right';
  } else if (presetKey === 'edge-extremes') {
    diskSizeInput.value = 200;
    diskHeadInput.value = 100;
    diskRequestsInput.value = '1, 198, 5, 195, 10, 190, 2, 199';
    diskDirSelect.value = 'right';
  } else if (presetKey === 'random') {
    const size = parseInt(diskSizeInput.value, 10) || 200;
    const randoms = [];
    while (randoms.length < 8) {
      const val = Math.floor(Math.random() * (size - 10)) + 5;
      if (!randoms.includes(val)) randoms.push(val);
    }
    diskRequestsInput.value = randoms.join(', ');
  }

  runDiskSimulation();
}

/**
 * Validates disk inputs and runs all 5 algorithms + active selection
 */
function runDiskSimulation() {
  pauseDiskAutoPlay();

  const diskSize = parseInt(document.getElementById('disk-size').value, 10);
  const head = parseInt(document.getElementById('disk-head').value, 10);
  const rawRequests = document.getElementById('disk-requests').value.trim();
  const direction = document.getElementById('disk-direction').value;
  const algorithm = document.getElementById('disk-algorithm').value;

  // Validation
  if (isNaN(diskSize) || diskSize < 10) {
    showToast('Disk size must be an integer >= 10', 'error');
    return;
  }

  if (isNaN(head) || head < 0 || head >= diskSize) {
    showToast(`Initial head must be between 0 and ${diskSize - 1}`, 'error');
    return;
  }

  if (!rawRequests) {
    showToast('Request queue cannot be empty', 'error');
    return;
  }

  // Parse requests: supports comma or space separated
  const parts = rawRequests.split(/[\s,]+/).filter(Boolean);
  const requests = [];

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num)) {
      showToast(`Invalid cylinder request: "${part}"`, 'error');
      return;
    }
    if (num < 0 || num >= diskSize) {
      showToast(`Cylinder ${num} is out of bounds (0 to ${diskSize - 1})`, 'error');
      return;
    }
    requests.push(num);
  }

  if (requests.length === 0) {
    showToast('Please provide at least one valid cylinder request', 'error');
    return;
  }

  // Update AppState
  AppState.disk.size = diskSize;
  AppState.disk.head = head;
  AppState.disk.direction = direction;
  AppState.disk.algorithm = algorithm;
  AppState.disk.requests = requests;

  // Execute all 5 algorithms for comparison
  const results = {
    FCFS: solveDiskFCFS(head, requests),
    SSTF: solveDiskSSTF(head, requests, direction),
    SCAN: solveDiskSCAN(head, requests, diskSize, direction),
    'C-SCAN': solveDiskCSCAN(head, requests, diskSize, direction),
    LOOK: solveDiskLOOK(head, requests, diskSize, direction)
  };

  AppState.disk.comparisonResults = results;
  AppState.disk.result = results[algorithm];
  AppState.disk.currentStep = AppState.disk.result.sequence.length - 1; // Default to full path

  // Render Telemetry & UI
  updateDiskTelemetry(AppState.disk.result);
  renderDiskPhysicalTrack(AppState.disk.size, AppState.disk.requests, AppState.disk.result);
  renderDiskSeekChart(AppState.disk.result);
  renderDiskComparison(results);

  setDiskStep(0); // Start at initial head for step animation
}

function updateDiskTelemetry(result) {
  document.getElementById('disk-algo-tag').textContent = result.algorithm;
  document.getElementById('disk-total-movement').textContent = result.totalMovement;
  document.getElementById('disk-avg-seek').textContent = result.avgSeek;
  document.getElementById('disk-serviced-count').textContent = AppState.disk.requests.length;
  document.getElementById('disk-direction-metric').textContent = 
    AppState.disk.direction === 'right' ? 'Right (Increasing) →' : '← Left (Decreasing)';

  // Render Sequence Pills
  const container = document.getElementById('disk-sequence-list');
  container.innerHTML = '';

  result.sequence.forEach((cyl, idx) => {
    const pill = document.createElement('span');
    pill.className = 'seq-pill';
    pill.id = `disk-seq-pill-${idx}`;

    if (idx === 0) {
      pill.classList.add('initial-head');
      pill.innerHTML = `<i class="fa-solid fa-play"></i> Head: ${cyl}`;
    } else {
      const isBoundary = (cyl === 0 || cyl === AppState.disk.size - 1) && !AppState.disk.requests.includes(cyl);
      if (isBoundary) {
        pill.classList.add('boundary-hit');
        pill.innerHTML = `<i class="fa-solid fa-arrows-split-up-and-left"></i> End: ${cyl}`;
      } else {
        const delta = Math.abs(cyl - result.sequence[idx - 1]);
        pill.innerHTML = `${cyl} <span class="font-mono text-dim">(+${delta})</span>`;
      }
    }

    container.appendChild(pill);

    if (idx < result.sequence.length - 1) {
      const arrow = document.createElement('span');
      arrow.className = 'seq-arrow';
      arrow.innerHTML = '→';
      container.appendChild(arrow);
    }
  });
}

/**
 * Renders physical cylinder track with request pins and moving head pointer
 */
function renderDiskPhysicalTrack(diskSize, requests, result) {
  const pinsLayer = document.getElementById('track-request-pins');
  pinsLayer.innerHTML = '';

  document.getElementById('track-max-boundary').textContent = diskSize - 1;

  // Add pins for all requests
  requests.forEach(cyl => {
    const pin = document.createElement('div');
    pin.className = 'track-pin';
    pin.id = `track-pin-${cyl}`;
    pin.setAttribute('data-cylinder', cyl);
    const leftPercent = (cyl / (diskSize - 1)) * 100;
    pin.style.left = `${leftPercent}%`;
    pinsLayer.appendChild(pin);
  });

  // If boundary hits exist, highlight boundary pins
  if (result.sequence.includes(0)) {
    const pin0 = document.createElement('div');
    pin0.className = 'track-pin boundary-pin';
    pin0.setAttribute('data-cylinder', 0);
    pin0.style.left = '0%';
    pinsLayer.appendChild(pin0);
  }

  if (result.sequence.includes(diskSize - 1)) {
    const pinMax = document.createElement('div');
    pinMax.className = 'track-pin boundary-pin';
    pinMax.setAttribute('data-cylinder', diskSize - 1);
    pinMax.style.left = '100%';
    pinsLayer.appendChild(pinMax);
  }
}

/**
 * Updates head arm position and step highlights on physical track
 */
function updateDiskTrackHeadPosition(stepIndex) {
  const result = AppState.disk.result;
  if (!result) return;

  const currentCylinder = result.sequence[stepIndex];
  const diskSize = AppState.disk.size;
  const headArm = document.getElementById('disk-head-arm');
  const headDisplay = document.getElementById('current-head-display');
  const seekDeltaDisplay = document.getElementById('current-seek-delta');

  const leftPercent = (currentCylinder / (diskSize - 1)) * 100;
  headArm.style.left = `${leftPercent}%`;
  headArm.querySelector('.head-label').textContent = currentCylinder;
  headDisplay.textContent = currentCylinder;

  if (stepIndex > 0) {
    const prevCylinder = result.sequence[stepIndex - 1];
    const seek = Math.abs(currentCylinder - prevCylinder);
    seekDeltaDisplay.textContent = `(Seek: ${seek} cyls)`;
  } else {
    seekDeltaDisplay.textContent = '(Initial Head)';
  }

  // Update visited pins
  const visitedUpToNow = result.sequence.slice(0, stepIndex + 1);
  document.querySelectorAll('.track-pin').forEach(pin => {
    const cyl = parseInt(pin.getAttribute('data-cylinder'), 10);
    if (visitedUpToNow.includes(cyl)) {
      pin.classList.add('visited');
    } else {
      pin.classList.remove('visited');
    }
  });

  // Update active pill in sequence list
  document.querySelectorAll('.seq-pill').forEach((pill, idx) => {
    pill.classList.toggle('active', idx === stepIndex);
    pill.classList.toggle('visited', idx < stepIndex);
  });

  // Update step badge
  const stepBadge = document.getElementById('disk-step-badge');
  if (stepBadge) {
    stepBadge.textContent = `Step ${stepIndex} / ${result.sequence.length - 1}`;
  }

  // Update running seek total
  const runningSeek = stepIndex === 0 ? 0 : result.steps[stepIndex - 1].cumulativeMovement;
  document.getElementById('disk-total-movement').textContent = runningSeek;
}

// ============================================================================
// DISK STEP PLAYBACK CONTROLS
// ============================================================================

function setDiskStep(step) {
  const result = AppState.disk.result;
  if (!result) return;

  const maxStep = result.sequence.length - 1;
  const clampedStep = Math.max(0, Math.min(step, maxStep));
  AppState.disk.currentStep = clampedStep;

  updateDiskTrackHeadPosition(clampedStep);
  updateDiskSeekChartStep(clampedStep);

  // If reached end, pause auto play
  if (clampedStep === maxStep && AppState.disk.isPlaying) {
    pauseDiskAutoPlay();
  }
}

function stepDiskAnimation(delta) {
  pauseDiskAutoPlay();
  setDiskStep(AppState.disk.currentStep + delta);
}

function toggleDiskAutoPlay() {
  if (AppState.disk.isPlaying) {
    pauseDiskAutoPlay();
  } else {
    playDiskAutoPlay();
  }
}

function playDiskAutoPlay() {
  const result = AppState.disk.result;
  if (!result) return;

  if (AppState.disk.currentStep >= result.sequence.length - 1) {
    setDiskStep(0);
  }

  AppState.disk.isPlaying = true;
  const playBtn = document.getElementById('disk-auto-play');
  playBtn.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Pause</span>';
  playBtn.classList.remove('btn-primary');
  playBtn.classList.add('btn-secondary');

  AppState.disk.timer = setInterval(() => {
    if (AppState.disk.currentStep < result.sequence.length - 1) {
      setDiskStep(AppState.disk.currentStep + 1);
    } else {
      pauseDiskAutoPlay();
    }
  }, AppState.disk.speed);
}

function pauseDiskAutoPlay() {
  AppState.disk.isPlaying = false;
  clearInterval(AppState.disk.timer);
  AppState.disk.timer = null;

  const playBtn = document.getElementById('disk-auto-play');
  if (playBtn) {
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Auto Play</span>';
    playBtn.classList.remove('btn-secondary');
    playBtn.classList.add('btn-primary');
  }
}

// ============================================================================
// DISK CHART.JS INTEGRATIONS
// ============================================================================

/**
 * Renders the classic Silberschatz OS Textbook Seek Trajectory Chart
 * In textbooks, cylinder position is on the horizontal axis (0 to Max),
 * and the seek steps/time proceed downwards (inverted Y axis).
 */
function renderDiskSeekChart(result) {
  const ctx = document.getElementById('diskSeekChart');
  if (!ctx) return;

  if (AppState.charts.diskSeek) {
    AppState.charts.diskSeek.destroy();
  }

  const stepsData = result.sequence.map((cyl, idx) => ({
    x: cyl,
    y: idx
  }));

  AppState.charts.diskSeek = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: `${result.algorithm} Head Path`,
          data: stepsData,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          pointBackgroundColor: result.sequence.map((_, idx) => idx === 0 ? '#38bdf8' : '#8b5cf6'),
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#06b6d4',
          pointRadius: 6,
          pointHoverRadius: 9,
          borderWidth: 2.5,
          tension: 0, // Direct straight zigzag lines as in OS textbooks
          stepped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#111a2e',
          titleColor: '#38bdf8',
          bodyColor: '#cbd5e1',
          borderColor: '#223758',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: (items) => `Step ${items[0].raw.y}: Cylinder ${items[0].raw.x}`,
            label: (item) => {
              const idx = item.raw.y;
              if (idx === 0) return 'Initial Head Position';
              const prev = result.sequence[idx - 1];
              return `Seek: ${Math.abs(item.raw.x - prev)} cylinders (from ${prev})`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: AppState.disk.size - 1,
          title: {
            display: true,
            text: 'Cylinder Position (0 to Disk Size - 1)',
            color: '#94a3b8',
            font: { family: 'Inter', size: 12, weight: '600' }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.06)'
          },
          ticks: {
            color: '#94a3b8',
            font: { family: 'JetBrains Mono', size: 11 }
          }
        },
        y: {
          type: 'linear',
          reverse: true, // Steps start at 0 (top) and move downwards (bottom)
          min: 0,
          max: result.sequence.length - 1,
          title: {
            display: true,
            text: 'Execution Step (Time Progression ↓)',
            color: '#94a3b8',
            font: { family: 'Inter', size: 12, weight: '600' }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.06)'
          },
          ticks: {
            stepSize: 1,
            color: '#94a3b8',
            font: { family: 'JetBrains Mono', size: 11 }
          }
        }
      }
    }
  });
}

function updateDiskSeekChartStep(stepIndex) {
  const chart = AppState.charts.diskSeek;
  const result = AppState.disk.result;
  if (!chart || !result) return;

  // Highlight points up to current step
  const pointColors = result.sequence.map((_, idx) => {
    if (idx === stepIndex) return '#f59e0b'; // Amber for active
    if (idx < stepIndex) return '#10b981';  // Emerald for visited
    return '#475569'; // Muted for unvisited
  });

  const pointRadii = result.sequence.map((_, idx) => {
    if (idx === stepIndex) return 9;
    if (idx <= stepIndex) return 6;
    return 4;
  });

  chart.data.datasets[0].pointBackgroundColor = pointColors;
  chart.data.datasets[0].pointRadius = pointRadii;
  chart.update('none');
}

/**
 * Renders Comparison Table and Bar Chart for all 5 Disk Algorithms
 */
function renderDiskComparison(results) {
  const tbody = document.getElementById('disk-comparison-tbody');
  tbody.innerHTML = '';

  const algoNames = ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK'];
  let minMovement = Infinity;
  let winner = '';

  algoNames.forEach(name => {
    const res = results[name];
    if (res.totalMovement < minMovement) {
      minMovement = res.totalMovement;
      winner = name;
    }
  });

  // Populate Table
  algoNames.forEach(name => {
    const res = results[name];
    const isWinner = name === winner;
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>
        <strong>${name}</strong>
        ${isWinner ? '<span class="badge badge-emerald ml-1">★ Winner</span>' : ''}
      </td>
      <td class="font-mono text-cyan font-bold">${res.totalMovement} cyls</td>
      <td class="font-mono">${res.avgSeek}</td>
      <td class="font-mono">${res.boundaryHits}</td>
      <td class="font-mono text-dim" style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${res.sequence.join(' → ')}">
        ${res.sequence.join(' → ')}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Winner badge
  const winnerBadge = document.getElementById('disk-winner-badge');
  if (winnerBadge) {
    winnerBadge.textContent = `🏆 Most Efficient: ${winner} (${minMovement} Cylinders)`;
  }

  // Render Bar Chart
  const ctx = document.getElementById('diskComparisonChart');
  if (!ctx) return;

  if (AppState.charts.diskComparison) {
    AppState.charts.diskComparison.destroy();
  }

  const movements = algoNames.map(name => results[name].totalMovement);
  const colors = [
    'rgba(6, 182, 212, 0.75)',
    'rgba(139, 92, 246, 0.75)',
    'rgba(16, 185, 129, 0.75)',
    'rgba(245, 158, 11, 0.75)',
    'rgba(244, 63, 94, 0.75)'
  ];

  AppState.charts.diskComparison = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: algoNames,
      datasets: [
        {
          label: 'Total Head Movement (Cylinders)',
          data: movements,
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.75', '1')),
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111a2e',
          titleColor: '#38bdf8',
          bodyColor: '#cbd5e1',
          borderColor: '#223758',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#cbd5e1', font: { family: 'Inter', weight: '600' } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } }
        }
      }
    }
  });
}

// ============================================================================
// CPU SCHEDULING ALGORITHMS
// ============================================================================

/**
 * 1. CPU FCFS (First-Come, First-Served)
 */
function solveCpuFCFS(processes) {
  // Sort by Arrival Time, then original index
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime || a.originalIndex - b.originalIndex);
  
  let currentTime = 0;
  const gantt = [];
  const metrics = {};

  sorted.forEach(p => {
    // Check for CPU Idle gap
    if (currentTime < p.arrivalTime) {
      gantt.push({
        pid: 'IDLE',
        start: currentTime,
        end: p.arrivalTime,
        duration: p.arrivalTime - currentTime,
        isIdle: true
      });
      currentTime = p.arrivalTime;
    }

    const start = currentTime;
    const end = start + p.burstTime;

    gantt.push({
      pid: p.id,
      start,
      end,
      duration: p.burstTime,
      isIdle: false
    });

    const completionTime = end;
    const turnaroundTime = completionTime - p.arrivalTime;
    const waitingTime = turnaroundTime - p.burstTime;
    const responseTime = start - p.arrivalTime;

    metrics[p.id] = {
      id: p.id,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      completionTime,
      turnaroundTime,
      waitingTime,
      responseTime
    };

    currentTime = end;
  });

  return computeCpuSummary('FCFS', processes, gantt, metrics, currentTime);
}

/**
 * 2. CPU SJF (Shortest Job First - Non-Preemptive)
 */
function solveCpuSJF(processes) {
  const n = processes.length;
  const completed = new Set();
  let currentTime = 0;
  const gantt = [];
  const metrics = {};

  while (completed.size < n) {
    // Find all arrived, uncompleted processes
    const available = processes.filter(p => !completed.has(p.id) && p.arrivalTime <= currentTime);

    if (available.length === 0) {
      // Find earliest arrival time among remaining processes
      const remaining = processes.filter(p => !completed.has(p.id));
      const nextArrival = Math.min(...remaining.map(p => p.arrivalTime));

      gantt.push({
        pid: 'IDLE',
        start: currentTime,
        end: nextArrival,
        duration: nextArrival - currentTime,
        isIdle: true
      });
      currentTime = nextArrival;
      continue;
    }

    // Pick process with shortest burst time. Tie breaker: arrival time, then originalIndex
    available.sort((a, b) => 
      a.burstTime - b.burstTime || 
      a.arrivalTime - b.arrivalTime || 
      a.originalIndex - b.originalIndex
    );

    const chosen = available[0];
    const start = currentTime;
    const end = start + chosen.burstTime;

    gantt.push({
      pid: chosen.id,
      start,
      end,
      duration: chosen.burstTime,
      isIdle: false
    });

    const completionTime = end;
    const turnaroundTime = completionTime - chosen.arrivalTime;
    const waitingTime = turnaroundTime - chosen.burstTime;
    const responseTime = start - chosen.arrivalTime;

    metrics[chosen.id] = {
      id: chosen.id,
      arrivalTime: chosen.arrivalTime,
      burstTime: chosen.burstTime,
      priority: chosen.priority,
      completionTime,
      turnaroundTime,
      waitingTime,
      responseTime
    };

    completed.add(chosen.id);
    currentTime = end;
  }

  return computeCpuSummary('SJF', processes, gantt, metrics, currentTime);
}

/**
 * 3. CPU Round Robin (RR)
 */
function solveCpuRR(processes, quantum) {
  const n = processes.length;
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime || a.originalIndex - b.originalIndex);

  // Remaining burst times and tracking
  const remBT = {};
  const firstResponse = {};
  const metrics = {};
  processes.forEach(p => {
    remBT[p.id] = p.burstTime;
    firstResponse[p.id] = -1;
  });

  let currentTime = 0;
  const readyQueue = [];
  const enqueued = new Set();
  const gantt = [];
  let completedCount = 0;

  function enqueueArrived(time) {
    sorted.forEach(p => {
      if (!enqueued.has(p.id) && p.arrivalTime <= time) {
        readyQueue.push(p);
        enqueued.add(p.id);
      }
    });
  }

  enqueueArrived(currentTime);

  while (completedCount < n) {
    if (readyQueue.length === 0) {
      const remaining = sorted.filter(p => !enqueued.has(p.id));
      if (remaining.length > 0) {
        const nextArrival = Math.min(...remaining.map(p => p.arrivalTime));
        gantt.push({
          pid: 'IDLE',
          start: currentTime,
          end: nextArrival,
          duration: nextArrival - currentTime,
          isIdle: true
        });
        currentTime = nextArrival;
        enqueueArrived(currentTime);
      }
      continue;
    }

    const currentProc = readyQueue.shift();

    if (firstResponse[currentProc.id] === -1) {
      firstResponse[currentProc.id] = currentTime;
    }

    const execTime = Math.min(remBT[currentProc.id], quantum);
    const start = currentTime;
    const end = start + execTime;

    gantt.push({
      pid: currentProc.id,
      start,
      end,
      duration: execTime,
      isIdle: false
    });

    currentTime = end;
    remBT[currentProc.id] -= execTime;

    // Enqueue processes arriving while this slice was running
    enqueueArrived(currentTime);

    if (remBT[currentProc.id] > 0) {
      // Re-enqueue current process
      readyQueue.push(currentProc);
    } else {
      // Completed
      completedCount++;
      const completionTime = currentTime;
      const turnaroundTime = completionTime - currentProc.arrivalTime;
      const waitingTime = turnaroundTime - currentProc.burstTime;
      const responseTime = firstResponse[currentProc.id] - currentProc.arrivalTime;

      metrics[currentProc.id] = {
        id: currentProc.id,
        arrivalTime: currentProc.arrivalTime,
        burstTime: currentProc.burstTime,
        priority: currentProc.priority,
        completionTime,
        turnaroundTime,
        waitingTime,
        responseTime
      };
    }
  }

  return computeCpuSummary('RR', processes, gantt, metrics, currentTime);
}

/**
 * Summarizes CPU metrics and utilization
 */
function computeCpuSummary(algoName, processes, gantt, metrics, makespan) {
  const n = processes.length;
  let totalWT = 0;
  let totalTAT = 0;
  let totalRT = 0;
  let totalBusyTime = 0;

  processes.forEach(p => {
    const m = metrics[p.id];
    totalWT += m.waitingTime;
    totalTAT += m.turnaroundTime;
    totalRT += m.responseTime;
    totalBusyTime += p.burstTime;
  });

  const avgWT = n ? (totalWT / n).toFixed(2) : 0;
  const avgTAT = n ? (totalTAT / n).toFixed(2) : 0;
  const avgRT = n ? (totalRT / n).toFixed(2) : 0;
  const cpuUtilization = makespan > 0 ? ((totalBusyTime / makespan) * 100).toFixed(1) : 100;

  return {
    algorithm: algoName,
    gantt,
    metrics,
    makespan,
    avgWT,
    avgTAT,
    avgRT,
    cpuUtilization,
    processes
  };
}

// ============================================================================
// CPU MODULE CONTROLLER & UI
// ============================================================================

function initCpuModule() {
  const algoSelect = document.getElementById('cpu-algorithm');
  const quantumGroup = document.getElementById('quantum-form-group');
  const addRowBtn = document.getElementById('cpu-add-row-btn');
  const clearTableBtn = document.getElementById('cpu-clear-table-btn');
  const simulateBtn = document.getElementById('cpu-simulate-btn');
  const compareAllBtn = document.getElementById('cpu-compare-all-btn');
  const resetBtn = document.getElementById('cpu-reset-btn');
  const presetSelect = document.getElementById('cpu-preset-select');

  // Playback buttons
  const prevBtn = document.getElementById('cpu-step-prev');
  const nextBtn = document.getElementById('cpu-step-next');
  const playBtn = document.getElementById('cpu-auto-play');
  const resetPlaybackBtn = document.getElementById('cpu-playback-reset');
  const speedSelect = document.getElementById('cpu-speed-select');

  // Show/Hide Quantum input based on algorithm
  algoSelect.addEventListener('change', () => {
    const isRR = algoSelect.value === 'RR';
    quantumGroup.style.display = isRR ? 'block' : 'none';
  });

  addRowBtn.addEventListener('click', () => {
    const tbody = document.getElementById('process-table-body');
    const rowCount = tbody.querySelectorAll('tr').length;
    addProcessTableRow(`P${rowCount + 1}`, 0, 4, 1);
  });

  clearTableBtn.addEventListener('click', () => {
    document.getElementById('process-table-body').innerHTML = '';
    showToast('Process table cleared. Add at least one process.', 'info');
  });

  simulateBtn.addEventListener('click', runCpuSimulation);
  compareAllBtn.addEventListener('click', () => {
    runCpuSimulation();
    const compSection = document.getElementById('cpu-comparison-section');
    if (compSection) {
      compSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  resetBtn.addEventListener('click', () => {
    loadCpuPreset('standard-academic');
    showToast('CPU inputs reset to default', 'info');
  });

  presetSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      loadCpuPreset(e.target.value);
    }
  });

  // Gantt Playback Event Listeners
  prevBtn.addEventListener('click', () => stepCpuAnimation(-1));
  nextBtn.addEventListener('click', () => stepCpuAnimation(1));
  playBtn.addEventListener('click', toggleCpuAutoPlay);
  resetPlaybackBtn.addEventListener('click', () => setCpuStep(0));

  speedSelect.addEventListener('change', (e) => {
    AppState.cpu.speed = parseInt(e.target.value, 10);
    if (AppState.cpu.isPlaying) {
      pauseCpuAutoPlay();
      playCpuAutoPlay();
    }
  });

  // Populate initial table
  renderProcessInputTable(AppState.cpu.processes);
}

function renderProcessInputTable(processes) {
  const tbody = document.getElementById('process-table-body');
  tbody.innerHTML = '';
  processes.forEach(p => {
    addProcessTableRow(p.id, p.arrivalTime, p.burstTime, p.priority);
  });
}

function addProcessTableRow(pid, at = 0, bt = 4, priority = 1) {
  const tbody = document.getElementById('process-table-body');
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td>
      <input type="text" class="form-input-table pid-input" value="${escapeHtml(pid)}" required>
    </td>
    <td>
      <input type="number" class="form-input-table at-input" value="${at}" min="0" max="999" required>
    </td>
    <td>
      <input type="number" class="form-input-table bt-input" value="${bt}" min="1" max="999" required>
    </td>
    <td>
      <input type="number" class="form-input-table pr-input" value="${priority}" min="0" max="99">
    </td>
    <td>
      <button type="button" class="btn-delete-row" title="Delete Process">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </td>
  `;

  tr.querySelector('.btn-delete-row').addEventListener('click', () => {
    tr.remove();
  });

  tbody.appendChild(tr);
}

function loadCpuPreset(presetKey) {
  const algoSelect = document.getElementById('cpu-algorithm');
  const quantumInput = document.getElementById('cpu-quantum');
  const quantumGroup = document.getElementById('quantum-form-group');

  let list = [];

  if (presetKey === 'standard-academic') {
    list = [
      { id: 'P1', arrivalTime: 0, burstTime: 6, priority: 2 },
      { id: 'P2', arrivalTime: 1, burstTime: 8, priority: 1 },
      { id: 'P3', arrivalTime: 2, burstTime: 3, priority: 4 },
      { id: 'P4', arrivalTime: 3, burstTime: 4, priority: 3 }
    ];
    algoSelect.value = 'SJF';
    quantumInput.value = 2;
  } else if (presetKey === 'all-zero-arrival') {
    list = [
      { id: 'P1', arrivalTime: 0, burstTime: 8, priority: 1 },
      { id: 'P2', arrivalTime: 0, burstTime: 4, priority: 2 },
      { id: 'P3', arrivalTime: 0, burstTime: 9, priority: 3 },
      { id: 'P4', arrivalTime: 0, burstTime: 5, priority: 4 }
    ];
    algoSelect.value = 'FCFS';
  } else if (presetKey === 'idle-gaps') {
    list = [
      { id: 'P1', arrivalTime: 0, burstTime: 3, priority: 1 },
      { id: 'P2', arrivalTime: 6, burstTime: 4, priority: 2 },
      { id: 'P3', arrivalTime: 13, burstTime: 2, priority: 3 }
    ];
    algoSelect.value = 'FCFS';
  } else if (presetKey === 'round-robin-heavy') {
    list = [
      { id: 'P1', arrivalTime: 0, burstTime: 10, priority: 1 },
      { id: 'P2', arrivalTime: 1, burstTime: 5, priority: 2 },
      { id: 'P3', arrivalTime: 2, burstTime: 8, priority: 3 }
    ];
    algoSelect.value = 'RR';
    quantumInput.value = 3;
  } else if (presetKey === 'random-processes') {
    list = [];
    for (let i = 1; i <= 5; i++) {
      list.push({
        id: `P${i}`,
        arrivalTime: Math.floor(Math.random() * 8),
        burstTime: Math.floor(Math.random() * 9) + 2,
        priority: Math.floor(Math.random() * 5) + 1
      });
    }
  }

  quantumGroup.style.display = algoSelect.value === 'RR' ? 'block' : 'none';
  renderProcessInputTable(list);
  runCpuSimulation();
}

/**
 * Validates process table and executes CPU algorithms
 */
function runCpuSimulation() {
  pauseCpuAutoPlay();

  const rows = document.querySelectorAll('#process-table-body tr');
  if (rows.length === 0) {
    showToast('Add at least one process to simulate CPU scheduling', 'error');
    return;
  }

  const processes = [];
  const seenIds = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pid = row.querySelector('.pid-input').value.trim();
    const at = parseInt(row.querySelector('.at-input').value, 10);
    const bt = parseInt(row.querySelector('.bt-input').value, 10);
    const pr = parseInt(row.querySelector('.pr-input').value, 10) || 1;

    if (!pid) {
      showToast(`Row ${i + 1}: Process ID cannot be empty`, 'error');
      return;
    }

    if (seenIds.has(pid)) {
      showToast(`Duplicate Process ID detected: "${pid}". Use unique IDs.`, 'error');
      return;
    }
    seenIds.add(pid);

    if (isNaN(at) || at < 0) {
      showToast(`Process ${pid}: Arrival time must be >= 0`, 'error');
      return;
    }

    if (isNaN(bt) || bt <= 0) {
      showToast(`Process ${pid}: Burst time must be >= 1`, 'error');
      return;
    }

    processes.push({
      id: pid,
      arrivalTime: at,
      burstTime: bt,
      priority: pr,
      originalIndex: i
    });
  }

  const algorithm = document.getElementById('cpu-algorithm').value;
  const quantum = parseInt(document.getElementById('cpu-quantum').value, 10) || 2;

  if (algorithm === 'RR' && (isNaN(quantum) || quantum < 1)) {
    showToast('Time Quantum (Q) must be an integer >= 1', 'error');
    return;
  }

  // Update AppState
  AppState.cpu.algorithm = algorithm;
  AppState.cpu.quantum = quantum;
  AppState.cpu.processes = processes;

  // Run all 3 algorithms for side-by-side comparison
  const results = {
    FCFS: solveCpuFCFS(processes),
    SJF: solveCpuSJF(processes),
    RR: solveCpuRR(processes, quantum)
  };

  AppState.cpu.comparisonResults = results;
  AppState.cpu.result = results[algorithm];
  AppState.cpu.currentStep = AppState.cpu.result.gantt.length - 1;

  // Render Telemetry & UI
  updateCpuTelemetry(AppState.cpu.result);
  renderGanttChart(AppState.cpu.result);
  renderCpuResultsTable(AppState.cpu.result);
  renderCpuComparison(results);

  setCpuStep(0);
}

function updateCpuTelemetry(result) {
  document.getElementById('cpu-algo-tag').textContent = result.algorithm;
  document.getElementById('cpu-avg-wt').textContent = result.avgWT;
  document.getElementById('cpu-avg-tat').textContent = result.avgTAT;
  document.getElementById('cpu-utilization').textContent = `${result.cpuUtilization}%`;
  document.getElementById('cpu-makespan').textContent = result.makespan;
}

/**
 * Renders the Visual Animated Gantt Chart and Time Scale
 */
function renderGanttChart(result) {
  const container = document.getElementById('gantt-chart-container');
  const timeScale = document.getElementById('gantt-time-scale');
  container.innerHTML = '';
  timeScale.innerHTML = '';

  const totalDuration = result.makespan;
  if (totalDuration === 0) return;

  // Color mapping helper
  const pidColors = {};
  const palette = ['bg-p1', 'bg-p2', 'bg-p3', 'bg-p4', 'bg-p5', 'bg-p6', 'bg-p7', 'bg-p8'];
  AppState.cpu.processes.forEach((p, idx) => {
    pidColors[p.id] = palette[idx % palette.length];
  });

  // Render Gantt Blocks
  result.gantt.forEach((slice, idx) => {
    const block = document.createElement('div');
    block.className = 'gantt-block';
    block.id = `gantt-block-${idx}`;

    const widthPercent = (slice.duration / totalDuration) * 100;
    block.style.width = `${widthPercent}%`;

    if (slice.isIdle) {
      block.classList.add('idle-block');
      block.innerHTML = `
        <span class="gantt-pid">IDLE</span>
        <span class="gantt-duration">${slice.start}-${slice.end}</span>
      `;
    } else {
      block.classList.add(pidColors[slice.pid] || 'bg-p1');
      block.innerHTML = `
        <span class="gantt-pid">${slice.pid}</span>
        <span class="gantt-duration">${slice.start}-${slice.end}</span>
      `;
    }

    block.addEventListener('click', () => setCpuStep(idx));
    container.appendChild(block);
  });

  // Render Time Scale Ticks
  const timePoints = new Set([0]);
  result.gantt.forEach(slice => {
    timePoints.add(slice.start);
    timePoints.add(slice.end);
  });

  const sortedPoints = Array.from(timePoints).sort((a, b) => a - b);
  sortedPoints.forEach(t => {
    const tick = document.createElement('div');
    tick.className = 'time-tick';
    tick.textContent = t;
    const leftPercent = (t / totalDuration) * 100;
    tick.style.left = `${leftPercent}%`;
    timeScale.appendChild(tick);
  });
}

/**
 * Detailed Process Execution Calculation Matrix Table
 */
function renderCpuResultsTable(result) {
  const tbody = document.getElementById('cpu-results-tbody');
  const tfoot = document.getElementById('cpu-results-tfoot');
  tbody.innerHTML = '';

  result.processes.forEach(p => {
    const m = result.metrics[p.id];
    const tr = document.createElement('tr');
    tr.id = `cpu-result-row-${p.id}`;

    tr.innerHTML = `
      <td><strong>${p.id}</strong></td>
      <td class="font-mono">${p.arrivalTime}</td>
      <td class="font-mono">${p.burstTime}</td>
      <td class="font-mono">${p.priority}</td>
      <td class="font-mono text-cyan">${m.completionTime}</td>
      <td class="font-mono text-amber">${m.turnaroundTime}</td>
      <td class="font-mono text-emerald">${m.waitingTime}</td>
      <td class="font-mono">${m.responseTime}</td>
    `;
    tbody.appendChild(tr);
  });

  tfoot.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: right; color: var(--text-muted);">Averages (ms):</td>
      <td class="font-mono text-amber">${result.avgTAT}</td>
      <td class="font-mono text-emerald">${result.avgWT}</td>
      <td class="font-mono">${result.avgRT}</td>
    </tr>
  `;
}

// ============================================================================
// CPU STEP PLAYBACK CONTROLS
// ============================================================================

function setCpuStep(stepIndex) {
  const result = AppState.cpu.result;
  if (!result) return;

  const maxStep = result.gantt.length - 1;
  const clampedStep = Math.max(0, Math.min(stepIndex, maxStep));
  AppState.cpu.currentStep = clampedStep;

  // Highlight active Gantt block
  document.querySelectorAll('.gantt-block').forEach((block, idx) => {
    block.classList.toggle('active-slice', idx === clampedStep);
    block.style.opacity = idx <= clampedStep ? '1' : '0.4';
  });

  const currentSlice = result.gantt[clampedStep];
  const timeBadge = document.getElementById('cpu-queue-time-badge');
  if (timeBadge) {
    timeBadge.textContent = `Time T = ${currentSlice.end} (Active: ${currentSlice.pid})`;
  }

  // Update Ready Queue display at time slice.end
  updateReadyQueueDisplay(currentSlice.end);

  if (clampedStep === maxStep && AppState.cpu.isPlaying) {
    pauseCpuAutoPlay();
  }
}

function updateReadyQueueDisplay(currentTime) {
  const container = document.getElementById('cpu-ready-queue-display');
  container.innerHTML = '';

  const arrivedProcesses = AppState.cpu.processes.filter(p => p.arrivalTime <= currentTime);

  if (arrivedProcesses.length === 0) {
    container.innerHTML = '<span class="empty-state-text">No processes arrived yet</span>';
    return;
  }

  arrivedProcesses.forEach(p => {
    const pill = document.createElement('span');
    pill.className = 'seq-pill';
    pill.innerHTML = `<i class="fa-solid fa-cube text-cyan"></i> ${p.id} <span class="font-mono text-dim">(AT:${p.arrivalTime}, BT:${p.burstTime})</span>`;
    container.appendChild(pill);
  });
}

function stepCpuAnimation(delta) {
  pauseCpuAutoPlay();
  setCpuStep(AppState.cpu.currentStep + delta);
}

function toggleCpuAutoPlay() {
  if (AppState.cpu.isPlaying) {
    pauseCpuAutoPlay();
  } else {
    playCpuAutoPlay();
  }
}

function playCpuAutoPlay() {
  const result = AppState.cpu.result;
  if (!result) return;

  if (AppState.cpu.currentStep >= result.gantt.length - 1) {
    setCpuStep(0);
  }

  AppState.cpu.isPlaying = true;
  const playBtn = document.getElementById('cpu-auto-play');
  playBtn.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Pause</span>';
  playBtn.classList.remove('btn-primary');
  playBtn.classList.add('btn-secondary');

  AppState.cpu.timer = setInterval(() => {
    if (AppState.cpu.currentStep < result.gantt.length - 1) {
      setCpuStep(AppState.cpu.currentStep + 1);
    } else {
      pauseCpuAutoPlay();
    }
  }, AppState.cpu.speed);
}

function pauseCpuAutoPlay() {
  AppState.cpu.isPlaying = false;
  clearInterval(AppState.cpu.timer);
  AppState.cpu.timer = null;

  const playBtn = document.getElementById('cpu-auto-play');
  if (playBtn) {
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Auto Play</span>';
    playBtn.classList.remove('btn-secondary');
    playBtn.classList.add('btn-primary');
  }
}

/**
 * CPU Comparison Table & Chart
 */
function renderCpuComparison(results) {
  const tbody = document.getElementById('cpu-comparison-tbody');
  tbody.innerHTML = '';

  const algoKeys = ['FCFS', 'SJF', 'RR'];
  let minAvgWT = Infinity;
  let winner = '';

  algoKeys.forEach(key => {
    const res = results[key];
    const avgWT = parseFloat(res.avgWT);
    if (avgWT < minAvgWT) {
      minAvgWT = avgWT;
      winner = key;
    }
  });

  algoKeys.forEach(key => {
    const res = results[key];
    const isWinner = key === winner;
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>
        <strong>${res.algorithm}</strong>
        ${isWinner ? '<span class="badge badge-emerald ml-1">★ Optimal WT</span>' : ''}
      </td>
      <td class="font-mono text-emerald font-bold">${res.avgWT} ms</td>
      <td class="font-mono text-cyan">${res.avgTAT} ms</td>
      <td class="font-mono">${res.makespan} units</td>
      <td class="font-mono">${res.cpuUtilization}%</td>
    `;
    tbody.appendChild(tr);
  });

  const winnerBadge = document.getElementById('cpu-winner-badge');
  if (winnerBadge) {
    winnerBadge.textContent = `🏆 Minimum Avg Waiting Time: ${winner} (${minAvgWT} ms)`;
  }

  // Render Grouped Bar Chart
  const ctx = document.getElementById('cpuComparisonChart');
  if (!ctx) return;

  if (AppState.charts.cpuComparison) {
    AppState.charts.cpuComparison.destroy();
  }

  const wtValues = algoKeys.map(k => parseFloat(results[k].avgWT));
  const tatValues = algoKeys.map(k => parseFloat(results[k].avgTAT));

  AppState.charts.cpuComparison = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: algoKeys,
      datasets: [
        {
          label: 'Avg Waiting Time (ms)',
          data: wtValues,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: 'Avg Turnaround Time (ms)',
          data: tatValues,
          backgroundColor: 'rgba(6, 182, 212, 0.75)',
          borderColor: '#06b6d4',
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: '#cbd5e1', font: { family: 'Inter', size: 11 } }
        },
        tooltip: {
          backgroundColor: '#111a2e',
          titleColor: '#38bdf8',
          bodyColor: '#cbd5e1',
          borderColor: '#223758',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#cbd5e1', font: { family: 'Inter', weight: '600' } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } }
        }
      }
    }
  });
}

// ============================================================================
// COMPREHENSIVE BENCHMARKING MODULE
// ============================================================================

function initBenchmarkModule() {
  const runBtn = document.getElementById('run-all-benchmarks-btn');
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      runUnifiedBenchmarks();
      showToast('Unified benchmarks re-computed across all algorithms', 'success');
    });
  }
}

function runUnifiedBenchmarks() {
  renderBenchmarkDiskChart();
  renderBenchmarkCpuChart();
}

function renderBenchmarkDiskChart() {
  const ctx = document.getElementById('benchmarkDiskChart');
  if (!ctx || !AppState.disk.comparisonResults) return;

  if (AppState.charts.benchmarkDisk) {
    AppState.charts.benchmarkDisk.destroy();
  }

  const results = AppState.disk.comparisonResults;
  const algos = ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK'];
  const data = algos.map(a => results[a] ? results[a].totalMovement : 0);

  AppState.charts.benchmarkDisk = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: algos,
      datasets: [{
        label: 'Total Head Movement (Cylinders)',
        data: data,
        backgroundColor: [
          'rgba(6, 182, 212, 0.75)',
          'rgba(139, 92, 246, 0.75)',
          'rgba(16, 185, 129, 0.75)',
          'rgba(245, 158, 11, 0.75)',
          'rgba(244, 63, 94, 0.75)'
        ],
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#cbd5e1', font: { family: 'Inter', weight: '600' } } },
        y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#94a3b8' } }
      }
    }
  });

  const summary = document.getElementById('benchmark-disk-summary');
  if (summary) {
    const minVal = Math.min(...data);
    const minAlgo = algos[data.indexOf(minVal)];
    summary.innerHTML = `
      <strong>Disk Scheduling Insight:</strong>
      <code>${minAlgo}</code> yielded the lowest cylinder traversal (<strong>${minVal}</strong> cylinders).
      LOOK generally avoids unnecessary sweeps to physical platter boundaries, making it optimal for random workloads.
    `;
  }
}

function renderBenchmarkCpuChart() {
  const ctx = document.getElementById('benchmarkCpuChart');
  if (!ctx || !AppState.cpu.comparisonResults) return;

  if (AppState.charts.benchmarkCpu) {
    AppState.charts.benchmarkCpu.destroy();
  }

  const results = AppState.cpu.comparisonResults;
  const algos = ['FCFS', 'SJF', 'RR'];
  const wt = algos.map(a => results[a] ? parseFloat(results[a].avgWT) : 0);
  const tat = algos.map(a => results[a] ? parseFloat(results[a].avgTAT) : 0);

  AppState.charts.benchmarkCpu = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: algos,
      datasets: [
        {
          label: 'Avg Waiting Time',
          data: wt,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: 'Avg Turnaround Time',
          data: tat,
          backgroundColor: 'rgba(6, 182, 212, 0.75)',
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#cbd5e1' } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#cbd5e1', font: { family: 'Inter', weight: '600' } } },
        y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#94a3b8' } }
      }
    }
  });

  const summary = document.getElementById('benchmark-cpu-summary');
  if (summary) {
    const minWT = Math.min(...wt);
    const minAlgo = algos[wt.indexOf(minWT)];
    summary.innerHTML = `
      <strong>CPU Scheduling Insight:</strong>
      <code>${minAlgo}</code> achieved the optimal average waiting time of <strong>${minWT} ms</strong>.
      SJF mathematically minimizes cumulative waiting time under non-preemptive assumptions.
    `;
  }
}

// ============================================================================
// GLOBAL PRESET CONTROLS
// ============================================================================

function initPresets() {
  // Sets up dropdown defaults if necessary
}
