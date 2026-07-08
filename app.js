/* ==========================================
   4690 BASIC Video Generator — App Orchestrator v2
   Modular: Editor | PowerShell | IBM 4690 OS
   ========================================== */
(function () {
    'use strict';

    const { $, $$, escapeHtml, delay, scrollToBottom, CURSOR_TERM, removeCursor } = window.Utils;

    let isPlaying = false;
    let isRecording = false;
    let abortController = null;

    const DOM_APP = {
        btnPlay: null,
        btnStop: null,
        btnClean: null,
        btnRecordEditor: null,
        btnRecordPS: null,
        btnRecordIBM: null,
        canvasWrapper: null,
        phaseDots: null,
        tabBtns: null,
        tabPanels: null,
    };

    function bindDOM() {
        DOM_APP.btnPlay = $('#btnPlay');
        DOM_APP.btnStop = $('#btnStop');
        DOM_APP.btnClean = $('#btnClean');
        DOM_APP.btnRecordEditor = $('#btnRecordEditor');
        DOM_APP.btnRecordPS = $('#btnRecordPS');
        DOM_APP.btnRecordIBM = $('#btnRecordIBM');
        DOM_APP.canvasWrapper = $('#canvasWrapper');
        DOM_APP.phaseDots = $$('.phase-dot');
        DOM_APP.tabBtns = $$('.tab-btn');
        DOM_APP.tabPanels = $$('.tab-panel');
    }

    function setPhase(phaseName) {
        const phases = ['idle', 'editor', 'powershell', 'ibm4690', 'done'];
        const idx = phases.indexOf(phaseName);
        DOM_APP.phaseDots.forEach((dot, i) => {
            dot.classList.remove('active', 'completed');
            if (i < idx) dot.classList.add('completed');
            if (i === idx) dot.classList.add('active');
        });
    }

    function resetCanvas() {
        window.Editor.clear();
        window.PowerShell.clear();
        window.IBM4690.clear();
        setPhase('idle');
    }

    function setPlayingUI(playing) {
        isPlaying = playing;
        DOM_APP.btnPlay.disabled = playing;

        const recordBtns = [DOM_APP.btnRecordEditor, DOM_APP.btnRecordPS, DOM_APP.btnRecordIBM];
        recordBtns.forEach(btn => { if (btn) btn.disabled = playing; });

        if (playing) {
            DOM_APP.btnStop.classList.remove('hidden');
        } else {
            DOM_APP.btnStop.classList.add('hidden');
            DOM_APP.canvasWrapper.className = 'canvas-wrapper';
        }
    }

    function buildFileContext(config) {
        const ed = config.editor || {};
        const fileName = ed.fileName || 'MAIN.BAS';
        const baseName = fileName.split('.')[0] || 'MAIN';
        const objName = baseName.toUpperCase() + '.OBJ';
        const exeName = baseName.toUpperCase() + '.286';
        const symName = baseName.toUpperCase() + '.sym';

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }).replace('a. m.', 'a. m.').replace('p. m.', 'p. m.');

        const fileSrc = `-a----     ${dateStr}  ${timeStr}            475 ${fileName}`;
        const fileObj = `-a----     ${dateStr}  ${timeStr}            906 ${objName}`;
        const fileExe = `-a----     ${dateStr}  ${timeStr}           9344 ${exeName}`;
        const fileSym = `-a----     ${dateStr}  ${timeStr}            384 ${symName}`;

        const date4690 = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
        let h = now.getHours();
        const ampm = h >= 12 ? 'p' : 'a';
        h = h % 12 || 12;
        const m = now.getMinutes().toString().padStart(2, '0');
        const time4690 = `${h}:${m}${ampm}`;
        const namePad = baseName.toUpperCase().padEnd(8, ' ').substring(0, 8);
        const file286Dos = `${namePad} 286     9344   ${date4690}  ${time4690}`;

        return {
            FILE_BAS: fileSrc,
            FILE_OBJ: fileObj,
            FILE_286: fileExe,
            FILE_SYM: fileSym,
            DATE_4690: date4690,
            TIME_4690: time4690,
            FILE_286_DOS: file286Dos,
        };
    }

    async function runSimulation(signal, focusMode) {
        const config = window.Config.getConfig();
        const sim = config.simulation || {};
        const ed = config.editor || {};
        const ps = config.powershell || {};
        const ibm = config.ibm4690 || {};

        resetCanvas();
        document.getElementById('editorTitle').textContent = `${ed.fileName || 'MAIN.BAS'} — 4690 BASIC Editor`;

        const context = buildFileContext(config);
        const simType = sim.type || 'all';
        const pauseBetween = sim.pauseBetweenPhases || 1000;
        const speedTyping = sim.speedTyping || 20;
        const speedTerminal = sim.speedTerminal || 30;
        const speedOutput = sim.speedOutput || 100;

        try {
            function shouldAnimate(panelName) {
                if (!focusMode || focusMode === 'all') return true;
                return focusMode === panelName;
            }

            // Phase 1: Editor
            const runEditor = simType === 'all' || simType === 'editor';
            if (runEditor && shouldAnimate('editor')) {
                setPhase('editor');
                await delay(400, signal);
                await window.Editor.animate(ed.code || '', speedTyping, signal);
                await delay(pauseBetween, signal);
            } else if (simType === 'all' || simType === 'editor') {
                window.Editor.paintStatic(ed.code || '', ed.fileName || 'MAIN.BAS');
            }

            // Phase 2: PowerShell
            const runPS = simType === 'all' || simType === 'powershell';
            const psDirTemplates = ps.dirTemplates || {};
            if (runPS && shouldAnimate('powershell')) {
                setPhase('powershell');
                await window.PowerShell.animateSteps(
                    ps.prompt || 'PS C:\\>',
                    ps.steps || [],
                    context,
                    ps.dirTemplate || '',
                    psDirTemplates,
                    speedTerminal,
                    signal
                );
                await delay(pauseBetween * 0.6, signal);
            } else if (simType === 'all' || simType === 'powershell') {
                window.PowerShell.paintStaticSteps(
                    ps.prompt || 'PS C:\\>',
                    ps.steps || [],
                    context,
                    ps.dirTemplate || '',
                    psDirTemplates
                );
            }

            // Phase 3: IBM 4690 OS
            const runIBM = simType === 'all' || simType === 'ibm4690';
            const ibmDirTemplates = ibm.dirTemplates || {};
            if (runIBM && shouldAnimate('ibm4690')) {
                setPhase('ibm4690');
                await window.IBM4690.animateSteps(
                    ibm.prompt || 'C:CURSO/>',
                    ibm.bootSequence || '',
                    ibm.steps || [],
                    context,
                    ibm.dirTemplate || '',
                    ibmDirTemplates,
                    speedTerminal,
                    speedOutput,
                    signal
                );
                await delay(2000, signal);
            } else if (simType === 'all' || simType === 'ibm4690') {
                window.IBM4690.paintStaticSteps(
                    ibm.prompt || 'C:CURSO/>',
                    ibm.bootSequence || '',
                    ibm.steps || [],
                    context,
                    ibm.dirTemplate || '',
                    ibmDirTemplates
                );
            }

            removeCursor(document.getElementById('ibmOutput'));
            setPhase('done');

        } catch (err) {
            if (err.name === 'AbortError') { return; }
            throw err;
        }
    }

    function setupEventListeners() {
        DOM_APP.btnPlay.addEventListener('click', async () => {
            if (isPlaying) return;
            setPlayingUI(true);
            abortController = new AbortController();
            try { await runSimulation(abortController.signal); }
            finally { setPlayingUI(false); }
        });

        DOM_APP.btnStop.addEventListener('click', () => {
            if (abortController) abortController.abort();
            const mr = window.Recorder.getMediaRecorder();
            if (mr && mr.state !== 'inactive') mr.stop();
        });

        DOM_APP.btnClean.addEventListener('click', () => {
            if (isPlaying) return;
            resetCanvas();
        });

        DOM_APP.btnRecordEditor.addEventListener('click', () => window.Recorder.openRecorderPopup('editor'));
        DOM_APP.btnRecordPS.addEventListener('click', () => window.Recorder.openRecorderPopup('powershell'));
        DOM_APP.btnRecordIBM.addEventListener('click', () => window.Recorder.openRecorderPopup('ibm4690'));

        DOM_APP.tabBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                DOM_APP.tabBtns.forEach((b) => b.classList.remove('active'));
                DOM_APP.tabPanels.forEach((p) => p.classList.remove('active'));
                btn.classList.add('active');
                const panel = $(`#${btn.getAttribute('data-tab')}`);
                if (panel) panel.classList.add('active');
            });
        });
    }

    async function autoStartRecordingInPopup(focusMode) {
        isRecording = true;
        abortController = new AbortController();
        window.Recorder.setAbortController(abortController);

        if (focusMode && focusMode !== 'all') {
            DOM_APP.canvasWrapper.classList.add('focus-' + focusMode);
        }

        try {
            const config = window.Config.getConfig();
            const sim = config.simulation || {};
            await window.Recorder.startRecording(null, focusMode, sim.videoFormat, sim.videoPrefix);
            await delay(500, abortController.signal);
            await runSimulation(abortController.signal, focusMode);
            await delay(1000, abortController.signal);
        } catch (err) {
            if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                console.error('Recording error:', err);
            }
        } finally {
            const mr = window.Recorder.getMediaRecorder();
            if (mr && mr.state !== 'inactive') mr.stop();
            setTimeout(() => { try { window.close(); } catch(e) {} }, 2000);
        }
    }

    // ==================
    // INIT
    // ==================
    function init() {
        bindDOM();
        window.Config.init();
        window.Editor.init();
        window.PowerShell.init();
        window.IBM4690.init();
        window.Config.loadConfig();
        setupEventListeners();
        resetCanvas();

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('recorder') === '1') {
            document.body.classList.add('recorder-popup');
            const focus = urlParams.get('focus') || 'all';
            const urlFormat = urlParams.get('format');
            if (urlFormat) {
                const config = window.Config.getConfig();
                if (config.simulation) {
                    config.simulation.videoFormat = urlFormat;
                }
            }
            setTimeout(() => autoStartRecordingInPopup(focus), 300);
        }
    }

    init();

})();
