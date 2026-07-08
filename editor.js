/* ==========================================
   4690 BASIC Video Generator — Editor Module v2
   Handles editor panel rendering and animation
   ========================================== */
(function () {
    'use strict';

    const { $, delay, scrollToBottom, CURSOR_BLINK, highlightCode } = window.Utils;

    const DOM_EDITOR = {
        title: null,
        body: null,
        lineNumbers: null,
        codeOutput: null,
    };

    function bindDOM() {
        DOM_EDITOR.title = $('#editorTitle');
        DOM_EDITOR.body = $('#editorBody');
        DOM_EDITOR.lineNumbers = $('#lineNumbers');
        DOM_EDITOR.codeOutput = $('#codeOutput');
    }

    function clear() {
        if (DOM_EDITOR.lineNumbers) DOM_EDITOR.lineNumbers.textContent = '';
        if (DOM_EDITOR.codeOutput) DOM_EDITOR.codeOutput.innerHTML = '';
    }

    function paintStatic(code, fileName) {
        if (DOM_EDITOR.title) DOM_EDITOR.title.textContent = `${fileName} — 4690 BASIC Editor`;
        const lines = code.split('\n');
        DOM_EDITOR.lineNumbers.textContent = lines.map((_, i) => i + 1).join('\n');
        DOM_EDITOR.codeOutput.innerHTML = highlightCode(code);
    }

    async function animate(code, speedTyping, signal) {
        const lines = code.split('\n');
        let displayed = '';
        DOM_EDITOR.codeOutput.innerHTML = '';
        DOM_EDITOR.lineNumbers.textContent = '';

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            DOM_EDITOR.lineNumbers.textContent += (lineIdx + 1) + '\n';

            const line = lines[lineIdx];
            for (let charIdx = 0; charIdx < line.length; charIdx++) {
                if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
                displayed += line[charIdx];
                DOM_EDITOR.codeOutput.innerHTML = highlightCode(displayed) + CURSOR_BLINK;
                scrollToBottom(DOM_EDITOR.body);
                const ch = line[charIdx];
                await delay((ch === ' ' || ch === '\t') ? speedTyping * 0.2 : speedTyping, signal);
            }

            if (lineIdx < lines.length - 1) {
                displayed += '\n';
                DOM_EDITOR.codeOutput.innerHTML = highlightCode(displayed) + CURSOR_BLINK;
                scrollToBottom(DOM_EDITOR.body);
                await delay(speedTyping * 1.2, signal);
            }
        }
        DOM_EDITOR.codeOutput.innerHTML = highlightCode(displayed);
    }

    function init() {
        bindDOM();
    }

    window.Editor = {
        init,
        clear,
        paintStatic,
        animate,
    };
})();
