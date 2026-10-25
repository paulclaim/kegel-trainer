// API 客户端模块 - 用于前端调用后端 API
class APIClient {
    constructor(baseURL) {
        // 自动检测环境
        if (!baseURL) {
            const hostname = window.location.hostname;

            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                // 本地开发环境
                this.baseURL = 'http://localhost:3000/api';
            } else if (hostname.includes('github.io')) {
                // GitHub Pages - 使用 Render 部署的 API
                // 部署后请将此地址替换为你的 Render API 地址
                this.baseURL = 'https://kegel-trainer-api.onrender.com/api';
            } else if (hostname.includes('vercel.app') || hostname.includes('netlify.app')) {
                // Vercel/Netlify - 使用相对路径
                this.baseURL = '/api';
            } else {
                // 其他生产环境 - 尝试相对路径
                this.baseURL = '/api';
            }
        } else {
            this.baseURL = baseURL;
        }
        this.userId = this.getUserId();
        console.log('API Base URL:', this.baseURL);
    }

    // 获取或生成用户 ID
    getUserId() {
        let userId = localStorage.getItem('kegel_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('kegel_user_id', userId);
        }
        return userId;
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            };
            // 超时中断，避免弱网下统计渲染被长时间挂起
            if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
                config.signal = AbortSignal.timeout(10000);
            }

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || '请求失败');
            }

            return data;
        } catch (error) {
            console.error('API 请求失败:', error);
            throw error;
        }
    }

    // 获取训练记录
    async getSessions(limit = 100, offset = 0) {
        return this.request(`/sessions?user_id=${this.userId}&limit=${limit}&offset=${offset}`);
    }

    // 保存训练记录
    async saveSession(sessionData) {
        return this.request('/sessions', {
            method: 'POST',
            body: JSON.stringify({
                ...sessionData,
                user_id: this.userId
            })
        });
    }

    // 获取统计数据
    async getStats() {
        return this.request(`/stats?user_id=${this.userId}`);
    }

    // 删除训练记录
    async deleteSession(sessionId) {
        return this.request(`/sessions/${sessionId}?user_id=${this.userId}`, {
            method: 'DELETE'
        });
    }

    // 检查 API 连接状态
    async checkConnection() {
        try {
            const base = this.baseURL.startsWith('http')
                ? new URL(this.baseURL)
                : new URL(window.location.origin + this.baseURL);
            const healthUrl = new URL('/health', base);
            const options = {};
            if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
                options.signal = AbortSignal.timeout(5000);
            }
            const response = await fetch(healthUrl.toString(), options);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// 数据同步管理器 - 支持离线和在线模式
class DataSyncManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.isOnline = false;
        this.syncEnabled = StorageManager.get(CONFIG.STORAGE_KEYS.syncEnabled, true);
        this.offlineNotified = false;
        this.syncErrorNotified = false;

        // 连接状态缓存
        this.connectionCache = {
            status: null,
            timestamp: 0
        };

        // 网络恢复或页面回到前台时，补传待同步记录
        window.addEventListener('online', () => {
            this.forceCheckConnection().then(online => {
                if (online) return this.flushPendingSyncs();
            });
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.flushPendingSyncs();
        });

        // 启动顺序：先与云端合并（完成旧数据迁移配对），再补传待同步记录
        this.getRecords()
            .then(() => this.flushPendingSyncs())
            .catch(error => console.warn('启动同步失败:', error.message));
    }

    // 检查连接状态（带缓存）
    async checkConnection() {
        if (!this.syncEnabled) {
            this.isOnline = false;
            return this.isOnline;
        }

        // 检查缓存是否有效
        const now = Date.now();
        const cacheTTL = CONFIG.TIMING?.CONNECTION_CACHE_TTL || 30000;
        if (this.connectionCache.status !== null && (now - this.connectionCache.timestamp) < cacheTTL) {
            this.isOnline = this.connectionCache.status;
            return this.isOnline;
        }

        this.isOnline = await this.apiClient.checkConnection();

        // 更新缓存
        this.connectionCache = {
            status: this.isOnline,
            timestamp: now
        };

        if (this.isOnline) {
            this.offlineNotified = false;
            this.syncErrorNotified = false;
        } else if (!this.offlineNotified) {
            Toast.show('当前离线，将使用本地数据');
            this.offlineNotified = true;
        }

        return this.isOnline;
    }

    // 强制刷新连接状态
    async forceCheckConnection() {
        this.connectionCache = { status: null, timestamp: 0 };
        return this.checkConnection();
    }

    // 保存训练记录：先落本地（未同步状态），再尝试立即上云，失败则留在待同步队列
    async saveSession(sessionData) {
        const record = {
            ...sessionData,
            id: sessionData.id || UUID.generate(),
            synced: false
        };

        const records = StorageManager.get(CONFIG.STORAGE_KEYS.records, []);
        records.push(record);
        StorageManager.set(CONFIG.STORAGE_KEYS.records, records);

        await this.flushPendingSyncs();
        return record;
    }

    // 补传所有未同步记录（成功一条标记一条，失败即停以保证顺序）。
    // 跳过还没有 id 的旧记录：它们需要先经 getRecords 与云端配对迁移，避免裸传产生重复
    async flushPendingSyncs() {
        if (!this.syncEnabled) return 0;
        const pending = StorageManager.get(CONFIG.STORAGE_KEYS.records, [])
            .filter(record => !record.synced && record.id);
        if (pending.length === 0) return 0;

        if (!await this.checkConnection()) return 0;

        let syncedCount = 0;
        for (const record of pending) {
            try {
                await this.apiClient.saveSession(this.toCloudRecord(record));
                this.markRecordSynced(record.id);
                syncedCount++;
            } catch (error) {
                console.warn('云端同步失败，记录已保留在待同步队列:', error.message);
                if (!this.syncErrorNotified) {
                    Toast.show('云端同步失败，将在联网后自动重试');
                    this.syncErrorNotified = true;
                }
                break;
            }
        }
        return syncedCount;
    }

    // 获取本地与云端合并后的记录（统计与历史展示的唯一数据源）。
    // 并发调用共享同一次请求，避免重复拉取与交叉写入
    getRecords() {
        if (!this._loadingRecords) {
            this._loadingRecords = this._loadRecords()
                .finally(() => { this._loadingRecords = null; });
        }
        return this._loadingRecords;
    }

    async _loadRecords() {
        let cloudRows = [];
        let cloudLoaded = false;
        if (this.syncEnabled && await this.checkConnection()) {
            try {
                const response = await this.apiClient.getSessions(500);
                if (response.success && Array.isArray(response.data)) {
                    cloudRows = response.data;
                    cloudLoaded = true;
                }
            } catch (error) {
                console.warn('从云端加载记录失败，使用本地数据:', error.message);
            }
        }

        // fetch 之后再读本地存储：读取、合并、写回全部同步执行，期间不会有新的本地写入被覆盖
        const localRecords = StorageManager.get(CONFIG.STORAGE_KEYS.records, []);
        const merged = cloudLoaded
            ? this.mergeRecords(localRecords, cloudRows)
            : localRecords;

        StorageManager.set(CONFIG.STORAGE_KEYS.records, merged);
        return merged;
    }

    // 合并规则：
    // 1. 有 id（client UUID）的记录按 id 幂等合并，本地记录保留未同步标记；
    // 2. 升级前的旧数据（本地无 id / 云端无 client_id）按“日期+参数+时长”多重集配对，
    //    仅在首次迁移时执行，避免同日多次训练被误合并或旧云端行被重复导入。
    mergeRecords(localRecords, cloudRows) {
        const legacyMigrated = StorageManager.get(CONFIG.STORAGE_KEYS.legacyMigrated, false);

        const localById = new Map();
        const legacyLocal = [];
        for (const record of localRecords) {
            if (record.id) localById.set(record.id, { ...record });
            else legacyLocal.push({ ...record });
        }

        const cloudById = new Map();
        const legacyCloudByKey = new Map();
        for (const row of cloudRows) {
            if (row.client_id) {
                cloudById.set(row.client_id, row);
            } else if (!legacyMigrated) {
                const key = this.legacyKey(row);
                if (!legacyCloudByKey.has(key)) legacyCloudByKey.set(key, []);
                legacyCloudByKey.get(key).push(row);
            }
        }

        // 旧本地记录：能配上旧云端行的视为已同步，配不上的保持未同步等待补传
        for (const record of legacyLocal) {
            const pool = legacyCloudByKey.get(this.legacyKey(record));
            if (pool && pool.length > 0) {
                pool.pop();
                record.id = UUID.generate();
                record.synced = true;
            } else {
                record.id = UUID.generate();
                record.synced = false;
            }
            localById.set(record.id, record);
        }

        // 仅存在于云端的记录导入本地
        for (const [id, row] of cloudById) {
            if (!localById.has(id)) {
                localById.set(id, this.recordFromCloudRow(row));
            }
        }

        if (!legacyMigrated) {
            for (const pool of legacyCloudByKey.values()) {
                for (const row of pool) {
                    const record = this.recordFromCloudRow(row);
                    record.id = UUID.generate(); // 云端旧行没有 client_id，导入后视为本地已同步记录
                    localById.set(record.id, record);
                }
            }
            StorageManager.set(CONFIG.STORAGE_KEYS.legacyMigrated, true);
        }

        const merged = [...localById.values()].sort((a, b) =>
            a.date < b.date ? -1 : a.date > b.date ? 1 : 0
        );
        return merged;
    }

    legacyKey(record) {
        return `${this.normalizeDate(record.date)}|${Number(record.sets)}|${Number(record.reps)}|${Number(record.duration)}`;
    }

    recordFromCloudRow(row) {
        return {
            id: row.client_id,
            date: this.normalizeDate(row.date),
            sets: Number(row.sets),
            reps: Number(row.reps),
            duration: Number(row.duration),
            contract_time: Number(row.contract_time),
            relax_time: Number(row.relax_time),
            synced: true
        };
    }

    normalizeDate(date) {
        if (typeof date === 'string') return date.slice(0, 10);
        return DateUtils.formatDate(new Date(date));
    }

    toCloudRecord(record) {
        return {
            client_id: record.id,
            date: record.date,
            sets: record.sets,
            reps: record.reps,
            duration: record.duration,
            contract_time: record.contract_time,
            relax_time: record.relax_time
        };
    }

    // 导入外部记录：与现有记录（含云端）按内容多重集去重后并入，避免同步后产生重复
    async importRecords(importedRecords) {
        if (!Array.isArray(importedRecords)) return 0;

        const existing = await this.getRecords();
        const available = new Map();
        for (const record of existing) {
            const key = this.legacyKey(record);
            if (!available.has(key)) available.set(key, []);
            available.get(key).push(record);
        }

        let added = 0;
        for (const raw of importedRecords) {
            const record = {
                date: this.normalizeDate(raw.date),
                sets: Number(raw.sets) || 0,
                reps: Number(raw.reps) || 0,
                duration: Number(raw.duration) || 0,
                contract_time: Number(raw.contract_time) || 0,
                relax_time: Number(raw.relax_time) || 0
            };
            const pool = available.get(this.legacyKey(record));
            if (pool && pool.length > 0) {
                pool.pop(); // 已存在同内容记录，跳过
                continue;
            }
            existing.push({ ...record, id: UUID.generate(), synced: false });
            added++;
        }

        StorageManager.set(CONFIG.STORAGE_KEYS.records, existing);
        this.flushPendingSyncs();
        return added;
    }

    markRecordSynced(recordId) {
        const records = StorageManager.get(CONFIG.STORAGE_KEYS.records, []);
        const target = records.find(record => record.id === recordId);
        if (target) {
            target.synced = true;
            StorageManager.set(CONFIG.STORAGE_KEYS.records, records);
        }
    }

    // 切换同步状态
    toggleSync(enabled) {
        this.syncEnabled = enabled;
        StorageManager.set(CONFIG.STORAGE_KEYS.syncEnabled, enabled);
        // 重置连接缓存
        this.connectionCache = { status: null, timestamp: 0 };
        if (enabled) this.flushPendingSyncs();
        return this.syncEnabled;
    }
}
