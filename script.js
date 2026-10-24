class KegelTrainer {
    constructor() {
        this.currentSet = 1;
        this.currentRep = 1;
        this.isRunning = false;
        this.isPaused = false;
        this.currentPhase = 'ready';
        this.timer = null;
        this.timeLeft = 0;
        this.restTime = CONFIG.DEFAULT_SETTINGS.restTime;
        this.completeTimeout = null;

        // 基于时间戳的计时器状态
        this.timerStartTime = null;
        this.timerDuration = 0;

        // 主题状态
        this.currentTheme = null;
        this.themeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
        this.themeTransitionTimer = null;

        this.wakeLockManager = new WakeLockManager();
        this.audioManager = new AudioManager();
        this.initAudio();

        // 初始化 API 客户端和数据同步
        this.apiClient = new APIClient();
        this.dataSyncManager = new DataSyncManager(this.apiClient);

        // 缓存预设按钮
        this.presetBtns = document.querySelectorAll('.preset-btn');

        this.initElements();
        this.bindEvents();
        this.loadSettings();
        this.initThemeUI();
        this.initTabs();
        this.bindKeyboardShortcuts();
        this.updateProgress();
        this.loadReminderSettings();
        this.initBackgroundSupport();
        this.loadStats();
        this.checkReminders();
        this.reminderInterval = setInterval(() => this.checkReminders(), CONFIG.TIMING.REMINDER_CHECK_INTERVAL);

        // 尝试恢复训练进度
        this.tryRestoreProgress();
    }

    initAudio() {
        this.audioManager.loadSound('contract', CONFIG.SOUNDS.contract);
        this.audioManager.loadSound('relax', CONFIG.SOUNDS.relax);
    }

    initElements() {
        const ids = ['startBtn', 'pauseBtn', 'resetBtn', 'exportBtn', 'importBtn', 'currentSet',
                     'currentRep', 'timer', 'actionText', 'progressRing', 'animationCircle',
                     'repsPerSet', 'totalSets', 'contractTime', 'relaxTime', 'totalDays',
                     'totalSessions', 'streak', 'totalTime', 'presetBtns', 'soundToggle',
                     'syncToggle', 'syncStatus', 'reminderToggle', 'reminderTime',
                     'startBtnLabel', 'themeBtn', 'themeMenu', 'themeGrid'];

        this.elements = {};
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) this.elements[id] = el;
        });
    }

    bindEvents() {
        this.elements.startBtn?.addEventListener('click', () => this.start());
        this.elements.pauseBtn?.addEventListener('click', () => this.pause());
        this.elements.resetBtn?.addEventListener('click', () => this.reset());
        this.elements.exportBtn?.addEventListener('click', () => this.exportData());
        this.elements.importBtn?.addEventListener('click', () => this.importData());
        this.elements.themeBtn?.addEventListener('click', () => this.toggleThemeMenu());
        this.elements.soundToggle?.addEventListener('change', (e) => {
            this.audioManager.enabled = e.target.checked;
            this.saveSettings();
        });
        this.elements.syncToggle?.addEventListener('change', (e) => {
            this.handleSyncToggle(e.target.checked);
        });
        this.elements.reminderToggle?.addEventListener('change', (e) => {
            this.toggleReminder(e.target.checked);
        });

        ['repsPerSet', 'totalSets', 'contractTime', 'relaxTime'].forEach(setting => {
            this.elements[setting]?.addEventListener('change', () => this.saveSettings());
        });

        // 使用缓存的预设按钮
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => this.loadPreset(btn.dataset.preset));
        });

        // 点击主题菜单外部时关闭
        document.addEventListener('click', (e) => {
            if (this.elements.themeMenu && !this.elements.themeMenu.hidden &&
                !e.target.closest('.theme-menu-wrap')) {
                this.closeThemeMenu();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.saveProgress();
            this.cleanup();
        });

        // 初始同步状态检查
        this.updateSyncStatus(true);
    }

    loadSettings() {
        const settings = StorageManager.get(CONFIG.STORAGE_KEYS.settings, CONFIG.DEFAULT_SETTINGS);
        Object.keys(settings).forEach(key => {
            if (this.elements[key]) {
                this.elements[key].value = settings[key];
            }
        });
        this.restTime = parseInt(settings.restTime || CONFIG.DEFAULT_SETTINGS.restTime, 10);

        // 声音开关持久化
        const soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
        this.audioManager.enabled = soundEnabled;
        if (this.elements.soundToggle) {
            this.elements.soundToggle.checked = soundEnabled;
        }

        if (this.elements.syncToggle) {
            this.elements.syncToggle.checked = this.dataSyncManager.syncEnabled;
        }

        // 应用已保存的主题
        const themeValid = CONFIG.THEMES.some(t => t.id === settings.theme);
        this.applyTheme(themeValid ? settings.theme : CONFIG.DEFAULT_SETTINGS.theme, { silent: true });

        this.updatePresetHighlight();
        this.updateSyncStatus();
    }

    saveSettings() {
        const toInt = (value, fallback) => {
            const num = parseInt(value, 10);
            return Number.isNaN(num) ? fallback : num;
        };
        const settings = {
            repsPerSet: toInt(this.elements.repsPerSet?.value, CONFIG.DEFAULT_SETTINGS.repsPerSet),
            totalSets: toInt(this.elements.totalSets?.value, CONFIG.DEFAULT_SETTINGS.totalSets),
            contractTime: toInt(this.elements.contractTime?.value, CONFIG.DEFAULT_SETTINGS.contractTime),
            relaxTime: toInt(this.elements.relaxTime?.value, CONFIG.DEFAULT_SETTINGS.relaxTime),
            restTime: toInt(this.restTime, CONFIG.DEFAULT_SETTINGS.restTime),
            soundEnabled: this.elements.soundToggle?.checked ?? true,
            theme: this.currentTheme || CONFIG.DEFAULT_SETTINGS.theme
        };
        StorageManager.set(CONFIG.STORAGE_KEYS.settings, settings);
        this.audioManager.enabled = settings.soundEnabled;
        this.updatePresetHighlight();
    }

    /* ---------- 主题系统 ---------- */

    initThemeUI() {
        const menu = this.elements.themeMenu;
        const grid = this.elements.themeGrid;

        if (menu) {
            menu.innerHTML = CONFIG.THEMES.map(entry => this.themeOptionHTML(entry)).join('');
            menu.addEventListener('click', (e) => {
                const btn = e.target.closest('.theme-option');
                if (!btn) return;
                this.setTheme(btn.dataset.themeId);
                this.closeThemeMenu();
            });
        }
        if (grid) {
            grid.innerHTML = CONFIG.THEMES.map(entry => this.themeOptionHTML(entry)).join('');
            grid.addEventListener('click', (e) => {
                const btn = e.target.closest('.theme-option');
                if (!btn) return;
                this.setTheme(btn.dataset.themeId);
            });
        }

        // 跟随系统：系统配色变化时重新解析
        if (this.themeQuery && typeof this.themeQuery.addEventListener === 'function') {
            this.themeQuery.addEventListener('change', () => {
                if (this.currentTheme === 'auto') {
                    this.applyTheme('auto', { silent: true });
                }
            });
        }

        this.updateThemeSelections();
    }

    themeOptionHTML(entry) {
        const stops = entry.id === 'auto'
            ? `${entry.swatch[0]} 50%, ${entry.swatch[1]} 50%`
            : entry.swatch.join(', ');
        return `
            <button type="button" class="theme-option" data-theme-id="${entry.id}" aria-pressed="false">
                <span class="theme-swatch" style="background: linear-gradient(135deg, ${stops})"></span>
                <span class="theme-option-label">${HTMLEscaper.escape(entry.label)}</span>
                <svg class="theme-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>`;
    }

    applyTheme(pref, { silent = false } = {}) {
        const entry = CONFIG.THEMES.find(t => t.id === pref);
        if (!entry) return;

        this.currentTheme = pref;
        const resolved = pref === 'auto'
            ? (this.themeQuery && this.themeQuery.matches ? 'daylight' : 'neon')
            : pref;
        const resolvedEntry = CONFIG.THEMES.find(t => t.id === resolved) || entry;

        const root = document.documentElement;
        if (!silent) {
            root.classList.add('theme-transitioning');
            clearTimeout(this.themeTransitionTimer);
            this.themeTransitionTimer = setTimeout(() => root.classList.remove('theme-transitioning'), 400);
        }
        root.setAttribute('data-theme', resolved);

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', resolvedEntry.metaColor);

        this.updateThemeSelections();
    }

    setTheme(pref) {
        this.applyTheme(pref);
        this.saveSettings();
    }

    updateThemeSelections() {
        document.querySelectorAll('.theme-option').forEach(btn => {
            const active = btn.dataset.themeId === this.currentTheme;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', String(active));
        });
    }

    toggleThemeMenu() {
        const menu = this.elements.themeMenu;
        if (!menu) return;
        if (menu.hidden) {
            menu.hidden = false;
            requestAnimationFrame(() => menu.classList.add('open'));
            this.elements.themeBtn?.setAttribute('aria-expanded', 'true');
        } else {
            this.closeThemeMenu();
        }
    }

    closeThemeMenu() {
        const menu = this.elements.themeMenu;
        if (!menu || menu.hidden) return;
        menu.classList.remove('open');
        this.elements.themeBtn?.setAttribute('aria-expanded', 'false');
        setTimeout(() => { menu.hidden = true; }, 180);
    }

    cycleTheme() {
        const ids = CONFIG.THEMES.map(t => t.id);
        const index = ids.indexOf(this.currentTheme);
        const next = ids[(index + 1) % ids.length];
        this.setTheme(next);
        const entry = CONFIG.THEMES.find(t => t.id === next);
        Toast.show(`主题：${entry.label}`);
    }

    /* ---------- 选项卡 ---------- */

    initTabs() {
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabPanels = document.querySelectorAll('.tab-panel');
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    }

    switchTab(name) {
        this.tabBtns.forEach(btn => {
            const active = btn.dataset.tab === name;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', String(active));
            btn.tabIndex = active ? 0 : -1;
        });
        this.tabPanels.forEach(panel => {
            panel.hidden = panel.dataset.tabPanel !== name;
        });
    }

    /* ---------- 键盘快捷键 ---------- */

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const target = e.target;
            const isFormField = target instanceof Element &&
                target.matches('input, textarea, select, [contenteditable="true"]');
            if (isFormField) return;
            if (document.querySelector('.modal-overlay')) return;

            if (e.code === 'Space') {
                // 空格始终作为全局开始/暂停快捷键；按钮激活请使用 Enter
                e.preventDefault();
                if (this.isRunning) {
                    this.pause();
                } else {
                    this.start();
                }
            } else if (e.key === 'r' || e.key === 'R') {
                this.reset();
            } else if (e.key === 't' || e.key === 'T') {
                this.cycleTheme();
            } else if (e.key === 'Escape') {
                this.closeThemeMenu();
            }
        });
    }

    /* ---------- 预设高亮 ---------- */

    updatePresetHighlight() {
        if (!this.presetBtns || !this.presetBtns.length) return;
        const current = this.getSettings();
        this.presetBtns.forEach(btn => {
            const preset = CONFIG.PRESETS[btn.dataset.preset];
            const match = preset && ['repsPerSet', 'totalSets', 'contractTime', 'relaxTime', 'restTime']
                .every(key => parseInt(preset[key], 10) === parseInt(current[key], 10));
            btn.classList.toggle('active', !!match);
            btn.setAttribute('aria-pressed', String(!!match));
        });
    }

    loadReminderSettings() {
        const reminders = StorageManager.get(CONFIG.STORAGE_KEYS.reminders, { enabled: false, time: '09:00' });
        if (this.elements.reminderToggle) {
            this.elements.reminderToggle.checked = !!reminders.enabled;
        }
        if (this.elements.reminderTime && reminders.time) {
            this.elements.reminderTime.value = reminders.time;
        }
    }

    getSettings() {
        return {
            repsPerSet: parseInt(this.elements.repsPerSet?.value || 10),
            totalSets: parseInt(this.elements.totalSets?.value || 3),
            contractTime: parseInt(this.elements.contractTime?.value || 5),
            relaxTime: parseInt(this.elements.relaxTime?.value || 5),
            restTime: this.restTime || CONFIG.DEFAULT_SETTINGS.restTime
        };
    }

    loadPreset(preset) {
        const settings = CONFIG.PRESETS[preset];
        if (!settings) return;

        Object.keys(settings).forEach(key => {
            if (this.elements[key]) {
                this.elements[key].value = settings[key];
            }
        });
        this.restTime = settings.restTime || CONFIG.DEFAULT_SETTINGS.restTime;
        this.saveSettings();
        Modal.show('预设已加载', `已应用${preset === 'beginner' ? '初级' : preset === 'intermediate' ? '中级' : '高级'}训练计划`);
    }

    async start() {
        if (this.isPaused) {
            this.resume();
            return;
        }

        this.clearCompletionPrompt();
        await this.wakeLockManager.request();

        this.isRunning = true;
        this.currentPhase = 'contract';
        this.timeLeft = this.getSettings().contractTime;

        this.updateActionText('夹紧', 'contract');
        this.audioManager.play('contract');
        VibrationManager.vibrate(200);

        this.updateUI();
        this.startTimer();
        this.updateButtons();
    }

    pause() {
        this.isPaused = true;
        this.isRunning = false;
        clearInterval(this.timer);
        this.updateButtons();
        this.elements.timer.textContent = '已暂停';
    }

    resume() {
        this.isPaused = false;
        this.isRunning = true;
        this.clearCompletionPrompt();
        this.startTimer();
        this.updateButtons();
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentSet = 1;
        this.currentRep = 1;
        this.currentPhase = 'ready';
        this.timeLeft = 0;

        clearInterval(this.timer);
        this.wakeLockManager.release();
        this.clearCompletionPrompt();

        this.updateUI();
        this.updateButtons();
        this.updateProgress();

        this.elements.timer.textContent = '准备开始';
        this.updateActionText('准备开始', '');
        this.elements.animationCircle.className = 'animation-circle';
    }

    nextPhase() {
        const settings = this.getSettings();

        if (this.currentPhase === 'contract') {
            this.currentPhase = 'relax';
            this.timeLeft = settings.relaxTime;
            this.updateActionText('放松', 'relax');
            this.audioManager.play('relax');
            VibrationManager.vibrate(100);
        } else if (this.currentPhase === 'relax') {
            this.currentRep++;

            if (this.currentRep > settings.repsPerSet) {
                this.currentSet++;
                this.currentRep = 1;

                if (this.currentSet > settings.totalSets) {
                    this.complete();
                    return;
                } else {
                    this.currentPhase = 'rest';
                    this.timeLeft = settings.restTime;
                    this.updateActionText('休息', '');
                    this.elements.timer.textContent = `组间休息 ${this.timeLeft}秒`;
                }
            } else {
                this.currentPhase = 'contract';
                this.timeLeft = settings.contractTime;
                this.updateActionText('夹紧', 'contract');
                this.audioManager.play('contract');
                VibrationManager.vibrate(200);
            }
        } else if (this.currentPhase === 'rest') {
            this.currentPhase = 'contract';
            this.timeLeft = settings.contractTime;
            this.updateActionText('夹紧', 'contract');
            this.audioManager.play('contract');
            VibrationManager.vibrate(200);
        }

        this.updateUI();
        this.updateProgress();

        // 重新启动计时器以继续下一阶段
        this.startTimer();
    }

    updateActionText(text, className) {
        this.elements.actionText.textContent = text;
        this.elements.actionText.className = `action-text ${className}`;
        this.elements.animationCircle.className = `animation-circle ${className}`;
    }

    async complete() {
        this.isRunning = false;
        clearInterval(this.timer);
        await this.wakeLockManager.release();

        this.elements.timer.textContent = '训练完成！';
        this.updateActionText('完成', '');
        this.updateButtons();
        this.updateProgress();

        this.recordSession();
        VibrationManager.vibrate([200, 100, 200]);

        this.clearCompletionPrompt();
        this.completeTimeout = setTimeout(async () => {
            await Modal.show('训练完成', '恭喜！今日训练完成！', [
                { text: '太棒了', primary: true }
            ]);
            this.completeTimeout = null;
        }, 500);
    }

    updateUI() {
        this.elements.currentSet.textContent = this.currentSet;
        this.elements.currentRep.textContent = this.currentRep;
    }

    updateButtons() {
        const startLabel = this.elements.startBtnLabel || this.elements.startBtn;
        if (this.isRunning) {
            this.elements.startBtn.disabled = true;
            this.elements.pauseBtn.disabled = false;
            if (startLabel) startLabel.textContent = '进行中';
        } else if (this.isPaused) {
            this.elements.startBtn.disabled = false;
            if (startLabel) startLabel.textContent = '继续';
            this.elements.pauseBtn.disabled = true;
        } else {
            this.elements.startBtn.disabled = false;
            if (startLabel) startLabel.textContent = '开始训练';
            this.elements.pauseBtn.disabled = true;
        }
    }

    updateProgress() {
        const ring = this.elements.progressRing;
        if (!ring) return;

        const settings = this.getSettings();
        const totalReps = settings.totalSets * settings.repsPerSet;
        const completedReps = (this.currentSet - 1) * settings.repsPerSet + (this.currentRep - 1);
        const progress = Math.min((completedReps / totalReps) * 100, 100);

        const radius = parseFloat(ring.getAttribute('r')) || 130;
        const circumference = 2 * Math.PI * radius;
        ring.style.strokeDasharray = `${circumference}`;
        ring.style.strokeDashoffset = `${circumference * (1 - progress / 100)}`;
    }

    handleSyncToggle(enabled) {
        this.dataSyncManager.toggleSync(enabled);
        this.updateSyncStatus(true);
        Toast.show(enabled ? '云端同步已开启' : '云端同步已关闭');
    }

    initBackgroundSupport() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                this.updateTitle();
            } else if (!document.hidden) {
                document.title = '凯格尔运动训练器';
            }
        });
    }

    updateTitle() {
        if (document.hidden && this.isRunning) {
            const phase = this.currentPhase === 'contract' ? '夹紧' :
                         this.currentPhase === 'relax' ? '放松' : '休息';
            document.title = `${phase} ${this.timeLeft}s - 第${this.currentSet}组${this.currentRep}次`;
        }
    }

    startTimer() {
        clearInterval(this.timer);

        // 使用基于时间戳的计时，避免 setInterval 累积误差
        this.timerStartTime = Date.now();
        this.timerDuration = this.timeLeft * 1000;

        const tick = () => {
            const elapsed = Date.now() - this.timerStartTime;
            const remaining = Math.ceil((this.timerDuration - elapsed) / 1000);

            if (remaining !== this.timeLeft) {
                this.timeLeft = Math.max(remaining, 0);

                // 倒计时最后3秒警告
                if (this.timeLeft <= CONFIG.TIMING.COUNTDOWN_WARNING && this.timeLeft > 0) {
                    this.elements.timer.classList.add('countdown-warning');
                    this.elements.timer.textContent = `${this.timeLeft}秒`;
                } else {
                    this.elements.timer.classList.remove('countdown-warning');
                    this.elements.timer.textContent = `${this.timeLeft}秒`;
                }

                this.updateTitle();
            }

            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.elements.timer.classList.remove('countdown-warning');
                this.nextPhase();
            }
        };

        // 立即执行一次
        tick();
        this.timer = setInterval(tick, 100); // 更频繁检查以提高精度
    }

    async recordSession() {
        const settings = this.getSettings();
        const today = DateUtils.formatDate(new Date());
        const activeTime = settings.totalSets * settings.repsPerSet *
                        (settings.contractTime + settings.relaxTime);
        const restTime = Math.max(settings.totalSets - 1, 0) * settings.restTime;
        const duration = (activeTime + restTime) / 60;

        const sessionData = {
            date: today,
            sets: settings.totalSets,
            reps: settings.repsPerSet,
            duration: Math.round(duration * 10) / 10,
            contract_time: settings.contractTime,
            relax_time: settings.relaxTime
        };

        // 使用数据同步管理器保存（支持云端同步）
        await this.dataSyncManager.saveSession(sessionData);
        this.updateStats();
    }

    loadStats() {
        this.updateStats();
    }

    async updateStats() {
        // 尝试从云端加载统计数据
        const cloudStats = await this.dataSyncManager.loadStats();

        if (cloudStats) {
            // 使用云端数据
            this.elements.totalDays.textContent = cloudStats.totalDays;
            this.elements.totalSessions.textContent = cloudStats.totalSessions;
            this.elements.totalTime.textContent = cloudStats.totalTime;
            this.elements.streak.textContent = cloudStats.streak;
        } else {
            // 降级到本地计算
            const records = StorageManager.get(CONFIG.STORAGE_KEYS.records, []);
            const uniqueDays = [...new Set(records.map(r => r.date))];

            this.elements.totalDays.textContent = uniqueDays.length;
            this.elements.totalSessions.textContent = records.length;

            const totalTime = records.reduce((sum, r) => sum + r.duration, 0);
            this.elements.totalTime.textContent = Math.round(totalTime);

            this.elements.streak.textContent = this.calculateStreak(uniqueDays);
        }
    }

    calculateStreak(days) {
        if (days.length === 0) return 0;

        const sortedDays = days.map(d => new Date(d)).sort((a, b) => b - a);
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (let day of sortedDays) {
            day.setHours(0, 0, 0, 0);
            const diffDays = DateUtils.getDaysDiff(day, currentDate);

            if (diffDays === streak) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    async updateSyncStatus(forceCheck = false) {
        if (!this.elements.syncStatus) return;

        if (!this.dataSyncManager.syncEnabled) {
            this.elements.syncStatus.textContent = '已关闭';
            this.elements.syncStatus.classList.remove('online');
            return;
        }

        this.elements.syncStatus.textContent = '检测中...';
        const online = forceCheck ? await this.dataSyncManager.checkConnection() : this.dataSyncManager.isOnline;
        this.elements.syncStatus.textContent = online ? '在线' : '离线';
        this.elements.syncStatus.classList.toggle('online', online);
    }

    async exportData() {
        const result = await Modal.show('导出数据', '选择导出格式', [
            { text: 'JSON', primary: false },
            { text: 'CSV', primary: true },
            { text: '取消', primary: false }
        ]);

        if (result === 0) {
            const data = {
                records: StorageManager.get(CONFIG.STORAGE_KEYS.records, []),
                settings: StorageManager.get(CONFIG.STORAGE_KEYS.settings, {}),
                exportDate: new Date().toISOString()
            };
            const content = DataExporter.toJSON(data);
            DataExporter.download(content, `kegel-data-${DateUtils.formatDate(new Date())}.json`);
        } else if (result === 1) {
            const records = StorageManager.get(CONFIG.STORAGE_KEYS.records, []);
            const content = DataExporter.toCSV(records);
            DataExporter.download(content, `kegel-data-${DateUtils.formatDate(new Date())}.csv`, 'text/csv');
        }
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // 验证数据结构
                if (!this.validateImportData(data)) {
                    Modal.show('错误', '导入失败：数据格式不正确或已损坏');
                    return;
                }

                const result = await Modal.show('导入数据', '确定要导入数据吗？这将覆盖现有数据。', [
                    { text: '确定', primary: true },
                    { text: '取消', primary: false }
                ]);

                if (result === 0) {
                    if (data.records) StorageManager.set(CONFIG.STORAGE_KEYS.records, data.records);
                    if (data.settings) {
                        const validatedSettings = this.validateSettings(data.settings);
                        StorageManager.set(CONFIG.STORAGE_KEYS.settings, validatedSettings);
                    }
                    this.loadSettings();
                    this.updateStats();
                    Modal.show('成功', '数据导入成功！');
                }
            } catch (error) {
                Modal.show('错误', '导入失败：文件格式不正确');
            }
        };
        input.click();
    }

    // 验证导入数据结构
    validateImportData(data) {
        if (!data || typeof data !== 'object') return false;

        // 验证 records 数组
        if (data.records) {
            if (!Array.isArray(data.records)) return false;
            for (const record of data.records) {
                if (!record.date || typeof record.date !== 'string') return false;
                if (typeof record.duration !== 'number' || record.duration < 0) return false;
            }
        }

        // 验证 settings 对象
        if (data.settings && typeof data.settings !== 'object') return false;

        return true;
    }

    toggleReminder(enabled) {
        if (enabled) {
            const time = this.elements.reminderTime?.value || '09:00';
            this.setReminder(time);
        } else {
            this.clearReminder();
        }
    }

    setReminder(time) {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    StorageManager.set(CONFIG.STORAGE_KEYS.reminders, {
                        enabled: true,
                        time,
                        lastNotifiedDate: null,
                        lastNotifiedAt: null
                    });
                    Modal.show('提醒已设置', `每天 ${time} 将提醒您进行训练`);
                }
            });
        }
    }

    clearReminder() {
        StorageManager.set(CONFIG.STORAGE_KEYS.reminders, {
            enabled: false,
            lastNotifiedDate: null,
            lastNotifiedAt: null
        });
    }

    checkReminders() {
        const reminders = StorageManager.get(CONFIG.STORAGE_KEYS.reminders, {});
        if (!reminders.enabled || !reminders.time || !('Notification' in window)) return;

        if (Notification.permission !== 'granted') return;

        const now = new Date();
        const [hours, minutes] = reminders.time.split(':').map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return;

        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0, 0);

        const diff = now - reminderTime;
        const sameMinute = diff >= 0 && diff < 60000;
        const today = DateUtils.formatDate(now);
        const lastNotifiedAt = reminders.lastNotifiedAt ? new Date(reminders.lastNotifiedAt) : null;
        const notifiedRecently = lastNotifiedAt && (now - lastNotifiedAt) < 60000;
        const alreadyNotified = reminders.lastNotifiedDate === today || notifiedRecently;

        if (sameMinute && !alreadyNotified) {
            new Notification('凯格尔训练提醒', {
                body: '该进行今天的训练了！',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill=\"%234CAF50\"/></svg>'
            });
            StorageManager.set(CONFIG.STORAGE_KEYS.reminders, {
                ...reminders,
                lastNotifiedDate: today,
                lastNotifiedAt: now.toISOString()
            });
        }
    }

    cleanup() {
        clearInterval(this.timer);
        clearInterval(this.reminderInterval);
        this.wakeLockManager.release();
    }

    clearCompletionPrompt() {
        if (this.completeTimeout) {
            clearTimeout(this.completeTimeout);
            this.completeTimeout = null;
        }
    }

    // 保存训练进度
    saveProgress() {
        if (!this.isRunning && !this.isPaused) {
            StorageManager.remove(CONFIG.STORAGE_KEYS.progress);
            return;
        }

        const progress = {
            currentSet: this.currentSet,
            currentRep: this.currentRep,
            currentPhase: this.currentPhase,
            timeLeft: this.timeLeft,
            isPaused: this.isPaused,
            savedAt: Date.now()
        };
        StorageManager.set(CONFIG.STORAGE_KEYS.progress, progress);
    }

    // 尝试恢复训练进度
    async tryRestoreProgress() {
        const progress = StorageManager.get(CONFIG.STORAGE_KEYS.progress);
        if (!progress) return;

        // 检查进度是否过期（超过30分钟）
        const elapsed = Date.now() - progress.savedAt;
        if (elapsed > 30 * 60 * 1000) {
            StorageManager.remove(CONFIG.STORAGE_KEYS.progress);
            return;
        }

        const result = await Modal.show(
            '恢复训练',
            `检测到未完成的训练（第${progress.currentSet}组第${progress.currentRep}次），是否继续？`,
            [
                { text: '继续训练', primary: true },
                { text: '重新开始', primary: false }
            ]
        );

        if (result === 0) {
            // 恢复进度
            this.currentSet = progress.currentSet;
            this.currentRep = progress.currentRep;
            this.currentPhase = progress.currentPhase;
            this.timeLeft = progress.timeLeft;
            this.isPaused = true;
            this.isRunning = false;

            this.updateUI();
            this.updateProgress();
            this.updateButtons();
            this.elements.timer.textContent = '已暂停';

            const phaseText = progress.currentPhase === 'contract' ? '夹紧' :
                             progress.currentPhase === 'relax' ? '放松' : '休息';
            this.updateActionText(phaseText, progress.currentPhase === 'rest' ? '' : progress.currentPhase);
        }

        StorageManager.remove(CONFIG.STORAGE_KEYS.progress);
    }

    // 验证设置值
    validateSettings(settings) {
        const validated = {};
        for (const [key, value] of Object.entries(settings)) {
            if (key === 'theme') {
                validated[key] = CONFIG.THEMES.some(t => t.id === value)
                    ? value
                    : CONFIG.DEFAULT_SETTINGS.theme;
                continue;
            }
            const range = CONFIG.VALIDATION[key];
            if (range) {
                const num = parseInt(value, 10);
                validated[key] = Number.isNaN(num) ? CONFIG.DEFAULT_SETTINGS[key] :
                    Math.max(range.min, Math.min(range.max, num));
            } else {
                validated[key] = value;
            }
        }
        return validated;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new KegelTrainer();
});
