/* ==========================================
   4690 BASIC Video Generator — Config v2
   Configuration management (load/save/export/import)
   New schema with configurable steps for each module
   ========================================== */
(function () {
    'use strict';

    const { $, $$ } = window.Utils;

    const STORAGE_KEY = 'basicSimulatorConfigV2';
    let _loading = false;

    const DEFAULT_CONFIG = {
        meta: {
            version: '2.0',
            description: '4690 BASIC Video Generator — Configuración de Simulación'
        },
        simulation: {
            type: 'all',
            fontSize: '1.0',
            videoFormat: 'mp4',
            videoPrefix: '',
            speedTyping: 20,
            speedTerminal: 30,
            speedOutput: 100,
            pauseBetweenPhases: 1000
        },
        editor: {
            fileName: 'Example.bas',
            code: `! Tipos de datos fundamentales
%ENVIRON C

! String (Sufijo $)
ItemDescription$ = "Cereal 500g"

! Entero (Sufijo %)
Quantity% = 3

! Real (Sin sufijo)
UnitPrice = 45.50

! Calculo de tipo real
SubTotal = Quantity% * UnitPrice

PRINT "Producto: "; ItemDescription$
PRINT "Cantidad: "; Quantity%
PRINT "Precio U: $"; UnitPrice
PRINT "Total:    $"; SubTotal
END`
        },
        powershell: {
            prompt: 'PS C:\\>',
            dirTemplate: `    Directorio: C:\\CURSO

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----     25/06/2025  11:10 a. m.         276080 BASIC.EXE
{{FILE_BAS}}
{{FILE_OBJ}}
{{FILE_SYM}}
{{FILE_286}}
-a----     09/07/2025  01:08 p. m.         134388 link86.exe
-a----     09/07/2025  01:08 p. m.         141952 sb286l.l86
-a----     09/07/2025  01:08 p. m.          14720 sb286tvl.l86`,
            dirTemplates: {},
            steps: [
                {
                    enabled: true,
                    command: '.\\BASIC.EXE .\\Example.bas',
                    output: `BASIC .\\Example.bas
--------------------------------------------------
IBM 4680 BASIC Compiler  07/09/10  Version 3.15
5696-192 (c) Copyright IBM Corp 1986-2004.
Licensed Material - Program Property Of IBM.
  (c) Copyright Digital Research Inc. 1985
--------------------------------------------------
end of pass 1
end of pass 2
End of Compilation

        Large Memory Model Controller Code Generation
    --------------------------------------------------
        Code segment size:      00a8H (168 bytes)
        Data segment size:      0072H (114 bytes)
    --------------------------------------------------`,
                    simulatedDelay: 1500,
                    outputDelay: 55
                },
                {
                    enabled: true,
                    command: 'dir',
                    output: '{{PS_DIR_OBJ}}',
                    simulatedDelay: 2000,
                    outputDelay: 30
                },
                {
                    enabled: true,
                    command: '.\\link86.exe .\\EXAMPLE.OBJ',
                    output: `--------------------------------------------------
LINK86 Linkage Editor      vers. 3.10c
F l e x O S  -  2 8 6   L i n k e r
Copyright (C) 1982-1991     Digital Research, Inc.
--------------------------------------------------

....................................................

CODE    00a06h =    2566
DATA    00b04h =    2820
STACK   00a00h =    2560
         Total =    7946`,
                    simulatedDelay: 1000,
                    outputDelay: 45
                },
                {
                    enabled: true,
                    command: 'dir',
                    output: '{{PS_DIR_EXE}}',
                    simulatedDelay: 2000,
                    outputDelay: 30
                }
            ]
        },
        ibm4690: {
            prompt: 'C:CURSO/>',
            bootSequence: `C>ECHO OFF
This message was displayed by AUTOEXEC.BAT in ADX_UPGM:
IP addresses.

addr          127.0.0.1 interface 0 mask ff000000 broadcast            0.0.0.0
addr      192.168.1.150 interface 0 mask ffffff00 broadcast      192.168.1.255

C:>cd CURSO`,
            dirTemplate: `  Volume in drive h0: is DISK_C
  Directory of h0:CURSO/

.            <DIR>      {{DATE_4690}}  10:33a
..           <DIR>      {{DATE_4690}}  10:33a
{{FILE_286_DOS}}

           5 Files   29493056 KB free`,
            dirTemplates: {},
            steps: [
                {
                    enabled: true,
                    command: 'dir',
                    output: '{{DOS_DIR_RUN}}',
                    simulatedDelay: 2000,
                    outputDelay: 30
                },
                {
                    enabled: true,
                    command: 'EXAMPLE1',
                    output: `Iniciando sistema POS...
Verificando dispositivo  1
Verificando dispositivo  2
Verificando dispositivo  3
Sistema listo.`,
                    simulatedDelay: 400,
                    outputDelay: 100
                }
            ]
        }
    };

    const DOM_CONFIG = {
        inputSimType: null,
        inputFileName: null,
        inputCode: null,
        inputPSPrompt: null,
        inputPSDirTemplate: null,
        inputPSDirTemplates: null,
        psStepsContainer: null,
        input4690Prompt: null,
        input4690BootSeq: null,
        input4690DirTemplate: null,
        input4690DirTemplates: null,
        ibmStepsContainer: null,
        speedTyping: null,
        speedTerminal: null,
        speedOutput: null,
        pausePhase: null,
        fontSize: null,
        videoFormat: null,
        videoPrefix: null,
        valTyping: null,
        valTerminal: null,
        valOutput: null,
        valPause: null,
        valFontSize: null,
        btnExportConfig: null,
        fileImportConfig: null,
    };

    function bindDOM() {
        DOM_CONFIG.inputSimType = $('#simType');
        DOM_CONFIG.inputFileName = $('#inputFileName');
        DOM_CONFIG.inputCode = $('#inputCode');
        DOM_CONFIG.inputPSPrompt = $('#inputPSPrompt');
        DOM_CONFIG.inputPSDirTemplate = $('#inputPSDirTemplate');
        DOM_CONFIG.inputPSDirTemplates = $('#inputPSDirTemplates');
        DOM_CONFIG.psStepsContainer = $('#psStepsContainer');
        DOM_CONFIG.input4690Prompt = $('#input4690Prompt');
        DOM_CONFIG.input4690BootSeq = $('#input4690BootSeq');
        DOM_CONFIG.input4690DirTemplate = $('#input4690DirTemplate');
        DOM_CONFIG.input4690DirTemplates = $('#input4690DirTemplates');
        DOM_CONFIG.ibmStepsContainer = $('#ibmStepsContainer');
        DOM_CONFIG.speedTyping = $('#speedTyping');
        DOM_CONFIG.speedTerminal = $('#speedTerminal');
        DOM_CONFIG.speedOutput = $('#speedOutput');
        DOM_CONFIG.pausePhase = $('#pausePhase');
        DOM_CONFIG.fontSize = $('#fontSize');
        DOM_CONFIG.videoFormat = $('#videoFormat');
        DOM_CONFIG.videoPrefix = $('#videoPrefix');
        DOM_CONFIG.valTyping = $('#valTyping');
        DOM_CONFIG.valTerminal = $('#valTerminal');
        DOM_CONFIG.valOutput = $('#valOutput');
        DOM_CONFIG.valPause = $('#valPause');
        DOM_CONFIG.valFontSize = $('#valFontSize');
        DOM_CONFIG.btnExportConfig = $('#btnExportConfig');
        DOM_CONFIG.fileImportConfig = $('#fileImportConfig');
    }

    function getConfig() {
        const dc = DOM_CONFIG;
        const steps = [];
        if (dc.psStepsContainer) {
            dc.psStepsContainer.querySelectorAll('.step-item').forEach(stepEl => {
                steps.push({
                    enabled: stepEl.querySelector('.step-enabled')?.checked ?? true,
                    command: stepEl.querySelector('.step-cmd')?.value ?? '',
                    output: stepEl.querySelector('.step-out')?.value ?? '',
                    simulatedDelay: parseInt(stepEl.querySelector('.step-delay')?.value ?? '1500'),
                    outputDelay: parseInt(stepEl.querySelector('.step-outdelay')?.value ?? '30')
                });
            });
        }
        const ibmSteps = [];
        if (dc.ibmStepsContainer) {
            dc.ibmStepsContainer.querySelectorAll('.step-item').forEach(stepEl => {
                ibmSteps.push({
                    enabled: stepEl.querySelector('.step-enabled')?.checked ?? true,
                    command: stepEl.querySelector('.step-cmd')?.value ?? '',
                    output: stepEl.querySelector('.step-out')?.value ?? '',
                    simulatedDelay: parseInt(stepEl.querySelector('.step-delay')?.value ?? '2000'),
                    outputDelay: parseInt(stepEl.querySelector('.step-outdelay')?.value ?? '30')
                });
            });
        }
        return {
            meta: { version: '2.0' },
            simulation: {
                type: dc.inputSimType ? dc.inputSimType.value : 'all',
                fontSize: dc.fontSize ? dc.fontSize.value : '1.0',
                videoFormat: dc.videoFormat ? dc.videoFormat.value : 'mp4',
                videoPrefix: dc.videoPrefix ? dc.videoPrefix.value.trim() : '',
                speedTyping: dc.speedTyping ? parseInt(dc.speedTyping.value) : 20,
                speedTerminal: dc.speedTerminal ? parseInt(dc.speedTerminal.value) : 30,
                speedOutput: dc.speedOutput ? parseInt(dc.speedOutput.value) : 100,
                pauseBetweenPhases: dc.pausePhase ? parseInt(dc.pausePhase.value) : 1000
            },
            editor: {
                fileName: dc.inputFileName ? dc.inputFileName.value.trim() : 'MAIN.BAS',
                code: dc.inputCode ? dc.inputCode.value : ''
            },
            powershell: {
                prompt: dc.inputPSPrompt ? dc.inputPSPrompt.value.trim() : 'PS C:\\>',
                dirTemplate: dc.inputPSDirTemplate ? dc.inputPSDirTemplate.value : '',
                dirTemplates: parseDirTemplates(dc.inputPSDirTemplates),
                steps: steps
            },
            ibm4690: {
                prompt: dc.input4690Prompt ? dc.input4690Prompt.value.trim() : 'C:CURSO/>',
                bootSequence: dc.input4690BootSeq ? dc.input4690BootSeq.value : '',
                dirTemplate: dc.input4690DirTemplate ? dc.input4690DirTemplate.value : '',
                dirTemplates: parseDirTemplates(dc.input4690DirTemplates),
                steps: ibmSteps
            }
        };
    }

    function parseDirTemplates(inputEl) {
        if (!inputEl) return {};
        try {
            const val = inputEl.value.trim();
            return val ? JSON.parse(val) : {};
        } catch (e) {
            return {};
        }
    }

    function saveConfig() {
        const config = getConfig();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }

    function createStepElement(step, index, prefix) {
        const el = document.createElement('div');
        el.className = 'step-item';
        el.innerHTML = `
            <div class="step-header">
                <label class="step-toggle">
                    <input type="checkbox" class="step-enabled" ${step.enabled !== false ? 'checked' : ''}>
                    <span class="step-label">Paso ${index + 1}</span>
                </label>
                <button type="button" class="step-remove" title="Eliminar paso">✕</button>
            </div>
            <div class="step-body">
                <div class="input-group">
                    <label>Comando a ejecutar</label>
                    <input type="text" class="step-cmd" value="${step.command ? step.command.replace(/"/g, '&quot;') : ''}" placeholder="ej. .\\BASIC.EXE .\\Example.bas">
                </div>
                <div class="input-group">
                    <label>Salida del comando (multilínea)</label>
                    <textarea class="step-out" rows="5" spellcheck="false" placeholder="Salida del comando...">${step.output || ''}</textarea>
                </div>
                <div class="step-controls-row">
                    <div class="input-group step-small">
                        <label>Delay simulado (ms)</label>
                        <input type="number" class="step-delay" value="${step.simulatedDelay || 1500}" min="0" max="30000" step="100">
                    </div>
                    <div class="input-group step-small">
                        <label>Delay x línea (ms)</label>
                        <input type="number" class="step-outdelay" value="${step.outputDelay || 55}" min="0" max="2000" step="5">
                    </div>
                </div>
            </div>`;
        el.querySelector('.step-remove').addEventListener('click', () => {
            el.remove();
            saveConfig();
            renumberSteps(prefix);
        });
        el.querySelectorAll('input, textarea').forEach(inp => {
            inp.addEventListener('input', () => { if (!_loading) saveConfig(); });
            inp.addEventListener('change', () => { if (!_loading) saveConfig(); });
        });
        return el;
    }

    function renumberSteps(prefix) {
        const container = prefix === 'ps' ? DOM_CONFIG.psStepsContainer : DOM_CONFIG.ibmStepsContainer;
        if (!container) return;
        container.querySelectorAll('.step-item .step-label').forEach((label, i) => {
            label.textContent = 'Paso ' + (i + 1);
        });
    }

    function addStep(prefix, stepData) {
        const container = prefix === 'ps' ? DOM_CONFIG.psStepsContainer : DOM_CONFIG.ibmStepsContainer;
        if (!container) return;
        const index = container.querySelectorAll('.step-item').length;
        const step = stepData || { enabled: true, command: '', output: '', simulatedDelay: prefix === 'ps' ? 1500 : 2000, outputDelay: 30 };
        const el = createStepElement(step, index, prefix);
        container.appendChild(el);
        saveConfig();
    }

    function loadStepsInto(container, steps, prefix) {
        if (!container) return;
        container.innerHTML = '';
        if (steps && steps.length > 0) {
            steps.forEach((step, i) => {
                const el = createStepElement(step, i, prefix);
                container.appendChild(el);
            });
        }
    }

    function setFormValues(config) {
        const dc = DOM_CONFIG;
        const sim = config.simulation || {};
        const ed = config.editor || {};
        const ps = config.powershell || {};
        const ibm = config.ibm4690 || {};

        if (sim.type && dc.inputSimType) dc.inputSimType.value = sim.type;
        if (sim.fontSize && dc.fontSize) dc.fontSize.value = sim.fontSize;
        if (sim.videoFormat && dc.videoFormat) dc.videoFormat.value = sim.videoFormat;
        if (sim.videoPrefix !== undefined && dc.videoPrefix) dc.videoPrefix.value = sim.videoPrefix;
        if (sim.speedTyping && dc.speedTyping) dc.speedTyping.value = sim.speedTyping;
        if (sim.speedTerminal && dc.speedTerminal) dc.speedTerminal.value = sim.speedTerminal;
        if (sim.speedOutput && dc.speedOutput) dc.speedOutput.value = sim.speedOutput;
        if (sim.pauseBetweenPhases && dc.pausePhase) dc.pausePhase.value = sim.pauseBetweenPhases;

        if (ed.fileName && dc.inputFileName) dc.inputFileName.value = ed.fileName;
        if (ed.code && dc.inputCode) dc.inputCode.value = ed.code;

        if (ps.prompt && dc.inputPSPrompt) dc.inputPSPrompt.value = ps.prompt;
        if (ps.dirTemplate && dc.inputPSDirTemplate) dc.inputPSDirTemplate.value = ps.dirTemplate;
        if (ps.dirTemplates && dc.inputPSDirTemplates) dc.inputPSDirTemplates.value = JSON.stringify(ps.dirTemplates, null, 2);
        loadStepsInto(dc.psStepsContainer, ps.steps, 'ps');

        if (ibm.prompt && dc.input4690Prompt) dc.input4690Prompt.value = ibm.prompt;
        if (ibm.bootSequence && dc.input4690BootSeq) dc.input4690BootSeq.value = ibm.bootSequence;
        if (ibm.dirTemplate && dc.input4690DirTemplate) dc.input4690DirTemplate.value = ibm.dirTemplate;
        if (ibm.dirTemplates && dc.input4690DirTemplates) dc.input4690DirTemplates.value = JSON.stringify(ibm.dirTemplates, null, 2);
        loadStepsInto(dc.ibmStepsContainer, ibm.steps, 'ibm');

        updateSliderLabels();
        applyFontSize();
    }

    function loadConfig() {
        _loading = true;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const config = JSON.parse(saved);
                setFormValues(config);
            } catch (e) {
                console.error('Error loading config, using defaults', e);
                setFormValues(DEFAULT_CONFIG);
            }
        } else {
            setFormValues(DEFAULT_CONFIG);
        }
        _loading = false;
    }

    function resetToDefaults() {
        setFormValues(DEFAULT_CONFIG);
        saveConfig();
    }

    function updateSliderLabels() {
        const dc = DOM_CONFIG;
        if (dc.valTyping && dc.speedTyping) dc.valTyping.textContent = dc.speedTyping.value + 'ms';
        if (dc.valTerminal && dc.speedTerminal) dc.valTerminal.textContent = dc.speedTerminal.value + 'ms';
        if (dc.valOutput && dc.speedOutput) dc.valOutput.textContent = dc.speedOutput.value + 'ms';
        if (dc.valPause && dc.pausePhase) dc.valPause.textContent = (parseInt(dc.pausePhase.value) / 1000).toFixed(1) + 's';
        if (dc.valFontSize && dc.fontSize) dc.valFontSize.textContent = dc.fontSize.value;
    }

    function applyFontSize() {
        if (DOM_CONFIG.fontSize) {
            document.documentElement.style.setProperty('--font-size', DOM_CONFIG.fontSize.value + 'rem');
        }
    }

    function init() {
        bindDOM();

        if (DOM_CONFIG.fontSize) {
            DOM_CONFIG.fontSize.addEventListener('input', () => {
                applyFontSize();
                updateSliderLabels();
            });
        }

        const sliders = [DOM_CONFIG.speedTyping, DOM_CONFIG.speedTerminal, DOM_CONFIG.speedOutput, DOM_CONFIG.pausePhase];
        sliders.forEach(s => { if (s) s.addEventListener('input', updateSliderLabels); });

        document.querySelectorAll('input, textarea, select').forEach(el => {
            el.addEventListener('input', saveConfig);
            el.addEventListener('change', saveConfig);
        });

        if (DOM_CONFIG.btnExportConfig) {
            DOM_CONFIG.btnExportConfig.addEventListener('click', async () => {
                const configJson = JSON.stringify(getConfig(), null, 2);
                if (window.showSaveFilePicker) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: '4690_simulator_config.json',
                            id: 'sim_config_dir',
                            types: [{ description: 'JSON Configuration File', accept: { 'application/json': ['.json'] } }],
                        });
                        const writable = await handle.createWritable();
                        await writable.write(configJson);
                        await writable.close();
                        return;
                    } catch (err) {
                        if (err.name === 'AbortError') return;
                    }
                }
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(configJson);
                const a = document.createElement('a');
                a.href = dataStr;
                a.download = '4690_simulator_config.json';
                document.body.appendChild(a);
                a.click();
                a.remove();
            });
        }

        if (DOM_CONFIG.fileImportConfig) {
            DOM_CONFIG.fileImportConfig.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    localStorage.setItem(STORAGE_KEY, ev.target.result);
                    loadConfig();
                    alert('Configuracion importada exitosamente.');
                };
                reader.readAsText(file);
            });
        }

        const btnAddPsStep = $('#btnAddPsStep');
        const btnAddIbmStep = $('#btnAddIbmStep');
        if (btnAddPsStep) btnAddPsStep.addEventListener('click', () => addStep('ps'));
        if (btnAddIbmStep) btnAddIbmStep.addEventListener('click', () => addStep('ibm'));

        const btnResetConfig = $('#btnResetConfig');
        if (btnResetConfig) btnResetConfig.addEventListener('click', () => {
            if (confirm('Esto restaurará la configuración por defecto. ¿Continuar?')) {
                resetToDefaults();
            }
        });

        applyFontSize();
        updateSliderLabels();
    }

    window.Config = {
        getConfig,
        saveConfig,
        loadConfig,
        init,
        DEFAULT_CONFIG,
        addStep: (prefix) => addStep(prefix),
    };
})();
