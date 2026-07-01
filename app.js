/* ==========================================
   4690 BASIC Video Generator — App Logic v5
   Fixes: Cursor alignment, Instant Prompts, Native WebM Recording
   ========================================== */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ==================
    // DOM REFERENCES
    // ==================
    const DOM = {
        inputFileName: $('#inputFileName'),
        inputCode: $('#inputCode'),
        inputCompileCmd: $('#inputCompileCmd'),
        inputCompileMsg: $('#inputCompileMsg'),
        inputLinkCmd: $('#inputLinkCmd'),
        inputLinkMsg: $('#inputLinkMsg'),
        inputTerminalPrompt: $('#inputTerminalPrompt'),
        inputRunPrompt: $('#inputRunPrompt'),
        inputRunCmd: $('#inputRunCmd'),
        inputOutput: $('#inputOutput'),

        speedTyping: $('#speedTyping'),
        speedTerminal: $('#speedTerminal'),
        speedOutput: $('#speedOutput'),
        pausePhase: $('#pausePhase'),
        pauseCompile: $('#pauseCompile'),
        pauseDir: $('#pauseDir'),
        pauseEnd: $('#pauseEnd'),
        fontSize: $('#fontSize'),

        valTyping: $('#valTyping'),
        valTerminal: $('#valTerminal'),
        valOutput: $('#valOutput'),
        valPause: $('#valPause'),
        valCompile: $('#valCompile'),
        valDir: $('#valDir'),
        valEnd: $('#valEnd'),
        valFontSize: $('#valFontSize'),

        btnPlay: $('#btnPlay'),
        btnStop: $('#btnStop'),
        btnRecordEditor: $('#btnRecordEditor'),
        btnRecordCompile: $('#btnRecordCompile'),
        btnRecordRun: $('#btnRecordRun'),
        btnRecordAll: $('#btnRecordAll'),

        codeOutput: $('#codeOutput'),
        lineNumbers: $('#lineNumbers'),
        editorTitle: $('#editorTitle'),
        editorBody: $('#editorBody'),

        compileOutput: $('#compileOutput'),
        compileBody: $('#compileBody'),

        runOutput: $('#runOutput'),
        runBody: $('#runBody'),

        canvasWrapper: $('#canvasWrapper'),

        envBootSeq: $('#envBootSeq'),
        envPsDir: $('#envPsDir'),
        envDosDir: $('#envDosDir'),
        btnExportConfig: $('#btnExportConfig'),
        fileImportConfig: $('#fileImportConfig'),

        tabBtns: $$('.tab-btn'),
        tabPanels: $$('.tab-panel'),
        phaseDots: $$('.phase-dot'),
    };

    // ==================
    // STATE
    // ==================
    let isPlaying = false;
    let isRecording = false;
    let abortController = null;
    let mediaRecorder = null;
    let recordedChunks = [];

    // ==================
    // TABS & SLIDERS
    // ==================
    DOM.tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            DOM.tabBtns.forEach((b) => b.classList.remove('active'));
            DOM.tabPanels.forEach((p) => p.classList.remove('active'));
            btn.classList.add('active');
            $(`#${btn.getAttribute('data-tab')}`).classList.add('active');
        });
    });

    function updateSliderLabels() {
        DOM.valTyping.textContent = DOM.speedTyping.value + 'ms';
        DOM.valTerminal.textContent = DOM.speedTerminal.value + 'ms';
        DOM.valOutput.textContent = DOM.speedOutput.value + 'ms';
        DOM.valPause.textContent = (DOM.pausePhase.value / 1000).toFixed(1) + 's';
        DOM.valCompile.textContent = (DOM.pauseCompile.value / 1000).toFixed(1) + 's';
        if (DOM.pauseDir) DOM.valDir.textContent = (DOM.pauseDir.value / 1000).toFixed(1) + 's';
        DOM.valEnd.textContent = (DOM.pauseEnd.value / 1000).toFixed(1) + 's';
        if (DOM.fontSize) DOM.valFontSize.textContent = DOM.fontSize.value;
    }

    [DOM.speedTyping, DOM.speedTerminal, DOM.speedOutput, DOM.pausePhase, DOM.pauseCompile, DOM.pauseDir, DOM.pauseEnd, DOM.fontSize].forEach((s) => {
        if(s) s.addEventListener('input', updateSliderLabels);
    });

    if (DOM.fontSize) {
        DOM.fontSize.addEventListener('input', (e) => {
            document.documentElement.style.setProperty('--font-size', e.target.value + 'rem');
        });
        document.documentElement.style.setProperty('--font-size', DOM.fontSize.value + 'rem');
    }

    updateSliderLabels();

    function getSettings() {
        return {
            fileName: DOM.inputFileName.value.trim() || 'MAIN.BAS',
            code: DOM.inputCode.value,
            compileCmd: DOM.inputCompileCmd.value.trim(),
            compileMsg: DOM.inputCompileMsg.value,
            linkCmd: DOM.inputLinkCmd.value.trim(),
            linkMsg: DOM.inputLinkMsg.value,
            terminalPrompt: (DOM.inputTerminalPrompt ? DOM.inputTerminalPrompt.value.trim() : 'PS C:\\>') || 'PS C:\\>',
            runPrompt: (DOM.inputRunPrompt ? DOM.inputRunPrompt.value.trim() : 'C:CURSO/>') || 'C:CURSO/>',
            runCmd: DOM.inputRunCmd.value.trim(),
            output: DOM.inputOutput.value,
            speedTyping: parseInt(DOM.speedTyping.value),
            speedTerminal: parseInt(DOM.speedTerminal.value),
            speedOutput: parseInt(DOM.speedOutput.value),
            pausePhase: parseInt(DOM.pausePhase.value),
            pauseCompile: parseInt(DOM.pauseCompile.value),
            pauseDir: DOM.pauseDir ? parseInt(DOM.pauseDir.value) : 2000,
            pauseEnd: parseInt(DOM.pauseEnd.value),
            fontSize: DOM.fontSize ? DOM.fontSize.value : '0.82',
            envBootSeq: DOM.envBootSeq ? DOM.envBootSeq.value : '',
            envPsDir: DOM.envPsDir ? DOM.envPsDir.value : '',
            envDosDir: DOM.envDosDir ? DOM.envDosDir.value : ''
        };
    }

    function saveConfig() {
        const config = getSettings();
        localStorage.setItem('basicSimulatorConfig', JSON.stringify(config));
    }

    function loadConfig() {
        const saved = localStorage.getItem('basicSimulatorConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                if (config.fileName) DOM.inputFileName.value = config.fileName;
                if (config.code) DOM.inputCode.value = config.code;
                if (config.compileCmd) DOM.inputCompileCmd.value = config.compileCmd;
                if (config.compileMsg) DOM.inputCompileMsg.value = config.compileMsg;
                if (config.linkCmd) DOM.inputLinkCmd.value = config.linkCmd;
                if (config.linkMsg) DOM.inputLinkMsg.value = config.linkMsg;
                if (config.terminalPrompt && DOM.inputTerminalPrompt) DOM.inputTerminalPrompt.value = config.terminalPrompt;
                if (config.runPrompt && DOM.inputRunPrompt) DOM.inputRunPrompt.value = config.runPrompt;
                if (config.runCmd) DOM.inputRunCmd.value = config.runCmd;
                if (config.output) DOM.inputOutput.value = config.output;
                
                if (config.speedTyping) DOM.speedTyping.value = config.speedTyping;
                if (config.speedTerminal) DOM.speedTerminal.value = config.speedTerminal;
                if (config.speedOutput) DOM.speedOutput.value = config.speedOutput;
                if (config.pausePhase) DOM.pausePhase.value = config.pausePhase;
                if (config.pauseCompile) DOM.pauseCompile.value = config.pauseCompile;
                if (config.pauseDir && DOM.pauseDir) DOM.pauseDir.value = config.pauseDir;
                if (config.pauseEnd) DOM.pauseEnd.value = config.pauseEnd;
                
                if (config.fontSize && DOM.fontSize) {
                    DOM.fontSize.value = config.fontSize;
                    document.documentElement.style.setProperty('--font-size', config.fontSize + 'rem');
                }

                if (config.envBootSeq && DOM.envBootSeq) DOM.envBootSeq.value = config.envBootSeq;
                if (config.envPsDir && DOM.envPsDir) DOM.envPsDir.value = config.envPsDir;
                if (config.envDosDir && DOM.envDosDir) DOM.envDosDir.value = config.envDosDir;

                updateSliderLabels();
            } catch (e) {
                console.error("Error loading config", e);
            }
        }
    }

    // Auto-save on inputs
    document.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('input', saveConfig);
        el.addEventListener('change', saveConfig);
    });

    // Import / Export Settings
    if (DOM.btnExportConfig) {
        DOM.btnExportConfig.addEventListener('click', async () => {
            const configJson = JSON.stringify(getSettings(), null, 2);
            
            // Usar File System Access API si está disponible (pregunta dónde guardar y recuerda)
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: '4690_simulator_config.json',
                        id: 'sim_config_dir', // Esto ayuda al navegador a recordar la última ubicación para este ID
                        types: [{
                            description: 'JSON Configuration File',
                            accept: { 'application/json': ['.json'] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(configJson);
                    await writable.close();
                    return; // Éxito
                } catch (err) {
                    if (err.name === 'AbortError') return; // Usuario canceló el diálogo
                    console.error('Error usando showSaveFilePicker:', err);
                    // Si falla, caemos en el método tradicional
                }
            }

            // Método tradicional (depende de la configuración del navegador)
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(configJson);
            const a = document.createElement('a');
            a.href = dataStr;
            a.download = "4690_simulator_config.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
    }

    if (DOM.fileImportConfig) {
        DOM.fileImportConfig.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                localStorage.setItem('basicSimulatorConfig', ev.target.result);
                loadConfig();
                alert('Configuración importada exitosamente.');
            };
            reader.readAsText(file);
        });
    }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ==================
    // TOKENIZER SYNTAX HIGHLIGHTER
    // ==================
    const BASIC_KEYWORDS = new Set([
        'PRINT', 'FOR', 'NEXT', 'TO', 'STEP', 'IF', 'THEN', 'ELSE', 'END',
        'WHILE', 'WEND', 'GOTO', 'GOSUB', 'RETURN', 'DIM', 'SUB', 'CALL',
        'DEF', 'FN', 'ON', 'ERROR', 'RESUME', 'OPEN', 'CLOSE', 'READ',
        'WRITE', 'INPUT', 'AS', 'OUTPUT', 'APPEND', 'AND', 'OR', 'NOT',
        'XOR', 'LET', 'REM', 'DATA', 'RESTORE', 'EXIT', 'DO', 'LOOP',
        'UNTIL', 'SELECT', 'CASE', 'FUNCTION', 'SHARED', 'STATIC',
        'DECLARE', 'INTEGER', 'REAL', 'STRING', 'KEYED', 'GET', 'PUT',
        'EOF', 'LOC', 'LOF', 'RANDOMIZE', 'STOP',
    ]);

    function tokenizeLine(line) {
        const tokens = [];
        let i = 0;
        const trimmed = line.trimStart();

        if (trimmed.startsWith('!') || trimmed.toUpperCase().startsWith('REM ') || trimmed.toUpperCase() === 'REM') {
            return [{ text: line, type: 'comment' }];
        }
        if (trimmed.startsWith('%')) {
            return [{ text: line, type: 'directive' }];
        }

        while (i < line.length) {
            if (line[i] === ' ' || line[i] === '\t') {
                let start = i;
                while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;
                tokens.push({ text: line.slice(start, i), type: 'plain' });
                continue;
            }
            if (line[i] === '!') {
                tokens.push({ text: line.slice(i), type: 'comment' });
                i = line.length;
                continue;
            }
            if (line[i] === '"') {
                let start = i; i++;
                while (i < line.length && line[i] !== '"') i++;
                if (i < line.length) i++;
                tokens.push({ text: line.slice(start, i), type: 'string' });
                continue;
            }
            if (/\d/.test(line[i]) && (i === 0 || !/[a-zA-Z_?$%]/.test(line[i - 1]))) {
                let start = i;
                while (i < line.length && /[\d.]/.test(line[i])) i++;
                if (i < line.length && /[a-zA-Z_?$%]/.test(line[i])) {
                    while (i < line.length && /[a-zA-Z0-9_?.$%]/.test(line[i])) i++;
                    tokens.push(classifyWord(line.slice(start, i)));
                } else {
                    tokens.push({ text: line.slice(start, i), type: 'number' });
                }
                continue;
            }
            if (/[a-zA-Z_?]/.test(line[i])) {
                let start = i;
                while (i < line.length && /[a-zA-Z0-9_?.]/.test(line[i])) i++;
                if (i < line.length && line[i] === '$') { i++; tokens.push({ text: line.slice(start, i), type: 'variable-str' }); continue; }
                if (i < line.length && line[i] === '%') { i++; tokens.push({ text: line.slice(start, i), type: 'variable-int' }); continue; }
                if (i < line.length && line[i] === ':') {
                    const before = line.slice(0, start).trim();
                    if (before === '') { i++; tokens.push({ text: line.slice(start, i), type: 'label' }); continue; }
                }
                tokens.push(classifyWord(line.slice(start, i)));
                continue;
            }
            if ('+-*/^=<>(),:;#'.includes(line[i])) {
                if (line[i] === '<' && line[i + 1] === '>') { tokens.push({ text: '<>', type: 'operator' }); i += 2; }
                else if (line[i] === '<' && line[i + 1] === '=') { tokens.push({ text: '<=', type: 'operator' }); i += 2; }
                else if (line[i] === '>' && line[i + 1] === '=') { tokens.push({ text: '>=', type: 'operator' }); i += 2; }
                else { tokens.push({ text: line[i], type: 'operator' }); i++; }
                continue;
            }
            tokens.push({ text: line[i], type: 'plain' }); i++;
        }
        return tokens;
    }

    function classifyWord(word) {
        return BASIC_KEYWORDS.has(word.toUpperCase()) ? { text: word, type: 'keyword' } : { text: word, type: 'plain' };
    }

    const CLASS_MAP = {
        keyword: 'syn-keyword', string: 'syn-string', comment: 'syn-comment',
        number: 'syn-number', directive: 'syn-directive',
        'variable-str': 'syn-variable-str', 'variable-int': 'syn-variable-int',
        label: 'syn-label', operator: 'syn-operator',
    };

    function highlightLine(text) {
        return tokenizeLine(text).map((t) => {
            const escaped = escapeHtml(t.text);
            const cls = CLASS_MAP[t.type];
            return cls ? `<span class="${cls}">${escaped}</span>` : escaped;
        }).join('');
    }

    function highlightCode(code) {
        return code.split('\n').map(highlightLine).join('\n');
    }

    // ==================
    // PHASE MANAGEMENT
    // ==================
    function setPhase(phaseName) {
        const phases = ['idle', 'editor', 'compile', 'run', 'done'];
        const idx = phases.indexOf(phaseName);
        DOM.phaseDots.forEach((dot, i) => {
            dot.classList.remove('active', 'completed');
            if (i < idx) dot.classList.add('completed');
            if (i === idx) dot.classList.add('active');
        });
    }

    function delay(ms, signal) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, ms);
            if (signal) {
                signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
            }
        });
    }

    function scrollToBottom(el) {
        if (el) el.scrollTop = el.scrollHeight;
    }

    // ==================
    // CURSORS & TYPING
    // ==================
    const CURSOR_EDITOR = '<span class="cursor-blink">│</span>';
    const CURSOR_TERM = '<span class="cursor-blink terminal-cursor">█</span>';

    async function typeCodeWithLineNumbers(code, speed, signal) {
        const lines = code.split('\n');
        let displayed = '';

        DOM.codeOutput.innerHTML = '';
        DOM.lineNumbers.textContent = '';

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            DOM.lineNumbers.textContent += (lineIdx + 1) + '\n';

            const line = lines[lineIdx];
            for (let charIdx = 0; charIdx < line.length; charIdx++) {
                if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
                displayed += line[charIdx];
                // Append cursor directly inside the pre element so it flows perfectly
                DOM.codeOutput.innerHTML = highlightCode(displayed) + CURSOR_EDITOR;
                scrollToBottom(DOM.editorBody);
                const ch = line[charIdx];
                await delay((ch === ' ' || ch === '\t') ? speed * 0.2 : speed, signal);
            }

            if (lineIdx < lines.length - 1) {
                displayed += '\n';
                DOM.codeOutput.innerHTML = highlightCode(displayed) + CURSOR_EDITOR;
                scrollToBottom(DOM.editorBody);
                await delay(speed * 1.2, signal);
            }
        }
        // Remove cursor at the end
        DOM.codeOutput.innerHTML = highlightCode(displayed);
    }

    async function typeLineInto(outputEl, bodyEl, text, speed, signal, color) {
        const base = outputEl.innerHTML.replace(CURSOR_TERM, '');
        let typed = '';

        for (let i = 0; i < text.length; i++) {
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            typed += escapeHtml(text[i]);
            const style = color ? ` style="color:${color}"` : '';
            outputEl.innerHTML = base + `<span${style}>${typed}</span>` + CURSOR_TERM;
            scrollToBottom(bodyEl);
            await delay((text[i] === ' ') ? speed * 0.2 : speed, signal);
        }

        const style = color ? ` style="color:${color}"` : '';
        outputEl.innerHTML = base + `<span${style}>${escapeHtml(text)}</span>\n`;
        scrollToBottom(bodyEl);
    }

    async function printLineInto(outputEl, bodyEl, text, delayMs, signal, color) {
        if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const style = color ? ` style="color:${color}"` : '';
        outputEl.innerHTML += `<span${style}>${escapeHtml(text)}</span>\n`;
        scrollToBottom(bodyEl);
        await delay(delayMs, signal);
    }

    async function printMultilineInto(outputEl, bodyEl, text, lineDelay, signal, color) {
        const lines = text.split('\n');
        for (const line of lines) {
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            await printLineInto(outputEl, bodyEl, line, lineDelay, signal, color);
        }
    }

    // ==================
    // RESET
    // ==================
    function resetCanvas() {
        DOM.codeOutput.innerHTML = '';
        DOM.lineNumbers.textContent = '';
        DOM.compileOutput.innerHTML = '';
        DOM.runOutput.innerHTML = '';
        setPhase('idle');
    }

    // ==================
    // MAIN ANIMATION
    // ==================
    async function runAnimation(signal, focusMode = null) {
        const s = getSettings();
        resetCanvas();
        DOM.editorTitle.textContent = `${s.fileName} — 4690 BASIC Editor`;

        const baseName = s.fileName.split('.')[0] || 'MAIN';
        const objName = baseName.toUpperCase() + '.OBJ';
        const exeName = baseName.toUpperCase() + '.286';
        const symName = baseName.toUpperCase() + '.sym';
        
        const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }).replace('a. m.', 'a. m.').replace('p. m.', 'p. m.');

        const fileSrc = `-a----     ${dateStr}  ${timeStr}            475 ${s.fileName}`;
        const fileObj = `-a----     ${dateStr}  ${timeStr}            906 ${objName}`;
        const fileExe = `-a----     ${dateStr}  ${timeStr}           9344 ${exeName}`;
        const fileSym = `-a----     ${dateStr}  ${timeStr}            384 ${symName}`;

        let psDirObj = (s.envPsDir || '')
            .replace('{{FILE_BAS}}', fileSrc)
            .replace('{{FILE_OBJ}}', fileObj)
            .replace('{{FILE_286}}\n', '')
            .replace('{{FILE_SYM}}\n', '')
            .replace('{{FILE_286}}', '')
            .replace('{{FILE_SYM}}', '');
            
        let psDirExe = (s.envPsDir || '')
            .replace('{{FILE_BAS}}', fileSrc)
            .replace('{{FILE_OBJ}}', fileObj)
            .replace('{{FILE_286}}', fileExe)
            .replace('{{FILE_SYM}}', fileSym);

        const date4690 = `${new Date().getMonth()+1}-${new Date().getDate()}-${new Date().getFullYear()}`;
        let h = new Date().getHours();
        const ampm = h >= 12 ? 'p' : 'a';
        h = h % 12 || 12;
        const m = new Date().getMinutes().toString().padStart(2, '0');
        const time4690 = `${h}:${m}${ampm}`;
        const namePad = baseName.toUpperCase().padEnd(8, ' ').substring(0, 8);
        const file286Dos = `${namePad} 286     9344   ${date4690}  ${time4690}`;

        let dosDirExe = (s.envDosDir || '')
            .replace(/{{DATE_4690}}/g, date4690)
            .replace(/{{TIME_4690}}/g, time4690)
            .replace('{{FILE_286_DOS}}', file286Dos);

        try {
            // ── PHASE 1: EDITOR ──
            if (!focusMode || focusMode === 'editor') {
                setPhase('editor');
                await delay(400, signal);
                await typeCodeWithLineNumbers(s.code, s.speedTyping, signal);
                await delay(s.pausePhase, signal);
            } else {
                DOM.codeOutput.innerHTML = highlightCode(s.code);
            }

            // ── PHASE 2: COMPILE ──
            if (!focusMode || focusMode === 'compile') {
                setPhase('compile');
                DOM.compileOutput.innerHTML = '';
                
                // 1. Compile
                DOM.compileOutput.innerHTML = `<span style="color:#6272a4">${escapeHtml(s.terminalPrompt)} </span>`;
                await typeLineInto(DOM.compileOutput, DOM.compileBody, s.compileCmd, s.speedTerminal, signal, '#f8f8f2');

                DOM.compileOutput.innerHTML += CURSOR_TERM;
                scrollToBottom(DOM.compileBody);
                await delay(s.pauseCompile * 0.3, signal);
                DOM.compileOutput.innerHTML = DOM.compileOutput.innerHTML.replace(CURSOR_TERM, '');

                if (s.compileMsg.trim()) {
                    await printMultilineInto(DOM.compileOutput, DOM.compileBody, s.compileMsg, 55, signal, '#50fa7b');
                }
                await printLineInto(DOM.compileOutput, DOM.compileBody, '', 50, signal);
                
                // 2. Dir after compile
                DOM.compileOutput.innerHTML += `<span style="color:#6272a4">${escapeHtml(s.terminalPrompt)} </span>`;
                await typeLineInto(DOM.compileOutput, DOM.compileBody, 'dir', s.speedTerminal, signal, '#f8f8f2');
                await printMultilineInto(DOM.compileOutput, DOM.compileBody, psDirObj, 30, signal, '#f8f8f2');
                await printLineInto(DOM.compileOutput, DOM.compileBody, '', 50, signal);
                
                DOM.compileOutput.innerHTML += CURSOR_TERM;
                scrollToBottom(DOM.compileBody);
                await delay(s.pauseDir, signal);
                DOM.compileOutput.innerHTML = DOM.compileOutput.innerHTML.replace(CURSOR_TERM, '');

                // 3. Link step
                if (s.linkCmd) {
                    DOM.compileOutput.innerHTML += `<span style="color:#6272a4">${escapeHtml(s.terminalPrompt)} </span>`;
                    await typeLineInto(DOM.compileOutput, DOM.compileBody, s.linkCmd, s.speedTerminal, signal, '#f8f8f2');

                    DOM.compileOutput.innerHTML += CURSOR_TERM;
                    scrollToBottom(DOM.compileBody);
                    await delay(s.pauseCompile * 0.25, signal);
                    DOM.compileOutput.innerHTML = DOM.compileOutput.innerHTML.replace(CURSOR_TERM, '');

                    if (s.linkMsg.trim()) {
                        await printMultilineInto(DOM.compileOutput, DOM.compileBody, s.linkMsg, 45, signal, '#50fa7b');
                    }
                    await printLineInto(DOM.compileOutput, DOM.compileBody, '', 50, signal);
                    
                    // 4. Dir after link
                    DOM.compileOutput.innerHTML += `<span style="color:#6272a4">${escapeHtml(s.terminalPrompt)} </span>`;
                    await typeLineInto(DOM.compileOutput, DOM.compileBody, 'dir', s.speedTerminal, signal, '#f8f8f2');
                    await printMultilineInto(DOM.compileOutput, DOM.compileBody, psDirExe, 30, signal, '#f8f8f2');
                    await printLineInto(DOM.compileOutput, DOM.compileBody, '', 50, signal);
                    
                    DOM.compileOutput.innerHTML += CURSOR_TERM;
                    scrollToBottom(DOM.compileBody);
                    await delay(s.pauseDir, signal);
                    DOM.compileOutput.innerHTML = DOM.compileOutput.innerHTML.replace(CURSOR_TERM, '');
                }

                DOM.compileOutput.innerHTML += `<span style="color:#6272a4">${escapeHtml(s.terminalPrompt)} </span>${CURSOR_TERM}`;
                scrollToBottom(DOM.compileBody);

                await delay(s.pausePhase * 0.6, signal);
            } else {
                let compiledText = `<span style="color:#6272a4">${escapeHtml(s.terminalPrompt)} </span><span style="color:#f8f8f2">${escapeHtml(s.compileCmd)}</span>\n`;
                if (s.compileMsg.trim()) compiledText += `<span style="color:#50fa7b">${escapeHtml(s.compileMsg)}</span>\n\n`;
                
                compiledText += `<span style="color:#6272a4">${escapeHtml(s.terminalPrompt)} </span><span style="color:#f8f8f2">dir</span>\n`;
                compiledText += `<span style="color:#f8f8f2">${escapeHtml(psDirObj)}</span>\n\n`;

                if (s.linkCmd) {
                    compiledText += `<span style="color:#6272a4">${escapeHtml(s.terminalPrompt)} </span><span style="color:#f8f8f2">${escapeHtml(s.linkCmd)}</span>\n`;
                    if (s.linkMsg.trim()) compiledText += `<span style="color:#50fa7b">${escapeHtml(s.linkMsg)}</span>\n\n`;
                    
                    compiledText += `<span style="color:#6272a4">${escapeHtml(s.terminalPrompt)} </span><span style="color:#f8f8f2">dir</span>\n`;
                    compiledText += `<span style="color:#f8f8f2">${escapeHtml(psDirExe)}</span>\n\n`;
                }
                compiledText += `<span style="color:#6272a4">${escapeHtml(s.terminalPrompt)} </span>${CURSOR_TERM}`;
                DOM.compileOutput.innerHTML = compiledText;
            }

            // ── PHASE 3: RUN ──
            const bootSequence = s.envBootSeq || '';

            if (!focusMode || focusMode === 'run') {
                setPhase('run');

                let bootHTML = '';
                bootSequence.split('\n').forEach(line => {
                    bootHTML += `<span style="color:#8b949e">${escapeHtml(line)}</span>\n`;
                });

                DOM.runOutput.innerHTML = bootHTML + `<span>${escapeHtml(s.runPrompt)}</span>`;
                
                // 1. Dir before run
                await typeLineInto(DOM.runOutput, DOM.runBody, 'dir', s.speedTerminal, signal, '#f8f8f2');
                await printMultilineInto(DOM.runOutput, DOM.runBody, dosDirExe, 30, signal, '#f8f8f2');
                await printLineInto(DOM.runOutput, DOM.runBody, '', 50, signal);
                
                DOM.runOutput.innerHTML += CURSOR_TERM;
                scrollToBottom(DOM.runBody);
                await delay(s.pauseDir, signal);
                DOM.runOutput.innerHTML = DOM.runOutput.innerHTML.replace(CURSOR_TERM, '');
                
                // 2. Run
                DOM.runOutput.innerHTML += `<span>${escapeHtml(s.runPrompt)}</span>`;
                await typeLineInto(DOM.runOutput, DOM.runBody, s.runCmd, s.speedTerminal, signal, '#f8f8f2');
                
                await delay(400, signal);

                const outputLines = s.output.split('\n');
                for (const line of outputLines) {
                    if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
                    await printLineInto(DOM.runOutput, DOM.runBody, line, s.speedOutput, signal, '#f8f8f2');
                }

                await printLineInto(DOM.runOutput, DOM.runBody, '', 80, signal);

                DOM.runOutput.innerHTML += `<span style="color:#50fa7b">${escapeHtml(s.runPrompt)}</span>${CURSOR_TERM}`;
                scrollToBottom(DOM.runBody);
            } else {
                // Instantly paint run state if skipped
                let runText = '';
                bootSequence.split('\n').forEach(line => {
                    runText += `<span style="color:#8b949e">${escapeHtml(line)}</span>\n`;
                });
                
                runText += `<span>${escapeHtml(s.runPrompt)}</span><span style="color:#f8f8f2">dir</span>\n`;
                runText += `<span style="color:#f8f8f2">${escapeHtml(dosDirExe)}</span>\n\n`;
                
                runText += `<span>${escapeHtml(s.runPrompt)}</span><span style="color:#f8f8f2">${escapeHtml(s.runCmd)}</span>\n`;
                runText += `<span style="color:#f8f8f2">${escapeHtml(s.output)}</span>\n\n`;
                runText += `<span style="color:#50fa7b">${escapeHtml(s.runPrompt)}</span>${CURSOR_TERM}`;
                DOM.runOutput.innerHTML = runText;
            }

            // ── PHASE 4: DONE ──
            await delay(s.pauseEnd, signal);
            if (!focusMode || focusMode === 'run') {
                DOM.runOutput.innerHTML = DOM.runOutput.innerHTML.replace(CURSOR_TERM, '');
            }
            setPhase('done');

        } catch (err) {
            if (err.name === 'AbortError') { console.log('Animation aborted.'); return; }
            throw err;
        }
    }

    // ==================
    // RECORDING (Screen Capture via getDisplayMedia)
    // ==================
    async function startScreenRecording(focusMode) {
        // Set focus mode class
        if (focusMode) {
            DOM.canvasWrapper.classList.add(`focus-${focusMode}`);
        }

        // Request user to share their tab
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'browser', frameRate: 30 },
            audio: false,
            preferCurrentTab: true,
        });

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            DOM.canvasWrapper.className = 'canvas-wrapper'; // reset focus classes

            if (recordedChunks.length > 0) {
                const blob = new Blob(recordedChunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const suffix = focusMode ? `_${focusMode}` : '_all';
                a.download = `4690_basic${suffix}_${timestamp}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            }
        };

        stream.getVideoTracks()[0].addEventListener('ended', () => {
            if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            if (abortController) abortController.abort();
        });

        mediaRecorder.start(100);
    }

    // ==================
    // BUTTON EVENT HANDLERS
    // ==================
    function setPlayingUI(playing) {
        isPlaying = playing;
        isRecording = playing && isRecording;
        DOM.btnPlay.disabled = playing;
        
        const recordBtns = $$('.record-group .btn');
        recordBtns.forEach(btn => btn.disabled = playing);

        if (playing) {
            DOM.btnStop.classList.remove('hidden');
        } else {
            DOM.btnStop.classList.add('hidden');
            DOM.canvasWrapper.className = 'canvas-wrapper';
        }
    }

    DOM.btnPlay.addEventListener('click', async () => {
        if (isPlaying) return;
        setPlayingUI(true);
        abortController = new AbortController();
        try { await runAnimation(abortController.signal); }
        finally { setPlayingUI(false); }
    });

    DOM.btnStop.addEventListener('click', () => {
        if (abortController) abortController.abort();
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    });

    async function handleRecordClick(focusMode) {
        if (isPlaying || isRecording) return;
        isRecording = true;
        setPlayingUI(true);
        abortController = new AbortController();

        // Hide sidebar and go full-screen canvas
        document.body.classList.add('recording-mode');

        try {
            await startScreenRecording(focusMode);
            await delay(500, abortController.signal); // allow stream to settle
            await runAnimation(abortController.signal, focusMode);
            await delay(1000, abortController.signal); // hold final frame
        } catch (err) {
            if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                console.error('Recording error:', err);
                alert('Error al grabar: ' + err.message);
            }
        } finally {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            document.body.classList.remove('recording-mode'); // Restore sidebar
            setPlayingUI(false);
        }
    }

    DOM.btnRecordEditor.addEventListener('click', () => handleRecordClick('editor'));
    DOM.btnRecordCompile.addEventListener('click', () => handleRecordClick('compile'));
    DOM.btnRecordRun.addEventListener('click', () => handleRecordClick('run'));
    DOM.btnRecordAll.addEventListener('click', () => handleRecordClick(null));

    // ==================
    // INIT
    // ==================
    loadConfig();
    resetCanvas();

})();
