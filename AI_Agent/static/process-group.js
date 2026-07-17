/**
 * HackrAct ProcessGroup — hierarchical agent task UI (GEN / EXE / REASON / utility).
 */
(function () {
    'use strict';

    const EXPAND_KEY = 'hackract_pg_expand_mode';
    const TRACK_VIEW_KEY = 'hackract_pg_track_view';

    function esc(s) {
        if (s == null) return '';
        const d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }

    function formatDuration(ms) {
        if (ms < 1000) return ms + 'ms';
        return (ms / 1000).toFixed(1) + 's';
    }

    function truncate(str, n) {
        str = String(str || '');
        return str.length <= n ? str : str.slice(0, n - 1) + '…';
    }

    /** Human-readable step kind (aligned with agent-zero step detail labels). */
    function formatHackrActStepType(stepType) {
        const map = {
            GEN: 'LLM generation',
            REASON: 'Reasoning',
            EXE: 'Execution',
            utility: 'Status',
        };
        if (!stepType) return 'Step';
        return map[stepType] || String(stepType);
    }

    function getStepPrimaryContent(payload) {
        if (!payload) return '';
        return payload.content != null ? String(payload.content) : '';
    }

    /** Full text for "Copy all" — metadata + parameters + body (like agent-zero formatStepForCopy). */
    function formatStepForCopy(payload) {
        if (!payload) return '';
        const lines = [];
        lines.push('Type: ' + (payload.stepType || 'unknown'));
        lines.push('Label: ' + (payload.label || ''));
        const m = payload.meta || {};
        if (m.tool_name) lines.push('Tool: ' + m.tool_name);
        if (m.iteration != null) lines.push('Iteration: ' + m.iteration);
        if (m.chat_model) lines.push('Model: ' + m.chat_model);
        if (m.temperature != null) lines.push('Temperature: ' + m.temperature);
        if (m.max_tokens != null) lines.push('Max tokens: ' + m.max_tokens);
        if (m.truncated != null) lines.push('Output truncated: ' + m.truncated);
        if (m.tool_args != null) {
            lines.push('');
            lines.push('--- Parameters ---');
            lines.push(JSON.stringify(m.tool_args, null, 2));
        }
        lines.push('');
        lines.push('--- Content ---');
        lines.push(getStepPrimaryContent(payload));
        return lines.join('\n');
    }

    class ProcessGroupUI {
        /**
         * @param {HTMLElement} chatContainer
         * @param {{ modal: HTMLElement, onGroupComplete?: (summary: string) => void }} options
         */
        constructor(chatContainer, options) {
            this.chatContainer = chatContainer;
            this.modal = options.modal;
            this.onGroupComplete = options.onGroupComplete || function () {};
            this.expandMode = localStorage.getItem(EXPAND_KEY) || 'current';
            this.activeGroupEl = null;
            this.groupStartTime = 0;
            this.stepCounter = 0;
            this._genStepByIteration = new Map();
            this._modalPayload = null;
            this._modalToolArgsString = '';
            this._modalRawView = false;
            this._modalToastTimer = null;
            this._bindModal();
        }

        getExpandMode() {
            return this.expandMode;
        }

        setExpandMode(mode) {
            if (!['all', 'current', 'collapsed'].includes(mode)) return;
            this.expandMode = mode;
            localStorage.setItem(EXPAND_KEY, mode);
            this._applyExpandModeToSteps();
        }

        _bindModal() {
            if (!this.modal) return;
            const backdrop = this.modal.querySelector('.pg-modal-backdrop');
            const close = () => {
                this.modal.hidden = true;
                this.modal.setAttribute('aria-hidden', 'true');
                this._modalPayload = null;
            };
            if (backdrop) backdrop.addEventListener('click', close);
            const closeBtn = this.modal.querySelector('[data-pg-modal-close]');
            if (closeBtn) closeBtn.addEventListener('click', close);
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !this.modal.hidden) close();
            });

            const copyAll = this.modal.querySelector('[data-pg-copy-all]');
            const copyContent = this.modal.querySelector('[data-pg-copy-content]');
            const toggleRaw = this.modal.querySelector('[data-pg-toggle-raw]');
            if (copyAll) {
                copyAll.addEventListener('click', () => {
                    const t = formatStepForCopy(this._modalPayload);
                    this._clipboardCopy(t, 'Copied all');
                });
            }
            if (copyContent) {
                copyContent.addEventListener('click', () => {
                    const t = getStepPrimaryContent(this._modalPayload);
                    this._clipboardCopy(t, 'Copied content');
                });
            }
            if (toggleRaw) {
                toggleRaw.addEventListener('click', () => {
                    this._modalRawView = !this._modalRawView;
                    this._setModalRawView(this._modalRawView);
                });
            }

            this.modal.addEventListener('click', (e) => {
                const p = e.target.closest('[data-pg-copy-params]');
                if (p && this._modalToolArgsString) {
                    e.preventDefault();
                    this._clipboardCopy(this._modalToolArgsString, 'Copied parameters');
                }
            });
        }

        _clipboardCopy(text, toastMsg) {
            const s = text != null ? String(text) : '';
            navigator.clipboard.writeText(s).then(
                () => this._showModalToast(toastMsg || 'Copied'),
                () => this._showModalToast('Copy failed')
            );
        }

        _showModalToast(msg) {
            const t = this.modal && this.modal.querySelector('[data-pg-modal-toast]');
            if (!t) return;
            t.textContent = msg;
            t.hidden = false;
            t.classList.add('pg-modal-toast-visible');
            if (this._modalToastTimer) clearTimeout(this._modalToastTimer);
            this._modalToastTimer = setTimeout(() => {
                t.classList.remove('pg-modal-toast-visible');
                t.hidden = true;
            }, 2000);
        }

        _setModalRawView(isRaw) {
            const fmt = this.modal.querySelector('[data-pg-view-formatted]');
            const rawV = this.modal.querySelector('[data-pg-view-raw]');
            const btn = this.modal.querySelector('[data-pg-toggle-raw]');
            if (fmt) fmt.hidden = isRaw;
            if (rawV) rawV.hidden = !isRaw;
            if (btn) {
                btn.classList.toggle('active', isRaw);
                btn.textContent = isRaw ? 'Formatted' : 'Raw JSON';
            }
        }

        openStepModal(payload) {
            if (!this.modal) return;
            this._modalPayload = payload;
            this._modalRawView = false;
            this._setModalRawView(false);

            const meta = payload.meta || {};
            const full = {
                type: payload.stepType,
                label: payload.label,
                content: payload.content,
                meta: meta,
            };

            const title = this.modal.querySelector('[data-pg-modal-title]');
            if (title) title.textContent = 'Step details';

            const typeBadge = this.modal.querySelector('[data-pg-modal-step-type]');
            if (typeBadge) {
                typeBadge.textContent = formatHackrActStepType(payload.stepType);
                typeBadge.hidden = false;
            }

            const toolBadge = this.modal.querySelector('[data-pg-modal-tool-name]');
            if (toolBadge) {
                const tn = meta.tool_name;
                if (tn) {
                    toolBadge.textContent = tn;
                    toolBadge.hidden = false;
                } else {
                    toolBadge.textContent = '';
                    toolBadge.hidden = true;
                }
            }

            const labelText = this.modal.querySelector('[data-pg-modal-label-text]');
            if (labelText) labelText.textContent = payload.label || '—';

            const contentPre = this.modal.querySelector('[data-pg-modal-content-text]');
            if (contentPre) {
                const c = payload.content != null ? String(payload.content) : '';
                contentPre.textContent = c.length ? c : '(empty)';
            }

            const preJson = this.modal.querySelector('[data-pg-modal-json]');
            if (preJson) preJson.textContent = JSON.stringify(full, null, 2);

            const paramsEl = this.modal.querySelector('[data-pg-modal-params]');
            if (paramsEl) {
                if (meta.tool_args != null) {
                    const argsStr = JSON.stringify(meta.tool_args, null, 2);
                    this._modalToolArgsString = argsStr;
                    paramsEl.hidden = false;
                    paramsEl.innerHTML =
                        '<div class="pg-modal-kvp">' +
                        '<div class="pg-modal-kvp-head">' +
                        '<div class="pg-modal-section-title">Call parameters</div>' +
                        '<button type="button" class="pg-modal-action-btn" data-pg-copy-params>Copy</button>' +
                        '</div>' +
                        '<pre class="pg-modal-pre">' +
                        esc(argsStr) +
                        '</pre></div>';
                } else {
                    this._modalToolArgsString = '';
                    paramsEl.hidden = true;
                    paramsEl.innerHTML = '';
                }
            }

            const statsEl = this.modal.querySelector('[data-pg-modal-stats]');
            if (statsEl) {
                const stats = [];
                if (meta.iteration != null) stats.push('Iteration: ' + meta.iteration);
                if (meta.chat_model) stats.push('Model: ' + meta.chat_model);
                if (meta.temperature != null) stats.push('Temperature: ' + meta.temperature);
                if (meta.max_tokens != null) stats.push('Max tokens: ' + meta.max_tokens);
                if (meta.truncated != null) stats.push('Output truncated: ' + meta.truncated);
                if (stats.length > 0) {
                    statsEl.hidden = false;
                    statsEl.innerHTML =
                        '<div class="pg-modal-kvp">' +
                        '<div class="pg-modal-section-title">Model / run</div>' +
                        '<p class="pg-modal-stats-line">' +
                        esc(stats.join(' · ')) +
                        '</p></div>';
                } else {
                    statsEl.hidden = true;
                    statsEl.innerHTML = '';
                }
            }

            this.modal.hidden = false;
            this.modal.setAttribute('aria-hidden', 'false');
        }

        _wireInfo(btn, payload) {
            btn.addEventListener('click', () => this.openStepModal(payload));
        }

        /** Steps container for LLM stream + reasoning + status utilities */
        _thinkingRoot() {
            if (!this.activeGroupEl) return null;
            return this.activeGroupEl.querySelector('[data-pg-steps-thinking]');
        }

        /** Steps container for tool calls + terminal output */
        _toolsRoot() {
            if (!this.activeGroupEl) return null;
            return this.activeGroupEl.querySelector('[data-pg-steps-tools]');
        }

        _applyTrackView(groupEl) {
            if (!groupEl) return;
            const sel = groupEl.querySelector('[data-pg-track-select]');
            if (!sel) return;
            const v = sel.value || 'all';
            const think = groupEl.querySelector('[data-pg-track-panel="thinking"]');
            const tools = groupEl.querySelector('[data-pg-track-panel="tools"]');
            if (think) think.hidden = v === 'tools';
            if (tools) tools.hidden = v === 'thinking';
        }

        _bindTrackSelect(groupEl) {
            const sel = groupEl && groupEl.querySelector('[data-pg-track-select]');
            if (!sel) return;
            try {
                sel.value = localStorage.getItem(TRACK_VIEW_KEY) || 'all';
            } catch (e) {
                sel.value = 'all';
            }
            sel.addEventListener('change', () => {
                try {
                    localStorage.setItem(TRACK_VIEW_KEY, sel.value);
                } catch (err) {
                    /* ignore */
                }
                this._applyTrackView(groupEl);
            });
            this._applyTrackView(groupEl);
        }

        _groupHeaderEls() {
            if (!this.activeGroupEl) return {};
            return {
                badge: this.activeGroupEl.querySelector('[data-pg-group-badge]'),
                stats: this.activeGroupEl.querySelector('[data-pg-group-stats]'),
                time: this.activeGroupEl.querySelector('[data-pg-group-time]'),
            };
        }

        _setGroupBadge(text) {
            const { badge } = this._groupHeaderEls();
            if (badge) {
                badge.textContent = text;
                badge.className = 'pg-group-badge pg-badge-' + text.toLowerCase();
            }
        }

        _refreshGroupStats() {
            if (!this.activeGroupEl) return;
            const n = this.activeGroupEl.querySelectorAll('.pg-group-body .pg-step').length;
            const { stats, time } = this._groupHeaderEls();
            const elapsed = Date.now() - this.groupStartTime;
            if (stats) stats.textContent = n + ' step' + (n === 1 ? '' : 's') + ' · ' + formatDuration(elapsed);
            if (time) time.textContent = new Date(this.groupStartTime).toLocaleTimeString();
        }

        _applyExpandModeToSteps() {
            // Dropdown only toggled step bodies; group body may still be display:none
            // after finalizeSuccess — reopen so steps are visible again.
            this._expandAllProcessGroupBodies();
            this._applyExpandModeToAllGroups();
        }

        /** Show steps area for every run in chat (header chevron ▼, body visible). */
        _expandAllProcessGroupBodies() {
            this.chatContainer.querySelectorAll('.pg-group').forEach((group) => {
                const body = group.querySelector('[data-pg-group-body]');
                const headerBtn = group.querySelector('[data-pg-toggle]');
                const ch = group.querySelector('.pg-group-chevron');
                if (!body || !headerBtn) return;
                body.classList.remove('pg-group-body-collapsed');
                headerBtn.setAttribute('aria-expanded', 'true');
                if (ch) ch.textContent = '▼';
            });
        }

        _isThinkingStep(step) {
            return (
                step.classList.contains('pg-step-gen') ||
                step.classList.contains('pg-step-reason')
            );
        }

        _applyExpandModeToAllGroups() {
            this.chatContainer.querySelectorAll('.pg-group').forEach((group) => {
                ['[data-pg-steps-thinking]', '[data-pg-steps-tools]'].forEach((sel) => {
                    const root = group.querySelector(sel);
                    if (!root) return;
                    const steps = Array.from(root.querySelectorAll('.pg-step'));
                    steps.forEach((step, i) => {
                        const body = step.querySelector('.pg-step-body');
                        if (!body) return;
                        const isLast = i === steps.length - 1;
                        body.classList.remove('pg-step-body-collapsed');
                        if (this.expandMode === 'collapsed') {
                            body.classList.add('pg-step-body-collapsed');
                        } else if (this.expandMode === 'current') {
                            if (!this._isThinkingStep(step) && !isLast) {
                                body.classList.add('pg-step-body-collapsed');
                            }
                        }
                    });
                });
            });
        }

        _onNewStep(stepEl) {
            if (!stepEl) return;
            const track = stepEl.closest('[data-pg-steps-thinking], [data-pg-steps-tools]');
            if (!track) return;
            const steps = Array.from(track.querySelectorAll('.pg-step'));
            const last = steps[steps.length - 1];
            if (this.expandMode === 'all') {
                steps.forEach((s) => {
                    const b = s.querySelector('.pg-step-body');
                    if (b) b.classList.remove('pg-step-body-collapsed');
                });
            } else if (this.expandMode === 'current') {
                steps.forEach((s) => {
                    const b = s.querySelector('.pg-step-body');
                    if (!b) return;
                    if (this._isThinkingStep(s)) {
                        b.classList.remove('pg-step-body-collapsed');
                    } else {
                        b.classList.toggle('pg-step-body-collapsed', s !== last);
                    }
                });
            } else if (this.expandMode === 'collapsed') {
                steps.forEach((s) => {
                    const b = s.querySelector('.pg-step-body');
                    if (b) b.classList.add('pg-step-body-collapsed');
                });
            }
            this._refreshGroupStats();
        }

        beginGroup(userMessage) {
            if (this.activeGroupEl) {
                this._setGroupBadge('END');
                this.activeGroupEl = null;
            }
            this.groupStartTime = Date.now();
            this.stepCounter = 0;
            this._genStepByIteration.clear();
            const preview = truncate(userMessage.replace(/\s+/g, ' ').trim(), 72);
            const title = preview ? 'Task: ' + preview : 'Agent run';
            const el = document.createElement('div');
            el.className = 'pg-group';
            el.innerHTML =
                '<button type="button" class="pg-group-header" data-pg-toggle aria-expanded="true">' +
                '<span class="pg-group-chevron" aria-hidden="true">▼</span>' +
                '<div class="pg-group-header-main">' +
                '<span class="pg-group-title" data-pg-group-title>' +
                esc(title) +
                '</span>' +
                '<div class="pg-group-meta">' +
                '<span class="pg-group-badge pg-badge-gen" data-pg-group-badge>GEN</span>' +
                '<time class="pg-group-time" data-pg-group-time></time>' +
                '<span class="pg-group-stats" data-pg-group-stats>0 steps</span>' +
                '</div></div></button>' +
                '<div class="pg-group-body" data-pg-group-body>' +
                '<div class="pg-track-toolbar">' +
                '<label class="pg-track-toolbar-label" for="">View</label>' +
                '<select class="pg-track-select" data-pg-track-select title="Show thinking, tools, or both">' +
                '<option value="all">All: thinking + tools</option>' +
                '<option value="thinking">Thinking only</option>' +
                '<option value="tools">Tools only</option>' +
                '</select></div>' +
                '<div class="pg-track-panels" data-pg-track-panels>' +
                '<section class="pg-track-panel" data-pg-track-panel="thinking">' +
                '<div class="pg-track-panel-head"><span class="pg-track-panel-title">Thinking</span>' +
                '<span class="pg-track-panel-hint">LLM · reasoning</span></div>' +
                '<div class="pg-steps pg-steps-track" data-pg-steps-thinking></div>' +
                '</section>' +
                '<section class="pg-track-panel" data-pg-track-panel="tools">' +
                '<div class="pg-track-panel-head"><span class="pg-track-panel-title">Tool execution</span>' +
                '<span class="pg-track-panel-hint">Commands · output</span></div>' +
                '<div class="pg-steps pg-steps-track" data-pg-steps-tools></div>' +
                '</section></div></div>';
            const headerBtn = el.querySelector('[data-pg-toggle]');
            const body = el.querySelector('[data-pg-group-body]');
            const trackLabel = el.querySelector('.pg-track-toolbar-label');
            const trackSelect = el.querySelector('[data-pg-track-select]');
            if (trackLabel && trackSelect) {
                const tid = 'pg_track_' + String(this.groupStartTime) + '_' + Math.random().toString(36).slice(2, 8);
                trackSelect.id = tid;
                trackLabel.setAttribute('for', tid);
            }
            headerBtn.addEventListener('click', () => {
                const open = headerBtn.getAttribute('aria-expanded') === 'true';
                headerBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
                body.classList.toggle('pg-group-body-collapsed', open);
                el.querySelector('.pg-group-chevron').textContent = open ? '▶' : '▼';
            });
            const timeEl = el.querySelector('[data-pg-group-time]');
            if (timeEl) timeEl.textContent = new Date(this.groupStartTime).toLocaleTimeString();
            this.chatContainer.appendChild(el);
            this.activeGroupEl = el;
            this._bindTrackSelect(el);
            this._refreshGroupStats();
            this._scroll();
            return el;
        }

        endGroup(silent) {
            if (!this.activeGroupEl) return;
            if (!silent) this._setGroupBadge('END');
            this.activeGroupEl = null;
            this._genStepByIteration.clear();
        }

        _collapseActiveGroup() {
            const el = this.activeGroupEl;
            if (!el) return;
            const headerBtn = el.querySelector('[data-pg-toggle]');
            const body = el.querySelector('[data-pg-group-body]');
            const ch = el.querySelector('.pg-group-chevron');
            if (headerBtn && body) {
                headerBtn.setAttribute('aria-expanded', 'false');
                body.classList.add('pg-group-body-collapsed');
                if (ch) ch.textContent = '▶';
            }
            el.classList.add('pg-group-completed');
        }

        finalizeSuccess() {
            if (this.activeGroupEl) {
                this._setGroupBadge('END');
                this._collapseActiveGroup();
            }
            this._refreshGroupStats();
            this.activeGroupEl = null;
            this._genStepByIteration.clear();
        }

        finalizeError() {
            if (this.activeGroupEl) {
                this._setGroupBadge('END');
                this._collapseActiveGroup();
            }
            this._refreshGroupStats();
            this.activeGroupEl = null;
            this._genStepByIteration.clear();
        }

        _scroll() {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }

        addUtility(text, meta) {
            if (!this.activeGroupEl) return;
            const root = this._thinkingRoot();
            if (!root) return;
            const id = 'st_' + ++this.stepCounter;
            const step = document.createElement('div');
            step.className = 'pg-step pg-step-utility';
            step.dataset.stepId = id;
            const payload = { stepType: 'utility', label: 'Status', content: text, meta: meta || {} };
            step.innerHTML =
                '<div class="pg-step-connector"></div>' +
                '<div class="pg-step-inner">' +
                '<div class="pg-utility-row">' +
                '<span class="pg-utility-dot"></span>' +
                '<span class="pg-utility-text">' +
                esc(text) +
                '</span>' +
                '<button type="button" class="pg-info-btn" aria-label="Details">ⓘ</button>' +
                '</div></div>';
            this._wireInfo(step.querySelector('.pg-info-btn'), payload);
            root.appendChild(step);
            this._refreshGroupStats();
            this._scroll();
        }

        ensureGenStep(iteration, meta) {
            if (!this.activeGroupEl) return null;
            const it = iteration != null ? iteration : 0;
            if (this._genStepByIteration.has(it)) return this._genStepByIteration.get(it);
            const root = this._thinkingRoot();
            if (!root) return null;
            const id = 'st_' + ++this.stepCounter;
            const step = document.createElement('div');
            step.className = 'pg-step pg-step-gen';
            step.dataset.stepId = id;
            const payload = {
                stepType: 'GEN',
                label: 'LLM generation',
                content: '',
                meta: Object.assign({ iteration: it }, meta || {}),
            };
            step.innerHTML =
                '<div class="pg-step-connector"></div>' +
                '<div class="pg-step-inner">' +
                '<div class="pg-step-toolbar">' +
                '<span class="pg-step-icon pg-icon-gen" aria-hidden="true">✦</span>' +
                '<span class="pg-step-kind">LLM generation</span>' +
                '<span class="pg-step-tag">GEN</span>' +
                '<button type="button" class="pg-info-btn" aria-label="Step details">ⓘ</button>' +
                '</div>' +
                '<div class="pg-step-body">' +
                '<div class="pg-gen-stream" data-pg-gen-text>Calling LLM…</div>' +
                '</div></div>';
            const infoBtn = step.querySelector('.pg-info-btn');
            this._wireInfo(infoBtn, payload);
            step._pgPayload = payload;
            root.appendChild(step);
            this._genStepByIteration.set(it, step);
            this._setGroupBadge('GEN');
            this._onNewStep(step);
            this._scroll();
            return step;
        }

        updateGenStepText(iteration, text, extraMeta) {
            const step = this._genStepByIteration.get(iteration);
            if (!step) return;
            const el = step.querySelector('[data-pg-gen-text]');
            if (el) el.textContent = text;
            if (step._pgPayload) {
                step._pgPayload.content = text;
                if (extraMeta) step._pgPayload.meta = Object.assign(step._pgPayload.meta, extraMeta);
                const btn = step.querySelector('.pg-info-btn');
                if (btn) this._wireInfo(btn, step._pgPayload);
            }
        }

        addReasonStep(text, meta) {
            if (!this.activeGroupEl) return;
            const root = this._thinkingRoot();
            if (!root) return;
            const id = 'st_' + ++this.stepCounter;
            const step = document.createElement('div');
            step.className = 'pg-step pg-step-reason';
            step.dataset.stepId = id;
            const payload = {
                stepType: 'REASON',
                label: 'Inner monologue',
                content: text,
                meta: meta || {},
            };
            step.innerHTML =
                '<div class="pg-step-connector"></div>' +
                '<div class="pg-step-inner">' +
                '<div class="pg-step-toolbar">' +
                '<span class="pg-step-icon pg-icon-reason" aria-hidden="true">💭</span>' +
                '<span class="pg-step-kind">Reasoning</span>' +
                '<span class="pg-step-tag pg-tag-muted">INT</span>' +
                '<button type="button" class="pg-info-btn" aria-label="Step details">ⓘ</button>' +
                '</div>' +
                '<div class="pg-step-body">' +
                '<div class="pg-reason-bubble">' +
                esc(text) +
                '</div></div></div>';
            this._wireInfo(step.querySelector('.pg-info-btn'), payload);
            root.appendChild(step);
            this._setGroupBadge('GEN');
            this._onNewStep(step);
            this._scroll();
        }

        addExeStep(commandLine, meta, outputText) {
            if (!this.activeGroupEl) return;
            const root = this._toolsRoot();
            if (!root) return;
            const id = 'st_' + ++this.stepCounter;
            const step = document.createElement('div');
            step.className = 'pg-step pg-step-exe';
            step.dataset.stepId = id;
            const out = outputText != null ? String(outputText) : '';
            const payload = {
                stepType: 'EXE',
                label: 'Terminal / tool',
                content: commandLine + (out ? '\n\n' + out : ''),
                meta: meta || {},
            };
            const uid = 'term_' + id;
            step.innerHTML =
                '<div class="pg-step-connector"></div>' +
                '<div class="pg-step-inner">' +
                '<div class="pg-step-toolbar">' +
                '<span class="pg-step-icon pg-icon-exe" aria-hidden="true">▸</span>' +
                '<span class="pg-step-kind">Execution</span>' +
                '<span class="pg-step-tag">EXE</span>' +
                '<button type="button" class="pg-info-btn" aria-label="Step details">ⓘ</button>' +
                '</div>' +
                '<div class="pg-step-body">' +
                '<div class="pg-terminal">' +
                '<div class="pg-terminal-bar">' +
                '<span class="pg-terminal-label">terminal</span>' +
                '<button type="button" class="pg-copy-btn" data-copy-target="' +
                uid +
                '">Copy</button>' +
                '</div>' +
                '<pre class="pg-terminal-body" id="' +
                uid +
                '">' +
                esc(commandLine) +
                (out ? '\n\n' + esc(out) : '') +
                '</pre></div></div></div>';
            this._wireInfo(step.querySelector('.pg-info-btn'), payload);
            const copyBtn = step.querySelector('.pg-copy-btn');
            const pre = step.querySelector('#' + uid);
            copyBtn.addEventListener('click', () => {
                const t = pre ? pre.textContent : '';
                navigator.clipboard.writeText(t).catch(() => {});
            });
            step._pgPayload = payload;
            root.appendChild(step);
            this._setGroupBadge('EXE');
            this._onNewStep(step);
            this._scroll();
        }

        appendExeOutput(commandLine, meta, moreOutput) {
            const root = this._toolsRoot();
            if (!root) return;
            const steps = root.querySelectorAll('.pg-step-exe');
            const last = steps[steps.length - 1];
            if (last) {
                const pre = last.querySelector('.pg-terminal-body');
                if (pre) {
                    pre.appendChild(document.createTextNode('\n\n' + String(moreOutput || '')));
                    this._syncExePayload(last, pre, meta);
                }
            } else {
                this.addExeStep(commandLine || '$ tool', meta, moreOutput);
            }
            this._scroll();
        }

        _syncExePayload(stepEl, pre, meta) {
            if (!stepEl || !pre) return;
            if (!stepEl._pgPayload) {
                stepEl._pgPayload = {
                    stepType: 'EXE',
                    label: 'Terminal / tool',
                    content: pre.textContent,
                    meta: meta || {},
                };
            } else {
                stepEl._pgPayload.content = pre.textContent;
                stepEl._pgPayload.meta = Object.assign(stepEl._pgPayload.meta || {}, meta || {});
            }
            const ib = stepEl.querySelector('.pg-info-btn');
            if (ib) this._wireInfo(ib, stepEl._pgPayload);
        }

        /**
         * Live terminal bytes while code_execution_tool runs (WebSocket terminal_stream).
         */
        appendTerminalStream(chunk, meta) {
            if (!this.activeGroupEl || chunk == null) return;
            const root = this._toolsRoot();
            if (!root) return;
            const steps = root.querySelectorAll('.pg-step-exe');
            const last = steps[steps.length - 1];
            if (!last) return;
            const pre = last.querySelector('.pg-terminal-body');
            if (!pre) return;
            const text = String(chunk);
            if (meta && meta.stderr) {
                const span = document.createElement('span');
                span.className = 'pg-terminal-stderr';
                span.textContent = text;
                pre.appendChild(span);
            } else {
                pre.appendChild(document.createTextNode(text));
            }
            this._syncExePayload(last, pre, meta || {});
            this._scroll();
        }

        /**
         * @returns {boolean} true if handled
         */
        handleWebSocketMessage(data) {
            const type = data.type;
            const content = data.content != null ? String(data.content) : '';
            const meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
            const iter = meta.iteration != null ? meta.iteration : 0;

            if (type === 'status') {
                if (this.activeGroupEl && content && content !== 'Processing...') {
                    this.addUtility(content, meta);
                }
                return !!this.activeGroupEl;
            }

            if (type === 'thinking') {
                this.ensureGenStep(iter, meta);
                this.updateGenStepText(iter, content, meta);
                return true;
            }

            if (type === 'llm_start') {
                this.ensureGenStep(iter, meta);
                this.updateGenStepText(iter, content, meta);
                return true;
            }

            if (type === 'thought') {
                this.ensureGenStep(iter, meta);
                this.updateGenStepText(iter, 'Response received — see reasoning below.', meta);
                this.addReasonStep(content, meta);
                return true;
            }

            if (type === 'tool') {
                const tn = meta.tool_name || content.replace(/^Executing tool:\s*/i, '').trim();
                const cmd = '$ ' + (tn || 'tool');
                const argsStr =
                    meta.tool_args != null ? JSON.stringify(meta.tool_args, null, 2) : '';
                const block = argsStr ? cmd + '\n' + argsStr : cmd;
                this.addExeStep(block, meta, '');
                return true;
            }

            if (type === 'terminal_stream') {
                this.appendTerminalStream(content, meta);
                return true;
            }

            if (type === 'tool_output') {
                const out = content.replace(/^Tool Output:\s*\n?/, '');
                this.appendExeOutput(null, meta, out);
                return true;
            }

            return false;
        }
    }

    window.HackrActProcessGroup = {
        EXPAND_KEY: EXPAND_KEY,
        TRACK_VIEW_KEY: TRACK_VIEW_KEY,
        ProcessGroupUI: ProcessGroupUI,
    };
})();
