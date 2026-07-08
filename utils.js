/* ==========================================
   4690 BASIC Video Generator — Utils v2
   Shared: DOM helpers, typing, highlighting, delay
   ========================================== */
(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

    const CURSOR_BLINK = '<span class="cursor-blink">│</span>';
    const CURSOR_TERM = '<span class="cursor-blink terminal-cursor">█</span>';

    async function typeTextInto(contentEl, scrollEl, text, speed, signal, color) {
        const base = contentEl.innerHTML.replace(CURSOR_TERM, '');
        let typed = '';

        for (let i = 0; i < text.length; i++) {
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            typed += escapeHtml(text[i]);
            const style = color ? ` style="color:${color}"` : '';
            contentEl.innerHTML = base + `<span${style}>${typed}</span>` + CURSOR_TERM;
            scrollToBottom(scrollEl);
            const ch = text[i];
            await delay((ch === ' ' || ch === '\t') ? speed * 0.2 : speed, signal);
        }

        const style = color ? ` style="color:${color}"` : '';
        contentEl.innerHTML = base + `<span${style}>${escapeHtml(text)}</span>\n`;
        scrollToBottom(scrollEl);
    }

    async function printLineInto(contentEl, scrollEl, text, delayMs, signal, color) {
        if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const style = color ? ` style="color:${color}"` : '';
        contentEl.innerHTML += `<span${style}>${escapeHtml(text)}</span>\n`;
        scrollToBottom(scrollEl);
        await delay(delayMs, signal);
    }

    async function printMultilineInto(contentEl, scrollEl, text, lineDelay, signal, color) {
        const lines = text.split('\n');
        for (const line of lines) {
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            await printLineInto(contentEl, scrollEl, line, lineDelay, signal, color);
        }
    }

    function showPrompt(contentEl, scrollEl, promptText, color) {
        const style = color ? ` style="color:${color}"` : '';
        contentEl.innerHTML += `<span${style}>${escapeHtml(promptText)} </span>${CURSOR_TERM}`;
        scrollToBottom(scrollEl);
    }

    function removeCursor(contentEl) {
        contentEl.innerHTML = contentEl.innerHTML.replace(CURSOR_TERM, '');
    }

    function addCursor(contentEl, scrollEl) {
        if (!contentEl.innerHTML.endsWith(CURSOR_TERM)) {
            contentEl.innerHTML += CURSOR_TERM;
            scrollToBottom(scrollEl);
        }
    }

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

    const CLASS_MAP = {
        keyword: 'syn-keyword', string: 'syn-string', comment: 'syn-comment',
        number: 'syn-number', directive: 'syn-directive',
        'variable-str': 'syn-variable-str', 'variable-int': 'syn-variable-int',
        label: 'syn-label', operator: 'syn-operator',
    };

    function classifyWord(word) {
        return BASIC_KEYWORDS.has(word.toUpperCase()) ? { text: word, type: 'keyword' } : { text: word, type: 'plain' };
    }

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

    window.Utils = {
        $, $$,
        escapeHtml,
        delay,
        scrollToBottom,
        CURSOR_BLINK,
        CURSOR_TERM,
        typeTextInto,
        printLineInto,
        printMultilineInto,
        showPrompt,
        removeCursor,
        addCursor,
        highlightLine,
        highlightCode,
        tokenizeLine,
    };
})();
