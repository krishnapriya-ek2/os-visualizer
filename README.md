# OS Scheduling Visualizer (MCA Assignment Project)

A modern, responsive, high-performance web-based simulation and visualization suite for **Operating System Scheduling Algorithms**, designed for academic evaluation, laboratory practicals, and Viva Voce defense in Master of Computer Applications (MCA) / Computer Science curricula.

---

## 🌟 Overview & Key Highlights

This application provides interactive visual simulations, mathematical calculations, and comparative benchmarks for two critical OS subsystem domains:
1. **Disk Scheduling:** FCFS, SSTF, SCAN, C-SCAN, and LOOK algorithms.
2. **CPU Scheduling:** FCFS, Shortest Job First (Non-Preemptive), and Round Robin (Time-sliced).

### Core Capabilities:
- **Interactive Step-by-Step Playback Controller:** Full state-machine engine offering `Previous Step`, `Next Step`, `Auto Play`, `Pause`, `Speed Adjust (0.5x, 1x, 2x)`, and `Reset`.
- **Textbook Trajectory Seek Graph (Chart.js):** Follows the Silberschatz & Galvin standard, plotting cylinder head coordinates with time/step progression downwards.
- **Physical Cylinder Track Visualizer:** Animated read/write head arm sweeping across dynamic cylinder pins (0 to $N-1$) with real-time seek delta telemetry.
- **Animated Gantt Chart:** Proportional timeline blocks with distinct color coding for each Process ID and dedicated visualization for CPU `[IDLE]` gaps.
- **Comparative Benchmarking Engine:** Automated calculation and bar chart comparison across all 5 disk algorithms and all 3 CPU algorithms for identical workloads.
- **Academic Viva Guide & Formulas:** Built-in cheatsheet with mathematical proofs, boundary conditions, time complexities, and common examiner questions.

---

## 📁 Project Structure

```
os-scheduling-visualizer/
│
├── index.html       # Semantic HTML5 dashboard layout and tabbed navigation
├── style.css        # Modern cyber-slate dark theme, glassmorphic UI, responsive grids
├── script.js        # Pure Vanilla JavaScript simulation engine, Chart.js bridges, playback controller
└── README.md        # Comprehensive technical documentation & MCA Viva guide
```

---

## 🚀 How to Run the Application

Because this project is written using standard **HTML5, CSS3, and Vanilla JavaScript**, no heavy runtime, compiler, or package manager is required.

### Method 1: Direct File Launch (Simplest)
1. Navigate to the project directory: `c:\Users\Admin\Desktop\os visualizer\`
2. Double-click `index.html` or right-click and choose **Open with > Chrome / Edge / Firefox**.

### Method 2: Local HTTP Server (Recommended)
Using Python's built-in HTTP server:
```powershell
# Navigate to the project folder
cd "c:\Users\Admin\Desktop\os visualizer"

# Start lightweight server on port 8000
python -m http.server 8000
```
Then open your web browser and navigate to:
```
http://localhost:8000
```

---

## 📀 1. Disk Scheduling Module

### Supported Algorithms:
1. **FCFS (First-Come, First-Served):**
   - Services requests sequentially in the exact arrival order.
   - Fair and simple; has high average seek length.
2. **SSTF (Shortest Seek Time First):**
   - Selects the cylinder request closest to the current head position (`min |req - head|`).
   - Prone to starvation for requests located on distant tracks.
3. **SCAN (Elevator Algorithm):**
   - The head traverses in the designated direction (e.g., towards High/End tracks), servicing all requests in path.
   - If pending requests exist in the reverse direction, it sweeps to the physical disk boundary ($0$ or $DiskSize - 1$), reverses, and services remaining requests.
4. **C-SCAN (Circular SCAN):**
   - Head traverses in one direction only, servicing requests until it reaches the boundary ($DiskSize - 1$ or $0$).
   - It then immediately jumps to the opposite boundary ($0$ or $DiskSize - 1$) without servicing requests, and continues in the original direction.
   - Ensures uniform waiting time distribution.
5. **LOOK:**
   - An optimization over SCAN. The head only travels as far as the final request in the current direction.
   - Reverses immediately without wasting travel to physical platter boundaries ($0$ or $DiskSize - 1$).

### Mathematical Formulas:
- **Seek Distance:**
  $$\text{Seek} = | \text{Cylinder}_i - \text{Cylinder}_{i-1} |$$
- **Total Head Movement:**
  $$\text{Total Head Movement} = \sum_{i=1}^{m} | \text{Cylinder}_i - \text{Cylinder}_{i-1} |$$
- **Average Seek Length:**
  $$\text{Avg Seek Length} = \frac{\text{Total Head Movement}}{\text{Number of Serviced Requests}}$$

---

## ⚡ 2. CPU Scheduling Module

### Supported Algorithms:
1. **FCFS (First-Come, First-Served):**
   - Non-preemptive. The CPU is allocated to processes in order of Arrival Time ($AT$).
   - Suffers from the *Convoy Effect* when a long CPU-burst process arrives first.
2. **SJF (Shortest Job First - Non-Preemptive):**
   - Among all processes that have arrived at or before the current clock time $T$, selects the process with the smallest Burst Time ($BT$).
   - Mathematically proven to deliver the minimum average waiting time.
3. **Round Robin (RR):**
   - Preemptive scheduling with a user-configurable Time Quantum ($Q$).
   - Maintains a FIFO Ready Queue. Arriving processes during a time slice are enqueued before a pre-empted process is re-added, guaranteeing fairness.

### Mathematical Formulas:
- **Turnaround Time ($TAT$):**
  $$\text{TAT} = \text{Completion Time (CT)} - \text{Arrival Time (AT)}$$
- **Waiting Time ($WT$):**
  $$\text{WT} = \text{Turnaround Time (TAT)} - \text{Burst Time (BT)}$$
- **Response Time ($RT$):**
  $$\text{RT} = \text{First CPU Allocation Time} - \text{Arrival Time (AT)}$$
- **Average Waiting Time:**
  $$\text{Average WT} = \frac{\sum_{j=1}^{n} \text{WT}_j}{n}$$
- **Average Turnaround Time:**
  $$\text{Average TAT} = \frac{\sum_{j=1}^{n} \text{TAT}_j}{n}$$
- **CPU Utilization:**
  $$\text{CPU Utilization} = \left( \frac{\sum \text{Burst Times}}{\text{Makespan (Total Schedule Length)}} \right) \times 100\%$$

---

## 🎓 Academic Viva Voce Cheatsheet

### Q1: Why is SSTF not optimal even though it picks the shortest seek at each step?
**Answer:** SSTF uses a greedy local optimum approach. By constantly choosing the closest request, it may ignore distant clusters of cylinders, resulting in starvation and potentially higher overall global seek length than LOOK or SCAN.

### Q2: What is the primary difference between SCAN and LOOK?
**Answer:** In SCAN, the disk arm travels all the way to the physical boundary (cylinder 0 or cylinder $Size-1$) before reversing. In LOOK, the arm checks ahead and reverses at the highest/lowest requested cylinder, eliminating unnecessary boundary seek movements.

### Q3: What is the "Convoy Effect" in CPU scheduling?
**Answer:** The Convoy Effect occurs under FCFS when one process with a very long burst time executes first, forcing multiple short-burst I/O-bound processes to wait in the Ready Queue, drastically degrading average waiting time and resource utilization.

### Q4: How does the choice of Time Quantum ($Q$) affect Round Robin?
**Answer:**
- If $Q$ is excessively large ($Q \to \infty$), Round Robin degrades into standard FCFS.
- If $Q$ is extremely small, CPU context-switching overhead dominates CPU cycles, drastically reducing useful throughput.
- Recommended academic heuristic: Set $Q$ such that approximately 70% to 80% of CPU bursts are shorter than $Q$.

---

## 🛠️ Technology Stack & Standards
- **HTML5:** Semantic architecture, accessible forms, WAI-ARIA tab controls.
- **CSS3:** Custom CSS variables, responsive CSS Grid / Flexbox, glassmorphic dark theme, CSS keyframe animations.
- **JavaScript (ES6+):** Pure Vanilla JS without external framework dependencies.
- **Chart.js (v4.4.1):** Renders responsive seek trajectory graphs and multi-dataset comparison bar charts.
- **Font Awesome (v6.4.0):** Clean vector UI icons.

---
*Created for MCA Operating Systems Lab Simulation & Viva Voce Defense.*
