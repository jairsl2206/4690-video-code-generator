/* ==========================================
   4690 BASIC Video Generator — PowerShell Module v2
   Handles PowerShell terminal with configurable steps
   ========================================== */
(function () {
    'use strict';

    const { $, delay, escapeHtml, scrollToBottom, CURSOR_TERM,
            typeTextInto, printLineInto, printMultilineInto, showPrompt } = window.Utils;

    const DOM_PS = {
        window: null,
        body: null,
        output: null,
    };

    function bindDOM() {
        DOM_PS.window = $('#psWindow');
        DOM_PS.body = $('#psBody');
        DOM_PS.output = $('#psOutput');
    }

    function clear() {
        if (DOM_PS.output) DOM_PS.output.innerHTML = '';
    }

    function resolvePlaceholders(text, context) {
        let result = text;
        if (context) {
            Object.keys(context).forEach(key => {
                result = result.replace(new RegExp('{{' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '}}', 'g'), context[key] || '');
            });
        }
        return result;
    }

    async function paintStaticSteps(prompt, steps, context, dirTemplate, dirTemplates) {
        const out = DOM_PS.output;
        out.innerHTML = '';
        for (const step of steps) {
            if (step.enabled === false) continue;
            let cmd = resolvePlaceholders(step.command, context);
            let output = resolvePlaceholders(step.output, context);
            const templateMatch = step.output.trim().match(/^\{\{(\w+)\}\}$/);
            if (templateMatch) {
                const tplName = templateMatch[1];
                if (dirTemplates && dirTemplates[tplName]) {
                    output = resolvePlaceholders(dirTemplates[tplName], context);
                } else if (tplName === 'PS_DIR_OBJ') {
                    output = resolvePlaceholders((dirTemplate || '').replace('{{FILE_286}}\n', '').replace('{{FILE_SYM}}\n', '').replace('{{FILE_286}}', '').replace('{{FILE_SYM}}', ''), context);
                } else if (tplName === 'PS_DIR_EXE') {
                    output = resolvePlaceholders(dirTemplate || '', context);
                }
            }
            out.innerHTML += `<span style="color:#6272a4">${escapeHtml(prompt)} </span><span style="color:#f8f8f2">${escapeHtml(cmd)}</span>\n`;
            output.split('\n').forEach(line => {
                out.innerHTML += `<span style="color:#50fa7b">${escapeHtml(line)}</span>\n`;
            });
            out.innerHTML += '\n';
        }
        out.innerHTML += `<span style="color:#6272a4">${escapeHtml(prompt)} </span>${CURSOR_TERM}`;
    }

    async function animateSteps(prompt, steps, context, dirTemplate, dirTemplates, speedTerminal, signal) {
        const out = DOM_PS.output;
        const body = DOM_PS.body;
        out.innerHTML = '';

        showPrompt(out, body, prompt, '#6272a4');

        for (let si = 0; si < steps.length; si++) {
            const step = steps[si];
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            if (step.enabled === false) continue;

            let cmd = resolvePlaceholders(step.command, context);
            let rawOutput = resolvePlaceholders(step.output, context);

            const templateMatch = step.output.trim().match(/^\{\{(\w+)\}\}$/);
            if (templateMatch) {
                const tplName = templateMatch[1];
                if (dirTemplates && dirTemplates[tplName]) {
                    rawOutput = resolvePlaceholders(dirTemplates[tplName], context);
                } else if (tplName === 'PS_DIR_OBJ') {
                    rawOutput = resolvePlaceholders(
                        (dirTemplate || '').replace('{{FILE_286}}\n', '').replace('{{FILE_SYM}}\n', '').replace('{{FILE_286}}', '').replace('{{FILE_SYM}}', ''),
                        context
                    );
                } else if (tplName === 'PS_DIR_EXE') {
                    rawOutput = resolvePlaceholders(dirTemplate || '', context);
                }
            }

            await typeTextInto(out, body, cmd, speedTerminal, signal, '#f8f8f2');

            if (rawOutput.trim()) {
                await printMultilineInto(out, body, rawOutput, step.outputDelay || 55, signal, '#50fa7b');
            }
            showPrompt(out, body, prompt, '#6272a4');
            await delay(step.simulatedDelay || 1500, signal);
        }
    }

    function init() {
        bindDOM();
    }

    window.PowerShell = {
        init,
        clear,
        paintStaticSteps,
        animateSteps,
        resolvePlaceholders,
    };
})();
