// 配置常量
const CONFIG = {
    // 默认训练设置
    DEFAULT_SETTINGS: {
        repsPerSet: 10,
        totalSets: 3,
        contractTime: 5,
        relaxTime: 5,
        restTime: 10,
        theme: 'neon'
    },

    // 界面主题（swatch 用于选项预览色板，metaColor 用于浏览器主题色）
    THEMES: [
        { id: 'neon',     label: '暗夜霓虹', dark: true,  metaColor: '#0f172a', swatch: ['#10b981', '#06b6d4', '#6366f1'] },
        { id: 'daylight', label: '清新日光', dark: false, metaColor: '#eef2f7', swatch: ['#059669', '#0ea5e9', '#6366f1'] },
        { id: 'sakura',   label: '樱花粉',   dark: false, metaColor: '#fdf2f8', swatch: ['#e11d48', '#f472b6', '#a855f7'] },
        { id: 'ocean',    label: '海洋蓝',   dark: true,  metaColor: '#082f49', swatch: ['#2dd4bf', '#22d3ee', '#3b82f6'] },
        { id: 'mono',     label: '极简黑白', dark: true,  metaColor: '#0a0a0a', swatch: ['#fafafa', '#a3a3a3', '#525252'] },
        { id: 'auto',     label: '跟随系统', dark: null,  metaColor: '#0f172a', swatch: ['#0f172a', '#f8fafc'] }
    ],

    // 默认主题
    DEFAULT_THEME: 'neon',

    // 训练预设
    PRESETS: {
        beginner: { repsPerSet: 5, totalSets: 2, contractTime: 3, relaxTime: 3, restTime: 10 },
        intermediate: { repsPerSet: 10, totalSets: 3, contractTime: 5, relaxTime: 5, restTime: 10 },
        advanced: { repsPerSet: 15, totalSets: 4, contractTime: 8, relaxTime: 5, restTime: 15 }
    },

    // 输入验证范围
    VALIDATION: {
        repsPerSet: { min: 5, max: 20 },
        totalSets: { min: 1, max: 5 },
        contractTime: { min: 3, max: 10 },
        relaxTime: { min: 3, max: 10 },
        restTime: { min: 5, max: 30 }
    },

    // 存储键名
    STORAGE_KEYS: {
        settings: 'kegelSettings',
        records: 'kegelRecords',
        reminders: 'kegelReminders',
        progress: 'kegelProgress',
        syncEnabled: 'sync_enabled',
        userId: 'kegel_user_id'
    },

    // 时间常量（毫秒）
    TIMING: {
        REMINDER_CHECK_INTERVAL: 30000,    // 提醒检查间隔
        REMINDER_WINDOW: 60000,            // 提醒时间窗口
        TOAST_DURATION: 2500,              // Toast显示时长
        MODAL_ANIMATION: 300,              // 模态框动画时长
        CONNECTION_CACHE_TTL: 30000,       // 连接状态缓存时间
        COUNTDOWN_WARNING: 3               // 倒计时警告秒数
    },

    // 振动模式
    VIBRATION: {
        contract: 200,
        relax: 100,
        complete: [200, 100, 200]
    },

    // 音效URL
    SOUNDS: {
        contract: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6OyrWBQLSKHf8sFuIwUugdDx2Ik2CBdju+zooVARC0yl4fG5ZRwFN43V7859KQUnfszw2o87ChJcsejtq1gVC0ih3/LBbiMFL4HQ8diJNggXY7vs6KFQEQtMpeHxuWUcBTeN1e/OfSkFJ37M8NqPOwsSXLHo7atYFQtIod/ywW4jBS+B0PHYiTYIF2O77OihUBELTKXh8bllHAU3jdXvzn0pBSd+zPDajzsKElyx6O2rWBULSKHf8sFuIwUvgdDx2Ik2CBdju+zooVARC0yl4fG5ZRwFN43V7859KQUnfszw2o87ChJcsejtq1gVC0ih3/LBbiMFL4HQ8diJNggXY7vs6KFQEQtMpeHxuWUcBTeN1e/OfSkFJ37M8NqPOwsSXLHo7atYFQtIod/ywW4jBS+B0PHYiTYIF2O77OihUBELTKXh8bllHAU3jdXvzn0pBSd+zPDajzsKElyx6O2rWBULSKHf8sFuIwUvgdDx2Ik2CBdju+zooVARC0yl4fG5ZRwFN43V7859KQUnfszw2o87ChJcsejtq1gVC0ih3/LBbiMFL4HQ8diJNggXY7vs6KFQEQtMpeHxuWUcBTeN1e/OfSkFJ37M8NqPOwsSXLHo7atYFQtIod/ywW4jBS+B0PHYiTYIF2O77OihUBELTKXh8bllHAU3jdXvzn0pBSd+zPDajzsKElyx6O2rWBULSKHf8sFuIwUvgdDx2Ik2CBdju+zooVARC0yl4fG5ZRwFN43V7859KQUnfszw2o87ChJcsejtq1gVC0ih3/LBbiMFL4HQ8diJNggXY7vs6KFQEQtMpeHxuWUcBTeN1e/OfSkFJ37M8NqPOwsSXLHo7atYFQtIod/ywW4jBS+B0PHYiTYIF2O77OihUBELTKXh8bllHAU3jdXvzn0pBSd+zPDajzsKElyx6O2rWBULSKHf8sFuIwUvgdDx2Ik2CBdju+zooVARC0yl4fG5ZRwFN43V7859KQUnfszw2o87ChJcsejtq1gVC0ih3/LBbiMFL4HQ8diJNggXY7vs6KFQEQtMpeHxuWUcBTeN1e/OfSkFJ37M8NqPOwsSXLHo7atYFQtIod/ywW4jBS+B0PHYiTYIF2O77OihUBELTKXh8bllHAU3jdXvzn0pBSd+zPDajzsKElyx6O2rWBULSKHf8sFuIwUvgdDx',
        relax: 'data:audio/wav;base64,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'
    }
};

