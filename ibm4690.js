/* ==========================================
   4690 BASIC Video Generator — IBM 4690 OS Module v2
   Handles 4690 Controller terminal with configurable steps
   ========================================== */
(function () {
    'use strict';

    const { $, delay, escapeHtml, scrollToBottom, CURSOR_TERM,
            typeTextInto, printLineInto, printMultilineInto, showPrompt } = window.Utils;

    const DOM_4690 = {
        window: null,
        body: null,
        output: null,
    };

    function bindDOM() {
        DOM_4690.window = $('#ibmWindow');
        DOM_4690.body = $('#ibmBody');
        DOM_4690.output = $('#ibmOutput');
    }

    function clear() {
        if (DOM_4690.output) DOM_4690.output.innerHTML = '';
    }

    function paintStaticSteps(prompt, bootSequence, steps, context, dirTemplate, dirTemplates) {
        const out = DOM_4690.output;
        out.innerHTML = '';
        bootSequence.split('\n').forEach(line => {
            out.innerHTML += `<span style="color:#8b949e">${escapeHtml(line)}</span>\n`;
        });
        for (const step of steps) {
            if (step.enabled === false) continue;
            let cmd = window.PowerShell.resolvePlaceholders(step.command, context);
            let output = window.PowerShell.resolvePlaceholders(step.output, context);
            const templateMatch = step.output.trim().match(/^\{\{(\w+)\}\}$/);
            if (templateMatch) {
                const tplName = templateMatch[1];
                if (dirTemplates && dirTemplates[tplName]) {
                    output = window.PowerShell.resolvePlaceholders(dirTemplates[tplName], context);
                } else if (tplName === 'DOS_DIR_RUN') {
                    output = window.PowerShell.resolvePlaceholders(dirTemplate || '', context);
                }
            }
            out.innerHTML += `<span>${escapeHtml(prompt)}</span><span style="color:#f8f8f2">${escapeHtml(cmd)}</span>\n`;
            output.split('\n').forEach(line => {
                out.innerHTML += `<span style="color:#f8f8f2">${escapeHtml(line)}</span>\n`;
            });
            out.innerHTML += '\n';
        }
        out.innerHTML += `<span style="color:#50fa7b">${escapeHtml(prompt)}</span>${CURSOR_TERM}`;
    }

    async function animateSteps(prompt, bootSequence, steps, context, dirTemplate, dirTemplates, speedTerminal, speedOutput, signal) {
        const out = DOM_4690.output;
        const body = DOM_4690.body;
        out.innerHTML = '';

        bootSequence.split('\n').forEach(line => {
            out.innerHTML += `<span style="color:#8b949e">${escapeHtml(line)}</span>\n`;
        });

        showPrompt(out, body, prompt);
        await delay(2000, signal);

        for (let si = 0; si < steps.length; si++) {
            const step = steps[si];
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            if (step.enabled === false) continue;

            let cmd = window.PowerShell.resolvePlaceholders(step.command, context);
            let rawOutput = window.PowerShell.resolvePlaceholders(step.output, context);
            const templateMatch = step.output.trim().match(/^\{\{(\w+)\}\}$/);
            if (templateMatch) {
                const tplName = templateMatch[1];
                if (dirTemplates && dirTemplates[tplName]) {
                    rawOutput = window.PowerShell.resolvePlaceholders(dirTemplates[tplName], context);
                } else if (tplName === 'DOS_DIR_RUN') {
                    rawOutput = window.PowerShell.resolvePlaceholders(dirTemplate || '', context);
                }
            }

            await typeTextInto(out, body, cmd, speedTerminal, signal, '#f8f8f2');

            if (rawOutput.trim()) {
                await printMultilineInto(out, body, rawOutput, step.outputDelay || speedOutput, signal, '#f8f8f2');
            }
            showPrompt(out, body, prompt);
            if (step.simulatedDelay > 0) {
                await delay(step.simulatedDelay, signal);
            }
        }

        out.innerHTML = out.innerHTML.replace(new RegExp(escapeHtml(prompt) + ' ' + '$', 'm'),
            '<span style="color:#50fa7b">' + escapeHtml(prompt) + ' </span>') + CURSOR_TERM;
        scrollToBottom(body);
    }

    function init() {
        bindDOM();
    }

    window.IBM4690 = {
        init,
        clear,
        paintStaticSteps,
        animateSteps,
    };
})();
