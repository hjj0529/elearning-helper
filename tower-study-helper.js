// ==UserScript==
// @name         铁塔 e 学自动学习助手
// @namespace    tower-study-helper
// @version      1.7.15
// @description  自动识别课程ID、过滤已完成和跳过课程、自动播放切换章节；支持分页、新标签页、面板拖动缩放及最后一节弹窗自动确认；修复“直接完结”课程不跳转问题，播放页完结后关闭并回列表刷新再开新课；面板显示学分/学时/章节，移除系统异常跳过名单，默认跳过末节考试课程，PPT章节加载失败自动刷新；增强播放页与列表页信号可靠性；v1.7.3 适配新版(/new/student)接口探查与 ID 识别；v1.7.4 课程列表面板不再逐条显示已完成的课程，减少冗余；v1.7.5 移除面板"捕获接口"文本显示（静默写入 localStorage 供调试）；v1.7.6 调试数据额外写入屏幕外不可见 span(#tsh-debug)；v1.7.7 调试数据额外写入页面标题(TSHDBG:前缀)，便于外部读取定位新版接口与ID字段格式；v1.7.8 移除标题调试，新增倍速播放开关与档位（默认关闭，仅对 HTML5 视频生效）；v1.7.9 恢复轻量标题调试(TSH:前缀，仅标签标题非面板)用于外部监控，倍速被平台重置时自动恢复并计数以观测验证机制；v1.7.10 修正面板标题版本号与运行时 guard 保持一致；v1.7.11 播放页标题心跳改为 5 秒节流（关键字段变化仍即时刷新），并修复详情页进度接口冲刷 page 字段，便于外部 claim/截图标签页；v1.7.12 修复倍速档位切回 1x 不生效（播放器停留在原倍速）及关闭倍速开关不恢复常速的问题，新增首次开启倍速时平台提示弹窗（学习时长按实际学习时间统计，不受倍速切换影响）的自动确认；v1.7.13 修复播放中标签页无法被外部 claim/截图的问题（详情页标题改由播放心跳独占，接口日志不再每秒级改写标题；心跳节流 5s→15s，倍速/状态变化仍即时刷新）；v1.7.14 标题调试默认关闭（标签名与未安装插件时完全一致），面板新增"标题调试"开关，开启后才以可读格式在标签页标题显示播放状态，关闭时立即还原平台原标题；v1.7.15 修复"最后一节弹窗确认后卡在等待平台更新课程状态、不关标签不开新课"：完结轮询链断裂后重启会重置 30 秒计时导致超时分支永远走不到，现改为同一课程等待起点不重置、轮询链异常/路由瞬空不再断裂，超时后平台未更新章节状态则刷新页面重查，仍超时则凭"弹窗已确认+视频已播完"强制进入下一课
// @match        https://elearning.chinatowercom.cn/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  if (window.__towerStudyHelper184) return;
  window.__towerStudyHelper184 = true;

  const VERSION = '1.7.15';

  const STORE_KEY = 'towerStudyHelperCourseIdsV1';
  const STATE_KEY = 'towerStudyHelperAutoStateV152';
  const SKIP_KEY = 'towerStudyHelperManualSkipV1';
  const PANEL_UI_KEY = 'towerStudyHelperPanelUiV1';

  const PANEL_ID = 'tower-study-helper-panel';
  const STYLE_ID = 'tower-study-helper-style';

  const CARD_SELECTOR = '.course-list-grid .videoItem';
  const NAME_SELECTOR = '.video-title .name';
  const CHAPTER_SELECTOR = '.choose .selected-works';
  const ACTIVE_SELECTOR = '.choose .selected-works.active';
  const STATUS_SELECTOR = '.study-status-pill';
  const VIDEO_SELECTOR = '.box.video-component video';
  const PLAY_BUTTON_SELECTOR = '.box.video-component .play-btn';

  // 1.6.8：匹配平台实际弹窗文案
  const LAST_CHAPTER_TEXT = '当前已是最后一节';
  const LAST_CHAPTER_CONFIRM_TEXT = '确定';
  const LAST_CHAPTER_WAIT_TIMEOUT = 30000;
  const NORMAL_FINISH_WAIT = 15000;
  const NEXT_REQUEST_KEY = 'towerStudyHelperNextRequestV1';
  // v1.7.15：最后一节弹窗确认状态持久化，刷新页面后恢复，
  // 避免“确认后平台不更新状态→刷新→丢失确认态→又走一遍流程”。
  const LAST_CHAPTER_ACK_KEY = 'towerStudyHelperLastChapterAckV1';

  // 首次开启倍速时平台弹出的提示（实测文案：
  // "学习时长按实际学习时间统计，不受倍速切换影响"），需点确定。
  // 该弹窗不阻断播放，但会遮住播放器与面板，故做保守自动确认。
  const SPEED_NOTICE_PATTERN =
    /学习时长[^。]{0,24}倍速|倍速[^。]{0,24}学习时长|按实际学习时间统计/;
  const SPEED_NOTICE_CONFIRM_TEXTS =
    ['确定', '确认', '我知道了', '知道了', '好的'];

  // 各弹窗处理共用的容器选择器
  const DIALOG_SELECTORS = [
    '[role="dialog"]',
    '[aria-modal="true"]',
    '.el-dialog',
    '.el-message-box',
    '.el-overlay-message-box',
    '.ant-modal',
    '.ant-modal-content',
    '.modal-dialog',
    '.modal-content',
    '.ivu-modal',
    '.layui-layer'
  ];

  // PPT/文档章节加载失败检测：平台默认 5 分钟完成，超过 7 分钟未完成视为异常。
  const PPT_STUCK_THRESHOLD = 420000;
  const PPT_REFRESH_KEY = 'towerStudyHelperPptRefreshV1';

  const PROGRESS_ERROR_PATTERN =
    /由于服务异常|学习进度提交失败|请切换章节再学习一下/;

  const NAME_FIELDS = [
    'courseName', 'courseTitle', 'videoName', 'resourceName',
    'lessonName', 'title', 'name'
  ];

  const ID_FIELDS = [
    'courseId', 'courseID', 'courseUuid', 'courseUUID',
    'videoId', 'videoID', 'videoUuid', 'videoUUID',
    'resourceId', 'resourceID', 'resourceUuid', 'resourceUUID',
    'lessonId', 'lessonID', 'uuid', 'id'
  ];

  let lastClickedCourseName = '';
  let lastRoute = '';
  let lastListSignature = '';
  let lastMessage = '等待操作';

  let detailTimer = null;
  let listTimer = null;
  let completionWaitTimer = null;
  let completionWaitId = '';
  // v1.7.15：完结等待的起点时间戳（模块级）。轮询链断裂后 monitorDetail 会
  // 再次调用 scheduleCourseFinishCheck，若每次重启都重置起点，则 15s/30s 的
  // 超时分支永远走不到，课程卡在“等待平台更新课程状态”不跳转。同一课程
  // （completionWaitId 相同）复用时保留原起点，保证超时逻辑必然到达。
  let completionWaitStartedAt = 0;
  // v1.7.15：超时后平台仍未更新状态时，允许刷新页面重查的次数（按课程记）。
  let courseFinishReloadTries = 0;

  let chapterClickLock = false;
  let finishingCourse = false;
  let lastAutoChapter = '';
  let manualControlUntil = 0;
  let pauseRequested = false;
  let initialized = false;
  let playbackStarting = false;
  let finishAttemptId = '';
  let finishAttemptCount = 0;

  let lastChapterAckCourseId = '';
  let lastChapterAckTime = 0;
  let lastChapterAckInProgress = false;

  let lastSpeedNoticeAckTime = 0;

  let pptStuckStart = 0;
  let pptStuckKey = '';
  let pptRefreshCount = 0;

  // =========================================================
  // 1. 通用工具、课程 ID 和手动跳过名单
  // =========================================================

  function normalizeName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(String(value || ''));
  }

  // 调试：记录列表页捕获到的 API 路径，便于排查新版接口。
  let lastApiLog = [];

  function recordApiLog(url) {
    const text = String(url || '');
    if (!/api/i.test(text)) return;
    lastApiLog = [text, ...lastApiLog].slice(0, 12);
  }

  function readStore() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return data && typeof data === 'object' && !Array.isArray(data)
        ? data : {};
    } catch (_) {
      return {};
    }
  }

  function writeStore(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[铁塔助手] 保存课程 ID 失败', error);
    }
  }

  function getCourseId(name) {
    const store = readStore();
    const key = normalizeName(name);

    if (!key) return '';
    if (store[key]) return store[key];

    for (const oldName of Object.keys(store)) {
      if (normalizeName(oldName) === key && store[oldName]) {
        return store[oldName];
      }
    }
    return '';
  }

  function saveCourseId(name, id) {
    name = normalizeName(name);
    id = String(id || '').trim();

    if (!name || !isUuid(id)) return false;

    const store = readStore();

    for (const oldName of Object.keys(store)) {
      if (normalizeName(oldName) === name && oldName !== name) {
        delete store[oldName];
      }
    }

    store[name] = id;
    writeStore(store);
    refreshPanel();
    return true;
  }

  function readManualSkip() {
    try {
      const data = JSON.parse(localStorage.getItem(SKIP_KEY) || '{}');
      return data && typeof data === 'object' && !Array.isArray(data)
        ? data : {};
    } catch (_) {
      return {};
    }
  }

  function writeManualSkip(data) {
    try {
      localStorage.setItem(SKIP_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[铁塔助手] 保存手动跳过名单失败', error);
    }
  }

  function skipKey(course) {
    const id = String(course?.id || '').trim().toLowerCase();
    if (id && isUuid(id)) return `id:${id}`;

    const name = normalizeName(course?.name);
    return name ? `name:${name}` : '';
  }

  function isManuallySkipped(course) {
    if (!course) return false;

    const data = readManualSkip();
    const id = String(course.id || '').trim().toLowerCase();
    const name = normalizeName(course.name);

    if (id && data[`id:${id}`]) return true;
    if (name && data[`name:${name}`]) return true;

    return false;
  }

  function toggleManualSkip(course) {
    const key = skipKey(course);
    if (!key) return;

    const data = readManualSkip();

    if (data[key]) {
      delete data[key];
    } else {
      data[key] = {
        name: normalizeName(course.name),
        id: String(course.id || '').trim().toLowerCase(),
        time: Date.now()
      };
    }

    writeManualSkip(data);

    const currentId = getCurrentRouteId();
    const matchesCurrent = currentId &&
      String(course.id || '').toLowerCase() === currentId.toLowerCase();

    if (data[key] && matchesCurrent && isRunning()) {
      stopCurrentVideo();
      advancePastCurrentCourse(currentId, '当前课程已被手动标记跳过');
    }

    lastListSignature = '';
    refreshPanel();
  }

  function shouldSkipCourse(course) {
    return isManuallySkipped(course);
  }

  function isCourseListApi(url) {
    const text = String(url || '');
    if (!/api/i.test(text)) return false;
    // 旧版接口
    if (text.includes('/api/v1/course-study/course-front') &&
      !text.includes('course-info-section') &&
      !text.includes('course-info-progress')) {
      return true;
    }
    // 新版：捕获列表页上携带 course/curriculum/study 且非详情段落的接口
    if (
      /course|curriculum|study|lesson|train/i.test(text) &&
      !text.includes('info-section') &&
      !text.includes('info-progress') &&
      !text.includes('detail')
    ) {
      return true;
    }
    return false;
  }

  function findUuid(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 8) return '';

    for (const field of ID_FIELDS) {
      const value = obj[field];
      if (typeof value === 'string' && isUuid(value)) return value;
    }

    for (const value of Object.values(obj)) {
      if (typeof value === 'string' && isUuid(value)) return value;
    }

    return '';
  }

  function findName(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 8) return '';

    for (const field of NAME_FIELDS) {
      const value = obj[field];
      if (typeof value === 'string' && normalizeName(value)) {
        return normalizeName(value);
      }
    }

    return '';
  }

  function extractCourseRecords(data) {
    const records = [];
    const seen = new Set();

    function walk(value, depth = 0) {
      if (!value || typeof value !== 'object' || depth > 12) return;

      if (Array.isArray(value)) {
        value.forEach(item => walk(item, depth + 1));
        return;
      }

      const name = findName(value);
      const id = findUuid(value);

      if (name && id) {
        const key = `${normalizeName(name)}|${id}`;

        if (!seen.has(key)) {
          seen.add(key);
          records.push({ name, id });
        }
      }

      Object.values(value).forEach(child => {
        if (child && typeof child === 'object') {
          walk(child, depth + 1);
        }
      });
    }

    walk(data);
    return records;
  }

  function processApiData(data, url) {
    if (url && !isCourseListApi(url)) return;
    for (const item of extractCourseRecords(data)) {
      saveCourseId(item.name, item.id);
    }
    persistApiDebug(data, url);
  }

  // 静默调试：把捕获到的课程列表接口与样例写入 localStorage（不在面板展示），
  // 用于定位新版接口路径与课程 ID 字段的真实格式。
  function persistApiDebug(data, url) {
    try {
      const sample = [];
      let found = 0;

      (function walk(value, depth) {
        if (!value || typeof value !== 'object' || depth > 10 || found >= 3) return;
        if (Array.isArray(value)) {
          value.forEach(v => walk(v, depth + 1));
          return;
        }
        const name = findName(value);
        if (name) {
          const idLike = {};
          for (const [k, v] of Object.entries(value)) {
            if (/id|uuid/i.test(k) && typeof v === 'string' && v) idLike[k] = v;
          }
          sample.push({ name, idLike, keys: Object.keys(value).slice(0, 24) });
          found++;
        }
        Object.values(value).forEach(v => {
          if (found < 3) walk(v, depth + 1);
        });
      })(data, 0);

      const dbgText = JSON.stringify({
        url: String(url || '').slice(0, 320),
        ts: Date.now(),
        sample
      });

      localStorage.setItem('towerStudyHelperApiDebug', dbgText);

      // 标题调试：把课程清单与 ID 字段摘要写入标签页标题（非面板），便于外部监控。
      // v1.7.13：详情页不写标题。播放页会高频命中 course-front 进度上报接口，
      // 每次回调都改写标题会让标签页标题每秒级变化，外部工具无法 claim/截图，
      // 弹窗与 bug 现场都抓不到。详情页标题由播放心跳（updateDebugHeartbeat）独占。
      if (!isDetailPage()) {
        try {
          const names = (sample || []).slice(0, 6).map(s => ({
            n: s.name,
            id: s.idLike && s.idLike.id
          }));
          const patch = {
            api: String(url || '').split('?')[0],
            count: (sample || []).length,
            sample: names
          };
          patch.page = 'list';
          setDebugTitle(patch);
        } catch (_) {}
      }

      // 额外把调试数据写到一个屏幕外、不可见的 span（不影响面板 UI），
      // 便于外部通过 DOM 读取接口路径与课程 ID 字段格式。
      try {
        let dbg = document.getElementById('tsh-debug');
        if (!dbg) {
          dbg = document.createElement('span');
          dbg.id = 'tsh-debug';
          dbg.setAttribute(
            'style',
            'position:absolute;left:-9999px;top:-9999px;font-size:1px;color:transparent;'
          );
          document.body.appendChild(dbg);
        }
        dbg.textContent = dbgText;
        // v1.7.8 起不再把调试数据写入页面标题，避免污染标签页；
        // 外部仍可通过 localStorage['towerStudyHelperApiDebug']
        // 或页面内隐藏 span #tsh-debug 读取。
        try { dbg.dataset.ts = String(Date.now()); } catch (_) {}
      } catch (_) {}
    } catch (_) {}
  }

  // ---------------------------------------------------------
  // 轻量标题调试（默认关闭，不影响面板 UI 与标签名）
  // v1.7.14：默认完全不写 document.title——标签名与未安装插件时一致；
  // 仅当用户在面板勾选"标题调试"后，才把播放状态以可读格式写入标题，
  // 供外部监控（此前是原始 JSON，用户反馈像乱码，已改为紧凑格式）。
  // 格式示例（开启后）：
  //   列表页：铁塔e学 ｜ 列表
  //   播放页：铁塔e学 ｜ 1.25x · 741/2009 · 第1节 · 运行中 · 等待平台更新
  //   倍速不符：铁塔e学 ｜ 1.0→1.25x · 741/2009 · 第1节 · 运行中
  // ---------------------------------------------------------
  let __tshDebug = {};
  // 我们生成的状态串总是以 倍速数值/常速/列表 开头，据此安全剥离旧后缀，
  // 不会误伤平台原标题（即使原标题含"｜"）。
  const TSH_TITLE_TAIL_RE =
    /\s*｜\s*(?:(?:\d+(?:\.\d+)?(?:→\d+(?:\.\d+)?)?x|常速|列表)\b[\s\S]*)$/;

  function stripTshTitleSuffix(title) {
    return String(title || '').replace(TSH_TITLE_TAIL_RE, '');
  }

  function truncateText(value, max) {
    const text = String(value || '');
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  // 章节名原文形如"第1节 《…》学习解读（上）视频|33分28秒"，标题里只保留"第N节"。
  function shortChapterName(chapter) {
    const text = String(chapter || '');
    const matched = text.match(/^(第[^，,|]{0,12}?节)/);
    if (matched) return matched[1];
    return truncateText(text.split('|')[0], 12);
  }

  function buildDebugTitle() {
    const debug = __tshDebug;
    const parts = [];

    if (debug.page === 'detail') {
      if (debug.rateOn) {
        const rate = Number(debug.rate);
        const target = Number(debug.rateTarget);
        if (
          Number.isFinite(rate) && Number.isFinite(target) &&
          Math.abs(rate - target) > 0.05
        ) {
          parts.push(`${rate}→${target}x`);
        } else {
          parts.push(`${Number.isFinite(rate) ? rate : 1}x`);
        }
      } else {
        parts.push('常速');
      }

      if (typeof debug.t === 'number' && debug.d) {
        parts.push(`${debug.t}/${debug.d}`);
      }
      if (debug.chapter) parts.push(shortChapterName(debug.chapter));
      if (debug.rateReset) parts.push(`重置${debug.rateReset}`);
      parts.push(debug.running ? '运行中' : '已暂停');
      if (debug.status) parts.push(truncateText(debug.status, 14));
    } else if (debug.page === 'list') {
      parts.push('列表');
    }

    const base = stripTshTitleSuffix(document.title).trim() || '铁塔e学';
    return parts.length ? `${base} ｜ ${parts.join(' · ')}` : base;
  }

  // 标题调试开关（面板"标题调试"复选框，默认关）：
  // 关闭时完全不碰 document.title，标签名与无插件时一致；
  // 仅在用户勾选后才把可读的播放状态写入标题，供外部监控。
  function setDebugTitle(patch) {
    try {
      if (!state.titleDebug) return;
      __tshDebug = { ...__tshDebug, ...patch, ts: Date.now() };
      document.title = buildDebugTitle();
    } catch (_) {}
  }

  // 关闭标题调试时，立即把标签名还原为平台原标题（剥掉我们追加的状态后缀）。
  function restorePlatformTitle() {
    try {
      const restored = stripTshTitleSuffix(document.title).trim();
      if (restored) document.title = restored;
    } catch (_) {}
  }

  // 倍速守卫：观测并抵消平台的倍速重置（"系统验证机制"）。
  // 当 playbackRate 被改回目标倍速之外时，自动恢复目标倍速并计数；
  // 计数超过上限则停止恢复，避免与平台无限互搏。
  function bindRateGuard(video) {
    if (!video || video.__tshRateGuard) return;
    video.__tshRateGuard = true;
    video.__tshRateResets = 0;

    video.addEventListener('ratechange', () => {
      // 功能关闭时不干预平台自身的倍速控件
      if (!state.speedEnabled) return;

      const target = parseFloat(state.playbackRate) || 1;

      if (Math.abs(video.playbackRate - target) > 0.05) {
        video.__tshRateResets = (video.__tshRateResets || 0) + 1;
        setDebugTitle({
          rateReset: video.__tshRateResets,
          rateNow: video.playbackRate,
          rateTarget: target
        });
        if (video.__tshRateResets <= 60) {
          try { video.playbackRate = target; } catch (_) {}
        } else if (video.__tshRateResets === 61) {
          setMessage('倍速被平台反复重置，已停止自动恢复（可能触发验证机制）');
        }
      }
    });
  }

  // 播放页实时心跳：把播放进度/倍速/状态写入标题，供外部监控。
  // 节流：默认 15s 才刷新一次标题；但倍速/章节/运行态/状态消息等关键字段变化时立即刷新。
  // v1.7.13：配合"详情页不再由接口日志写标题"，播放中标题最长 15s 才变一次，
  // 外部工具才能可靠 claim/截图该标签页（倍速切换本身会触发即时刷新，便于观测）。
  let __tshHeartbeatLast = 0;
  let __tshHeartbeatKey = '';
  function updateDebugHeartbeat(video) {
    if (!video) return;
    try {
      const active = getActiveChapter();
      const id = getCurrentRouteId();
      const chapter = getChapterName(active);
      const t = Math.round(video.currentTime || 0);
      const d = Math.round(video.duration || 0);
      const rate = video.playbackRate;
      const rateReset = video.__tshRateResets || 0;
      const running = isRunning();
      const status = lastMessage || state.message;

      // 关键字段（倍速相关/章节/运行态/状态消息）任一变化则立即刷新
      const key = `${id}|${chapter}|${rate}|${rateReset}|${running}|${status}`;
      const now = Date.now();
      const force = key !== __tshHeartbeatKey;
      if (!force && now - __tshHeartbeatLast < 15000) return;
      __tshHeartbeatLast = now;
      __tshHeartbeatKey = key;

      setDebugTitle({
        page: 'detail',
        id,
        chapter,
        t,
        d,
        rate,
        rateOn: state.speedEnabled,
        rateTarget: state.playbackRate,
        rateReset,
        running,
        status
      });
    } catch (_) {}
  }

  const originalFetch = window.fetch;

  window.fetch = function (...args) {
    const url = args[0] instanceof Request
      ? args[0].url : String(args[0] || '');

    recordApiLog(url);

    return originalFetch.apply(this, args).then(response => {
      if (isCourseListApi(url)) {
        response.clone().text().then(text => {
          try {
            processApiData(JSON.parse(text), url);
          } catch (_) {}
        }).catch(() => {});
      }
      return response;
    });
  };

  const originalOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__towerStudyUrl = String(url || '');
    return originalOpen.call(this, method, url, ...rest);
  };

  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.send = function (...args) {
    const xhr = this;
    const url = xhr.__towerStudyUrl || '';

    recordApiLog(url);

    if (isCourseListApi(url)) {
      xhr.addEventListener('load', () => {
        try {
          if (xhr.responseType && xhr.responseType !== 'text') return;
          processApiData(JSON.parse(xhr.responseText), url);
        } catch (_) {}
      });
    }

    return originalSend.apply(this, args);
  };

  const originalWindowOpen = window.open;

  window.open = function (url, ...args) {
    const match = String(url || '').match(
      /#\/onlineDetail\/([0-9a-f-]{36})/i
    );

    if (match && lastClickedCourseName) {
      saveCourseId(lastClickedCourseName, match[1]);
    }

    return originalWindowOpen.call(this, url, ...args);
  };

  // =========================================================
  // 2. 课程列表、课程状态和路由
  // =========================================================

  function getCards() {
    return [...document.querySelectorAll(CARD_SELECTOR)];
  }

  function getCardName(card) {
    return normalizeName(card.querySelector(NAME_SELECTOR)?.innerText || '');
  }

  function getCourseStatus(card) {
    if (!card) return 'unknown';

    const selectors = [
      '.study-status-pill', '.course-status', '.study-status',
      '.course-state', '.learn-status', '.status-tag', '.el-tag',
      '[class*="status"]', '[class*="Status"]'
    ];

    const statusTexts = [];

    for (const selector of selectors) {
      card.querySelectorAll(selector).forEach(node => {
        const text = normalizeName(node.innerText || node.textContent || '');
        if (text && text.length <= 80) statusTexts.push(text);
      });
    }

    const combined = [...new Set(statusTexts)].join(' ');
    const text = combined ||
      normalizeName(card.innerText || card.textContent || '');

    if (/未学习|未完成|待学习|继续学习|学习中|进行中|未开始/.test(text)) {
      return 'unfinished';
    }

    if (/已完成|学习完成|完成学习|已学完|学习完毕|完成率\s*100\s*%|100\s*%\s*完成/.test(text)) {
      return 'completed';
    }

    const progressNodes = [
      ...card.querySelectorAll('[role="progressbar"], progress, [aria-valuenow]')
    ];

    for (const node of progressNodes) {
      const ariaValue = Number(node.getAttribute('aria-valuenow'));
      const ariaMax = Number(node.getAttribute('aria-valuemax') || 100);
      const value = Number(node.value);
      const max = Number(node.max || 100);

      if (Number.isFinite(ariaValue) && ariaValue >= ariaMax && ariaMax > 0) {
        return 'completed';
      }

      if (
        node.tagName === 'PROGRESS' &&
        Number.isFinite(value) && value >= max && max > 0
      ) {
        return 'completed';
      }
    }

    return 'unknown';
  }

  function getCardMeta(card) {
    const text = normalizeName(card?.innerText || '');

    const credit = text.match(/学分[：:]\s*([\d.]+)/)?.[1] || '';
    const hours = text.match(/学时[：:]\s*([\d.]+)/)?.[1] || '';
    const chapters = text.match(/章节[：:]\s*(\d+)/)?.[1] || '';

    return { credit, hours, chapters };
  }

  function getCourseList() {
    return getCards().map(card => {
      const name = getCardName(card);
      const meta = getCardMeta(card);

      return {
        name,
        id: getCourseId(name),
        status: getCourseStatus(card),
        credit: meta.credit,
        hours: meta.hours,
        chapters: meta.chapters,
        card
      };
    }).filter(item => item.name);
  }

  function getCurrentRouteId() {
    return location.hash.match(/#\/onlineDetail\/([0-9a-f-]{36})/i)?.[1] || '';
  }

  function isDetailPage() {
    return Boolean(getCurrentRouteId());
  }

  function isListPage() {
    return location.hash.includes('/online') && !isDetailPage();
  }

  document.addEventListener('click', event => {
    const card = event.target?.closest?.(CARD_SELECTOR);
    if (card) lastClickedCourseName = getCardName(card);
  }, true);

  function loadState() {
    const defaults = {
      running: false,
      queue: [],
      queueIndex: 0,
      currentId: '',
      visited: [],
      message: '',
      pageNumber: 1,
      resumeOpenNext: false,
      speedEnabled: false,
      playbackRate: 1.25,
      titleDebug: false
    };

    try {
      return {
        ...defaults,
        ...JSON.parse(localStorage.getItem(STATE_KEY) || '{}')
      };
    } catch (_) {
      return defaults;
    }
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function isRunning() {
    return state.running === true && !pauseRequested;
  }

  function setMessage(message) {
    lastMessage = message;
    state.message = message;
    saveState();
    refreshPanel();
    console.log('[铁塔助手]', message);
  }

  // =========================================================
  // 3. 暂停、恢复和跨标签页同步
  // =========================================================

  function getVideo() {
    return document.querySelector(VIDEO_SELECTOR);
  }

  function stopCurrentVideo() {
    const video = getVideo();
    if (video) {
      try { video.pause(); } catch (_) {}
    }
  }

  // 倍速播放：根据面板开关与档位设置 video.playbackRate。
  // 注意：平台不会因为"选回 1x"而自动把 playbackRate 写回 1，
  // 必须由我们显式设置，否则播放器停留在原倍速（v1.7.12 修复）。
  // 若平台检测到异常并重置速度，会在 ratechange 中尝试恢复（有限次数）。
  function applyPlaybackRate() {
    const video = getVideo();
    if (!video) return;

    // 功能关闭：不干预平台自身的倍速控件（恢复常速由开关回调显式处理）
    if (!state.speedEnabled) return;

    const target = parseFloat(state.playbackRate) || 1;

    try {
      if (Math.abs(video.playbackRate - target) > 0.05) {
        video.playbackRate = target;
      }
    } catch (error) {
      console.warn('[铁塔助手] 设置倍速失败：', error);
    }
  }

  // 显式恢复常速：关闭倍速开关 / 切回 1x 时调用。
  function resetPlaybackRate() {
    const video = getVideo();
    if (!video) return;

    try {
      if (Math.abs(video.playbackRate - 1) > 0.05) {
        video.playbackRate = 1;
      }
    } catch (error) {
      console.warn('[铁塔助手] 恢复常速失败：', error);
    }
  }

  function clearCompletionWait() {
    if (completionWaitTimer) {
      clearTimeout(completionWaitTimer);
      completionWaitTimer = null;
    }
    completionWaitId = '';
    completionWaitStartedAt = 0;
  }

  // v1.7.15：最后一节弹窗确认态持久化（刷新页面后恢复）。
  function saveLastChapterAck(courseId) {
    try {
      localStorage.setItem(LAST_CHAPTER_ACK_KEY, JSON.stringify({
        courseId: String(courseId || ''),
        time: Date.now()
      }));
    } catch (_) {}
  }

  function restoreLastChapterAck(courseId) {
    if (!courseId) return false;
    if (lastChapterAckCourseId &&
        lastChapterAckCourseId.toLowerCase() === courseId.toLowerCase()) {
      return lastChapterAckTime > 0;
    }
    try {
      const data = JSON.parse(localStorage.getItem(LAST_CHAPTER_ACK_KEY) || 'null');
      if (data && String(data.courseId || '').toLowerCase() ===
          courseId.toLowerCase() && Number(data.time) > 0) {
        lastChapterAckCourseId = courseId;
        lastChapterAckTime = Number(data.time);
        lastChapterAckInProgress = true;
        return true;
      }
    } catch (_) {}
    return false;
  }

  function clearLastChapterAck() {
    lastChapterAckCourseId = '';
    lastChapterAckTime = 0;
    lastChapterAckInProgress = false;
    courseFinishReloadTries = 0;
    try { localStorage.removeItem(LAST_CHAPTER_ACK_KEY); } catch (_) {}
  }

  function clearAutomationTimers() {
    if (detailTimer) {
      clearInterval(detailTimer);
      detailTimer = null;
    }
    if (listTimer) {
      clearInterval(listTimer);
      listTimer = null;
    }
    clearCompletionWait();
  }

  function pauseAuto(message = '已暂停') {
    pauseRequested = true;
    state.running = false;
    clearAutomationTimers();
    stopCurrentVideo();
    saveState();
    setMessage(message);
  }

  function resumeTimers() {
    if (detailTimer) clearInterval(detailTimer);
    detailTimer = null;

    if (isDetailPage() && isRunning()) {
      detailTimer = setInterval(monitorDetail, 1200);
    }

    if (listTimer) clearInterval(listTimer);

    listTimer = setInterval(() => {
      if (!document.getElementById(PANEL_ID)) createPanel();

      const signature = getCourseList().map(item =>
        `${item.name}|${item.id}|${item.status}|${shouldSkipCourse(item)}`
      ).join(';;');

      if (signature !== lastListSignature) {
        lastListSignature = signature;
        refreshPanel();
      }

      if (location.hash !== lastRoute) handleRouteChange();
    }, 1500);
  }

  function handleNextRequest() {
    let req = null;
    try {
      req = JSON.parse(localStorage.getItem(NEXT_REQUEST_KEY) || 'null');
    } catch (_) {
      return;
    }

    if (!req || req.action !== 'openNext') return;

    // 消费触发键，避免列表页重复刷新或重复处理。
    try { localStorage.removeItem(NEXT_REQUEST_KEY); } catch (_) {}

    if (!isRunning()) {
      setMessage('收到播放页完成信号（当前已暂停，稍后继续）');
      return;
    }

    if (isDetailPage()) {
      setMessage('收到完成信号，但当前不是课程列表标签');
      return;
    }

    // 回发 ack，让播放标签放心关闭。
    try {
      if (window.__towerStudyDetailTab && !window.__towerStudyDetailTab.closed) {
        window.__towerStudyDetailTab.postMessage(
          { type: 'towerStudyNextAck', action: 'ack' }, '*'
        );
      }
    } catch (_) {}

    // 标记需要在刷新后由 init 自动打开下一门。
    state.resumeOpenNext = true;
    saveState();

    setMessage('收到播放页完成信号：正在刷新课程列表并打开下一门课程');

    // 立即刷新，不等待，避免信号丢失。
    try { location.reload(); } catch (_) {}
  }

  window.addEventListener('storage', event => {
    if (event.key === NEXT_REQUEST_KEY) {
      handleNextRequest();
      return;
    }
    if (event.key !== STATE_KEY || !event.newValue) return;

    let incoming;
    try {
      incoming = JSON.parse(event.newValue);
    } catch (_) {
      return;
    }

    if (!incoming || typeof incoming.running !== 'boolean') return;

    let previous = {};
    try {
      previous = JSON.parse(event.oldValue || '{}');
    } catch (_) {}

    if (previous.running === incoming.running) return;

    state = { ...state, ...incoming };

    if (incoming.running === false) {
      pauseRequested = true;
      clearAutomationTimers();
      stopCurrentVideo();
      lastMessage = incoming.message || '其他标签页已暂停';
      refreshPanel();
      return;
    }

    if (incoming.running === true) {
      pauseRequested = false;
      lastMessage = incoming.message || '已同步其他标签页的运行状态';
      resumeTimers();
      refreshPanel();
    }
  });

  // =========================================================
  // 4. 章节识别和人工操作优先
  // =========================================================

  function getChapters() {
    return [...document.querySelectorAll(CHAPTER_SELECTOR)];
  }

  function getActiveChapter() {
    return document.querySelector(ACTIVE_SELECTOR);
  }

  function getChapterStatus(chapter) {
    const node = chapter?.querySelector(STATUS_SELECTOR);
    return normalizeName(node?.innerText || node?.textContent || '');
  }

  function isChapterLearning(chapter) {
    return getChapterStatus(chapter).includes('学习中');
  }

  function isChapterCompleted(chapter) {
    return /已完成|学习完成|完成学习/.test(getChapterStatus(chapter));
  }

  function getChapterName(chapter) {
    if (!chapter) return '';

    const clone = chapter.cloneNode(true);
    clone.querySelectorAll(STATUS_SELECTOR).forEach(node => node.remove());

    return normalizeName(clone.innerText || clone.textContent || '')
      .replace(/完成率：?\s*\d+(?:\.\d+)?%?/g, '')
      .replace(/需达到\s*\d+(?:\.\d+)?%?/g, '')
      .trim();
  }

  function isExamChapter(chapter) {
    return /考试|测验|答题|试卷/.test(getChapterName(chapter));
  }

  function isLastChapterExam() {
    const chapters = getChapters();
    if (!chapters.length) return false;
    return isExamChapter(chapters[chapters.length - 1]);
  }

  document.addEventListener('click', event => {
    if (!event.isTrusted) return;

    const chapter = event.target?.closest?.(CHAPTER_SELECTOR);
    if (!chapter) return;

    manualControlUntil = Date.now() + 15000;
    lastAutoChapter = '';

    setMessage(`人工选择章节：${getChapterName(chapter)}，优先服从人工操作`);

    setTimeout(() => {
      if (!isRunning()) return;
      if (getActiveChapter() === chapter) ensurePlayback();
    }, 700);
  }, true);

  function manualControlActive() {
    return Date.now() < manualControlUntil;
  }

  function clickChapter(chapter, reason) {
    if (!chapter || chapterClickLock || !isRunning()) return false;
    if (manualControlActive()) return false;
    if (getActiveChapter() === chapter) return false;

    if (isExamChapter(chapter)) {
      pauseAuto(`下一章节是考试/测验：${getChapterName(chapter)}，已暂停`);
      return false;
    }

    chapterClickLock = true;
    setMessage(`正在选择章节：${getChapterName(chapter)}（${reason}）`);

    try {
      chapter.click();
    } catch (error) {
      console.warn('[铁塔助手] 点击章节失败', error);
    }

    setTimeout(() => {
      if (!isRunning()) {
        chapterClickLock = false;
        return;
      }

      if (getActiveChapter() !== chapter) {
        const parent = chapter.closest('.item-box');
        if (parent) parent.click();
      }
    }, 350);

    setTimeout(() => {
      chapterClickLock = false;

      if (getActiveChapter() === chapter) {
        lastAutoChapter = '';
        setMessage(`已切换章节：${getChapterName(chapter)}`);
        ensurePlayback();
      } else {
        setMessage(`章节未切换成功：${getChapterName(chapter)}`);
      }
    }, 1000);

    return true;
  }

  function selectInitialChapter() {
    if (!isRunning() || manualControlActive()) return false;

    const chapters = getChapters();

    if (!chapters.length) {
      setMessage('等待章节列表加载');
      return false;
    }

    if (isLastChapterExam()) {
      setMessage('课程最后一节为考试，默认跳过不学习');
      advancePastCurrentCourse(
        getCurrentRouteId(),
        '课程最后一节为考试，已跳过'
      );
      return false;
    }

    const learning = chapters.find(isChapterLearning);

    if (learning) {
      if (getActiveChapter() === learning) {
        ensurePlayback();
        return true;
      }
      return clickChapter(learning, '优先选择学习中章节');
    }

    const unfinished = chapters.find(chapter =>
      !isChapterCompleted(chapter) && !isExamChapter(chapter)
    );

    if (unfinished) {
      if (getActiveChapter() === unfinished) {
        ensurePlayback();
        return true;
      }
      return clickChapter(unfinished, '选择第一个未完成章节');
    }

    if (chapters.every(isChapterCompleted)) {
      setMessage('所有章节均已完成，等待课程状态稳定');
      scheduleCourseFinishCheck();
    }

    return false;
  }

  // =========================================================
  // 5. 播放器控制和预览遮罩
  // =========================================================

  function getPlatformPlayButton() {
    return document.querySelector(PLAY_BUTTON_SELECTOR);
  }

  function platformButtonIsPlay(button) {
    if (!button) return null;

    const use = button.querySelector('use');
    const href = (
      use?.getAttribute('href') ||
      use?.getAttribute('xlink:href') || ''
    ).toLowerCase();

    const svgClass = (
      button.querySelector('svg')?.getAttribute('class') || ''
    ).toLowerCase();

    if (href.includes('pause') || svgClass.includes('pause')) return false;
    if (href.includes('play') || svgClass.includes('play')) return true;

    return null;
  }

  function getPreviewOverlay() {
    const box = document.querySelector('.box.video-component');
    if (!box) return null;

    for (const image of box.querySelectorAll('img')) {
      if (
        !image.classList.contains('cursor-pointer') ||
        !image.classList.contains('w-[46px]')
      ) continue;

      let node = image.parentElement;

      while (node && node !== box) {
        if (
          node.tagName === 'DIV' &&
          node.classList.contains('z-10') &&
          node.classList.contains('absolute') &&
          node.classList.contains('top-0') &&
          node.classList.contains('left-0')
        ) return node;

        node = node.parentElement;
      }
    }

    return null;
  }

  function hidePreviewOverlay() {
    const video = getVideo();
    if (!video || video.paused || video.ended) return false;

    const overlay = getPreviewOverlay();
    if (!overlay) return false;

    overlay.style.setProperty('display', 'none', 'important');
    overlay.style.setProperty('visibility', 'hidden', 'important');
    overlay.style.setProperty('pointer-events', 'none', 'important');
    return true;
  }

  function removePlayOverlayWhenPlaying() {
    const video = getVideo();
    if (!video || video.paused || video.ended) return;

    hidePreviewOverlay();

    const selectors = [
      '.box.video-component .vjs-big-play-button',
      '.box.video-component .big-play-button',
      '.box.video-component .video-play-overlay',
      '.box.video-component .play-overlay',
      '.box.video-component .poster-play',
      '.box.video-component .video-poster-play'
    ];

    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(node => {
        node.style.setProperty('display', 'none', 'important');
        node.style.setProperty('visibility', 'hidden', 'important');
        node.style.setProperty('pointer-events', 'none', 'important');
      });
    }
  }

  function videoIsPlaying(video) {
    return Boolean(
      video && !video.paused && !video.ended &&
      (video.currentTime > 0 || video.readyState >= 2)
    );
  }

  function waitForVideoPlaying(video, timeout = 8000) {
    if (videoIsPlaying(video)) return Promise.resolve(true);

    return new Promise(resolve => {
      let finished = false;
      let timer = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('timeupdate', onTimeUpdate);
      };

      const finish = result => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(result);
      };

      const check = () => {
        if (videoIsPlaying(video)) finish(true);
      };

      const onPlaying = () => check();
      const onTimeUpdate = () => check();

      video.addEventListener('playing', onPlaying);
      video.addEventListener('timeupdate', onTimeUpdate);
      timer = setTimeout(() => finish(videoIsPlaying(video)), timeout);
      check();
    });
  }

  async function ensurePlayback() {
    if (!isRunning() || isExamPage() || playbackStarting) return;

    const active = getActiveChapter();
    if (!active || isChapterCompleted(active)) return;

    const video = getVideo();
    const button = getPlatformPlayButton();

    if (!video && !button) {
      setMessage('当前章节暂未发现可控制的播放器');
      return;
    }

    if (video && videoIsPlaying(video)) {
      removePlayOverlayWhenPlaying();
      applyPlaybackRate();
      return;
    }

    playbackStarting = true;

    try {
      let currentVideo = getVideo();
      const overlay = getPreviewOverlay();

      if (currentVideo && overlay) {
        const image = [...overlay.querySelectorAll('img')].find(img =>
          img.classList.contains('cursor-pointer') &&
          img.classList.contains('w-[46px]')
        );

        if (image) {
          setMessage('检测到大播放遮罩，正在启动播放器');

          const startedPromise = waitForVideoPlaying(currentVideo, 8000);
          image.click();
          const started = await startedPromise;

          if (!isRunning()) return;
          currentVideo = getVideo();

          if (started && currentVideo && videoIsPlaying(currentVideo)) {
            removePlayOverlayWhenPlaying();
            applyPlaybackRate();
            setMessage(`正在播放：${getChapterName(getActiveChapter())}`);
            return;
          }
        }
      }

      if (!isRunning()) return;

      currentVideo = getVideo();

      if (currentVideo && (currentVideo.paused || currentVideo.ended)) {
        try {
          if (currentVideo.ended) currentVideo.currentTime = 0;

          const startedPromise = waitForVideoPlaying(currentVideo, 5000);
          const result = currentVideo.play();

          if (result && typeof result.then === 'function') await result;
          await startedPromise;
        } catch (error) {
          console.warn('[铁塔助手] 原生播放失败，将检查平台按钮', error);
        }
      }

      if (!isRunning()) return;

      currentVideo = getVideo();

      if (currentVideo && videoIsPlaying(currentVideo)) {
        removePlayOverlayWhenPlaying();
        applyPlaybackRate();
        setMessage(`正在播放：${getChapterName(getActiveChapter())}`);
        return;
      }

      const currentButton = getPlatformPlayButton();

      if (currentButton && platformButtonIsPlay(currentButton) === true) {
        currentButton.click();
        await new Promise(resolve => setTimeout(resolve, 800));

        if (!isRunning()) return;

        currentVideo = getVideo();

        if (currentVideo && videoIsPlaying(currentVideo)) {
          removePlayOverlayWhenPlaying();
          applyPlaybackRate();
          setMessage('已通过平台播放按钮启动视频');
        } else {
          setMessage('已点击播放按钮，等待播放器响应');
        }
        return;
      }

      setMessage('自动播放未成功，请检查播放器状态');
    } catch (error) {
      console.warn('[铁塔助手] 自动播放过程出现异常', error);
      setMessage('自动播放遇到异常，请查看控制台');
    } finally {
      playbackStarting = false;
    }
  }

  function isExamPage() {
    return /开始考试|进入考试|提交试卷|考试倒计时|考试须知|开始答题/
      .test(normalizeName(document.body?.innerText || ''));
  }

  // =========================================================
  // 6. 进度提交失败弹窗处理（仅关闭弹窗，不再自动跳过课程）
  // =========================================================

  function isProgressSubmitErrorVisible() {
    if (!document.body) return false;
    return PROGRESS_ERROR_PATTERN.test(
      normalizeName(document.body.innerText || '')
    );
  }

  function dismissProgressError() {
    const confirmButton = [...document.querySelectorAll('button')].find(button =>
      normalizeName(button.innerText || button.textContent || '') === '我知道了' &&
      button.getClientRects().length > 0
    );

    if (confirmButton) {
      try { confirmButton.click(); } catch (_) {}
    }
  }

  function findQueueIndexById(id) {
    if (!id) return -1;
    const lowerId = id.toLowerCase();

    return state.queue.findIndex(item =>
      item.id && item.id.toLowerCase() === lowerId
    );
  }

  function advancePastCurrentCourse(id, message) {
    if (!isRunning()) return;

    const currentId = id || getCurrentRouteId();
    const index = findQueueIndexById(currentId);

    if (
      currentId &&
      !state.visited.some(v =>
        String(v).toLowerCase() === currentId.toLowerCase()
      )
    ) state.visited.push(currentId);

    if (index >= state.queueIndex) {
      state.queueIndex = index + 1;
    } else if (index < 0) {
      const currentItem = state.queue[state.queueIndex];

      if (
        currentItem && currentId &&
        String(currentItem.id || '').toLowerCase() === currentId.toLowerCase()
      ) state.queueIndex++;
    }

    state.currentId = currentId || state.currentId;
    saveState();
    setMessage(message);

    if (finishingCourse) return;

    finishingCourse = true;

    setTimeout(() => {
      finishingCourse = false;
      if (isRunning()) openNextCourse();
    }, 500);
  }

  // =========================================================
  // 7. 最后一节弹窗自动确认（1.6.8 修订）
  // =========================================================

  function isElementVisible(element) {
    if (!element || !element.isConnected) return false;
    if (element.getClientRects().length === 0) return false;

    const style = window.getComputedStyle(element);

    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0';
  }

  function getElementText(element) {
    return normalizeName(element?.innerText || element?.textContent || '');
  }

  function isLastChapterText(text) {
    return text.includes(LAST_CHAPTER_TEXT) ||
      text.includes('当前已是最后一节') ||
      text.includes('这是最后一章') ||
      text.includes('已经是最后一节') ||
      text.includes('已是最后一节');
  }

  function findLastChapterDialog() {
    if (!document.body) return null;

    const candidates = [];

    for (const selector of DIALOG_SELECTORS) {
      document.querySelectorAll(selector).forEach(element => {
        if (!isElementVisible(element)) return;

        if (isLastChapterText(getElementText(element))) {
          candidates.push(element);
        }
      });
    }

    // 兼容没有标准 dialog 类名的弹窗。
    const buttons = [...document.querySelectorAll(
      'button, [role="button"], .el-button, a'
    )];

    for (const button of buttons) {
      if (!isElementVisible(button)) continue;
      if (getElementText(button) !== LAST_CHAPTER_CONFIRM_TEXT) continue;

      let parent = button.parentElement;
      let depth = 0;

      while (parent && parent !== document.body && depth < 8) {
        if (
          isElementVisible(parent) &&
          isLastChapterText(getElementText(parent))
        ) {
          candidates.push(parent);
          break;
        }

        parent = parent.parentElement;
        depth++;
      }
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) =>
      getElementText(a).length - getElementText(b).length
    );

    for (const dialog of candidates) {
      const buttonsInDialog = [...dialog.querySelectorAll(
        'button, [role="button"], .el-button, a'
      )];

      const confirmButton = buttonsInDialog.find(button =>
        isElementVisible(button) &&
        getElementText(button) === LAST_CHAPTER_CONFIRM_TEXT
      );

      if (confirmButton) return { dialog, confirmButton };
    }

    return null;
  }

  // 查找倍速提示弹窗：文本命中"学习时长/倍速"关键词，且含可见的确定类按钮。
  // 与最后一节弹窗保持一致的双路查找（标准 dialog 容器 + 按钮向上兜底）。
  function findSpeedNoticeDialog() {
    if (!document.body) return null;

    const candidates = [];

    for (const selector of DIALOG_SELECTORS) {
      document.querySelectorAll(selector).forEach(element => {
        if (!isElementVisible(element)) return;
        if (!SPEED_NOTICE_PATTERN.test(getElementText(element))) return;
        candidates.push(element);
      });
    }

    const buttons = [...document.querySelectorAll(
      'button, [role="button"], .el-button, a'
    )];

    for (const button of buttons) {
      if (!isElementVisible(button)) continue;
      if (!SPEED_NOTICE_CONFIRM_TEXTS.includes(getElementText(button))) continue;

      let parent = button.parentElement;
      let depth = 0;

      while (parent && parent !== document.body && depth < 8) {
        if (
          isElementVisible(parent) &&
          SPEED_NOTICE_PATTERN.test(getElementText(parent))
        ) {
          candidates.push(parent);
          break;
        }

        parent = parent.parentElement;
        depth++;
      }
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) =>
      getElementText(a).length - getElementText(b).length
    );

    for (const dialog of candidates) {
      const buttonsInDialog = [...dialog.querySelectorAll(
        'button, [role="button"], .el-button, a'
      )];

      const confirmButton = buttonsInDialog.find(button =>
        isElementVisible(button) &&
        SPEED_NOTICE_CONFIRM_TEXTS.includes(getElementText(button))
      );

      if (confirmButton) return { dialog, confirmButton };
    }

    return null;
  }

  // 自动确认倍速提示弹窗；带 2 秒冷却，避免弹窗关闭动画期间重复点击。
  // 返回 true 表示本回合已尝试处理，交给调用方决定是否让出本回合。
  function handleSpeedNotice() {
    if (!isDetailPage()) return false;
    if (Date.now() - lastSpeedNoticeAckTime < 2000) return false;

    const found = findSpeedNoticeDialog();
    if (!found) return false;

    lastSpeedNoticeAckTime = Date.now();
    setMessage('检测到倍速提示弹窗，正在点击“确定”');

    try {
      found.confirmButton.click();
    } catch (error) {
      console.warn('[铁塔助手] 自动确认倍速提示弹窗失败', error);
    }

    return true;
  }

  function handleLastChapterPrompt() {
    if (!isRunning() || !isDetailPage()) return false;

    const courseId = getCurrentRouteId();
    if (!courseId) return false;

    const found = findLastChapterDialog();
    if (!found) return false;

    const sameCourse =
      lastChapterAckCourseId.toLowerCase() === courseId.toLowerCase();

    // 已点击但弹窗仍存在：短暂等待关闭，超过 3 秒允许重试。
    if (sameCourse && lastChapterAckInProgress) {
      if (Date.now() - lastChapterAckTime < 3000) return true;
    }

    lastChapterAckCourseId = courseId;
    lastChapterAckTime = Date.now();
    lastChapterAckInProgress = true;

    setMessage('检测到“当前已是最后一节”提示，正在点击“确定”');

    console.log('[铁塔助手] 检测到最后一节弹窗', {
      courseId,
      text: getElementText(found.dialog),
      button: getElementText(found.confirmButton)
    });

    try {
      found.confirmButton.click();
    } catch (error) {
      console.warn('[铁塔助手] 自动确认最后一节弹窗失败', error);
      lastChapterAckInProgress = false;
      setMessage('自动确认最后一节弹窗失败，请检查页面');
      return true;
    }

    setMessage('已点击“确定”，正在等待平台提交课程完成状态');
    saveLastChapterAck(courseId);
    scheduleCourseFinishCheck();

    return true;
  }

  // =========================================================
  // 8. 完成状态检测与下一章节/下一课程
  // =========================================================

  function isCourseFinished() {
    // v1.7.15：兼容平台多种课程完成文案（实测不同课程/版本提示不一致，
    // 单一文案匹配不到时只能靠 15s 超时兜底，拖慢跳转）。
    // 注意：本函数每次监控 tick 都会调用，匹配必须限定在“课程级”完成文案，
    // 不能用“已完成学习”这类可能出现在章节/介绍文本里的宽松模式。
    const text = normalizeName(document.body?.innerText || '');
    return /您已完成该课程|已完成该课程|该课程已完成|您已完成本课程|已完成本课程|课程学习已完成|恭喜您完成/.test(text);
  }

  function allChaptersCompleted() {
    const chapters = getChapters();
    return chapters.length > 0 && chapters.every(isChapterCompleted);
  }

  function scheduleCourseFinishCheck() {
    if (!isRunning() || !isDetailPage()) return;

    const id = getCurrentRouteId();
    if (!id) return;

    if (completionWaitTimer && completionWaitId === id) return;

    // v1.7.15：先捕获“是否同一课程的等待”，再执行清理。
    // 轮询链断裂（定时器为 null 但 completionWaitId 仍为本课程）时
    // monitorDetail 会再次调用本函数，若此时重置起点，15s/30s 超时
    // 永远累积不到，“等待平台更新课程状态”会被无限重播、课程卡死不跳转。
    const sameCourseWait =
      completionWaitId === id && completionWaitStartedAt > 0;

    clearCompletionWait();
    completionWaitId = id;

    if (!sameCourseWait) {
      completionWaitStartedAt = Date.now();
    }
    const startedAt = completionWaitStartedAt;

    const waitingForLastChapter =
      lastChapterAckCourseId.toLowerCase() === id.toLowerCase() &&
      lastChapterAckTime > 0;

    if (waitingForLastChapter) {
      setMessage('最后一节已确认，等待平台更新课程状态（最长 30 秒）');
    } else {
      setMessage('检测到章节均已完成，等待平台更新状态');
    }

    function checkCompletion() {
      completionWaitTimer = null;

      try {
        // 用户主动暂停：退出并清理（有意的终局）。
        if (!isRunning()) {
          completionWaitId = '';
          return;
        }

        const currentId = getCurrentRouteId();

        // SPA 在提交完成状态时 hash 可能瞬态变化（如瞬时跳列表再跳回），
        // 此时不断链、不退出，继续等待；持续非本课程才退出。
        if (currentId && currentId.toLowerCase() !== id.toLowerCase()) {
          completionWaitId = '';
          return;
        }

        if (isExamPage()) {
          completionWaitId = '';
          pauseAuto('检测到考试/测验页面，已暂停');
          return;
        }

        // 只有平台明确显示课程完成，才确认进入下一门。
        if (isCourseFinished()) {
          completionWaitId = '';
          lastChapterAckInProgress = false;
          clearLastChapterAck();
          finishCurrentCourse();
          return;
        }

        const elapsed = Date.now() - startedAt;

        // 最后一节弹窗已确认：等待平台更新，超时后若所有章节均已完成则进入下一课。
        if (waitingForLastChapter) {
          if (elapsed < LAST_CHAPTER_WAIT_TIMEOUT) {
            completionWaitTimer = setTimeout(checkCompletion, 1500);
            return;
          }

          lastChapterAckInProgress = false;
          completionWaitId = '';

          if (allChaptersCompleted()) {
            setMessage(
              '最后一节已确认且所有章节均已完成，正在进入下一课'
            );

            console.log('[铁塔助手] 最后一节完成状态已确认，准备进入下一课', {
              courseId: id,
              elapsed,
              chaptersCompleted: true
            });

            clearLastChapterAck();
            finishCurrentCourse();
            return;
          }

          // v1.7.15：平台超时未更新章节状态。先刷新页面重查一次
          // （确认态已持久化，刷新后恢复）；已刷新过仍超时则凭
          // “弹窗已确认 + 视频已播完”的硬事实强制进入下一课，
          // 避免卡在等待消息里永不跳转。
          if (courseFinishReloadTries < 1) {
            courseFinishReloadTries++;
            setMessage(
              `最后一节确认后平台未更新章节状态，正在刷新页面重新确认` +
              `（第 ${courseFinishReloadTries} 次）`
            );
            setTimeout(() => {
              if (isRunning()) location.reload();
            }, 800);
            return;
          }

          console.warn('[铁塔助手] 刷新后平台仍未更新章节状态，按已确认完结处理', {
            courseId: id,
            elapsed
          });
          setMessage('平台状态更新异常，按课程已完结强制进入下一课');
          clearLastChapterAck();
          finishCurrentCourse();
          return;
        }

        // 普通课程（无弹窗、直接完结）：等待平台更新完成状态，超时后若所有章节
        // 确实已完成，同样视为课程完结并进入下一门，修复“直接完结”课程卡住不跳转。
        if (elapsed < NORMAL_FINISH_WAIT) {
          completionWaitTimer = setTimeout(checkCompletion, 1500);
          return;
        }

        completionWaitId = '';

        if (allChaptersCompleted()) {
          setMessage('所有章节均已完成（平台未弹窗但状态已稳定），正在进入下一课');
          console.log('[铁塔助手] 直接完结课程已确认，准备进入下一课', {
            courseId: id,
            elapsed,
            chaptersCompleted: true
          });
          finishCurrentCourse();
          return;
        }

        // v1.7.15：同样给一次刷新重查机会，之后按已完结强制进入下一课。
        if (courseFinishReloadTries < 1) {
          courseFinishReloadTries++;
          setMessage(
            `课程章节状态未更新，正在刷新页面重新确认（第 ${courseFinishReloadTries} 次）`
          );
          setTimeout(() => {
            if (isRunning()) location.reload();
          }, 800);
          return;
        }

        console.warn('[铁塔助手] 刷新后章节状态仍异常，按课程已完结处理', {
          courseId: id,
          elapsed
        });
        setMessage('平台状态更新异常，按课程已完结强制进入下一课');
        finishCurrentCourse();
      } catch (error) {
        // v1.7.15：轮询回调任何异常都不得断裂定时器链（断裂后会被
        // monitorDetail 重启并重置计时，导致超时逻辑永远走不到）。
        console.warn('[铁塔助手] 完结状态检查异常，继续等待', error);

        // 若异常持续到超时仍无法收尾，按课程已完结强制进入下一课，
        // 保证任何情况下都不会永久卡在等待消息里。
        const hardDeadline = Math.max(LAST_CHAPTER_WAIT_TIMEOUT, NORMAL_FINISH_WAIT) + 5000;
        if (Date.now() - startedAt > hardDeadline) {
          setMessage('平台状态检查持续异常，按课程已完结强制进入下一课');
          if (waitingForLastChapter) clearLastChapterAck();
          finishCurrentCourse();
          return;
        }

        completionWaitTimer = setTimeout(checkCompletion, 1500);
      }
    }

    completionWaitTimer = setTimeout(checkCompletion, 1500);
  }

  function goNextChapter() {
    if (!isRunning() || manualControlActive() || chapterClickLock) return;

    const chapters = getChapters();
    const active = getActiveChapter();

    if (!active || !isChapterCompleted(active)) return;

    writePptRefresh(getCurrentRouteId(), getChapterName(active), 0);

    const index = chapters.indexOf(active);

    for (let i = index + 1; i < chapters.length; i++) {
      const next = chapters[i];

      if (isChapterCompleted(next)) continue;

      if (isExamChapter(next)) {
        pauseAuto(`下一章节是考试/测验：${getChapterName(next)}，已暂停`);
        return;
      }

      clickChapter(next, '当前章节已完成');
      return;
    }

    if (chapters.length && chapters.every(isChapterCompleted)) {
      scheduleCourseFinishCheck();
    }
  }

  function readPptRefresh(courseId, chapterName) {
    try {
      const data = JSON.parse(localStorage.getItem(PPT_REFRESH_KEY) || '{}');
      const key = `${courseId || ''}|${normalizeName(chapterName)}`;
      return Number(data[key] || 0);
    } catch (_) {
      return 0;
    }
  }

  function writePptRefresh(courseId, chapterName, count) {
    try {
      const data = JSON.parse(localStorage.getItem(PPT_REFRESH_KEY) || '{}');
      const key = `${courseId || ''}|${normalizeName(chapterName)}`;

      if (count > 0) data[key] = count;
      else delete data[key];

      localStorage.setItem(PPT_REFRESH_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function isNonVideoContent() {
    if (!isDetailPage()) return false;

    const active = getActiveChapter();
    if (!active || isChapterCompleted(active)) return false;
    if (getVideo()) return false;
    if (isExamChapter(active)) return false;

    return true;
  }

  function monitorPptLoad() {
    if (!isRunning() || !isNonVideoContent()) {
      pptStuckStart = 0;
      pptStuckKey = '';
      return false;
    }

    const courseId = getCurrentRouteId();
    const active = getActiveChapter();
    const chapterName = getChapterName(active);
    const key = `${courseId}|${chapterName}`;

    if (key !== pptStuckKey) {
      pptStuckKey = key;
      pptStuckStart = Date.now();
      pptRefreshCount = readPptRefresh(courseId, chapterName);
    }

    const elapsed = Date.now() - pptStuckStart;

    if (elapsed > PPT_STUCK_THRESHOLD) {
      if (pptRefreshCount < 2) {
        pptRefreshCount++;
        writePptRefresh(courseId, chapterName, pptRefreshCount);

        setMessage(
          `PPT/文档章节加载异常或超时（${Math.round(elapsed / 1000)}s），` +
          `正在刷新页面重试（第 ${pptRefreshCount} 次）`
        );

        setTimeout(() => {
          if (isRunning()) location.reload();
        }, 1000);

        return true;
      }

      pauseAuto('PPT/文档章节多次刷新仍无法完成，已暂停');
      return true;
    }

    return false;
  }

  function bindVideoEnded() {
    const video = getVideo();

    if (!video || video.dataset.towerStudyBound === '1') return;
    video.dataset.towerStudyBound = '1';

    video.addEventListener('ended', () => {
      if (!isRunning()) return;

      setMessage('视频播放结束，等待平台更新完成状态');

      let attempts = 0;

      const timer = setInterval(() => {
        if (!isRunning()) {
          clearInterval(timer);
          return;
        }

        attempts++;

        const active = getActiveChapter();

        if (active && isChapterCompleted(active)) {
          clearInterval(timer);
          goNextChapter();
        } else if (attempts >= 120) {
          clearInterval(timer);
          setMessage('视频结束，但平台尚未标记完成；不会直接跳过该章节');
        }
      }, 1000);
    });
  }

  function monitorDetail() {
    if (!isRunning() || !isDetailPage()) return;

    if (isExamPage()) {
      pauseAuto('检测到考试/测验页面，已暂停');
      return;
    }

    // v1.7.15：刷新页面后 hash 不变、handleRouteChange 不触发，
    // 这里懒恢复“最后一节已确认”状态，保证完结流程不中断。
    if (!lastChapterAckInProgress) {
      restoreLastChapterAck(getCurrentRouteId());
    }

    if (isProgressSubmitErrorVisible()) {
      setMessage('检测到学习进度提交失败提示，正在关闭弹窗后继续学习');
      dismissProgressError();
    }

    if (monitorPptLoad()) return;

    if (handleLastChapterPrompt()) return;

    if (handleSpeedNotice()) return;

    if (isCourseFinished()) {
      finishCurrentCourse();
      return;
    }

    const chapters = getChapters();
    if (!chapters.length) return;

    bindVideoEnded();
    bindRateGuard(getVideo());

    const playingVideo = getVideo();
    if (playingVideo && videoIsPlaying(playingVideo)) {
      removePlayOverlayWhenPlaying();
      applyPlaybackRate();
      updateDebugHeartbeat(playingVideo);
    }

    if (manualControlActive()) {
      const active = getActiveChapter();
      if (active && !isChapterCompleted(active)) ensurePlayback();
      return;
    }

    const learning = chapters.find(isChapterLearning);

    if (learning && getActiveChapter() !== learning) {
      clickChapter(learning, '自动定位学习中章节');
      return;
    }

    const active = getActiveChapter();

    if (!active) {
      if (allChaptersCompleted()) {
        scheduleCourseFinishCheck();
      } else {
        selectInitialChapter();
      }
      return;
    }

    if (isChapterCompleted(active)) {
      goNextChapter();
      return;
    }

    if (allChaptersCompleted()) {
      scheduleCourseFinishCheck();
      return;
    }

    const key = `${getChapterName(active)}|${getChapterStatus(active)}`;

    if (key !== lastAutoChapter) {
      lastAutoChapter = key;
      ensurePlayback();
    } else {
      const video = getVideo();
      if (video && video.paused && !video.ended) ensurePlayback();
    }
  }

  function finishCurrentCourse() {
    if (!isRunning() || finishingCourse) return;

    const id = getCurrentRouteId();

    if (!id) {
      setMessage('无法确认当前课程 ID，暂不跳转');
      return;
    }

    const active = getActiveChapter();
    if (active) writePptRefresh(id, getChapterName(active), 0);

    if (finishAttemptId !== id) {
      finishAttemptId = id;
      finishAttemptCount = 0;
    }

    const index = findQueueIndexById(id);

    const alreadyVisited = state.visited.some(v =>
      String(v).toLowerCase() === id.toLowerCase()
    );

    if (index >= state.queueIndex) {
      state.queueIndex = index + 1;
    } else if (index < 0 && !alreadyVisited) {
      // v1.7.15：不在队列的课程（典型：用户手动打开的详情页，或构建队列
      // 后才出现的课程）此前直接 return 停死，面板永远停在“重新核对队列”，
      // 不关标签也不开下一门。现按“已看完”继续走队列。
      console.warn('[铁塔助手] 当前课程不在自动队列中，按已看完继续队列', {
        courseId: id
      });
    }

    if (!alreadyVisited) state.visited.push(id);

    state.currentId = id;
    saveState();
    finishingCourse = true;
    clearCompletionWait();

    if (lastChapterAckCourseId.toLowerCase() === id.toLowerCase()) {
      clearLastChapterAck();
    }
    setMessage('当前课程已完成，正在准备进入下一门课程');

    setTimeout(() => {
      finishingCourse = false;
      if (!isRunning()) return;

      const latestIndex = findQueueIndexById(id);
      if (latestIndex >= state.queueIndex) state.queueIndex = latestIndex + 1;

      saveState();
      openNextCourse();
    }, 1200);
  }

  // =========================================================
  // 9. 队列、跳过名单、分页
  // =========================================================

  function buildQueue() {
    const courses = getCourseList();

    if (!courses.length) {
      setMessage('没有识别到课程卡片，请等待列表加载');
      return false;
    }

    const skipped = courses.filter(item => shouldSkipCourse(item));
    const completed = courses.filter(item => item.status === 'completed');

    const candidates = courses.filter(item =>
      item.status !== 'completed' && !shouldSkipCourse(item)
    );

    // 优先学习学时低的课程，省时间；学时相同时按学分、章节数升序。
    candidates.sort((a, b) => {
      const ha = parseFloat(a.hours) || 9999;
      const hb = parseFloat(b.hours) || 9999;
      if (ha !== hb) return ha - hb;
      const ca = parseFloat(a.credit) || 9999;
      const cb = parseFloat(b.credit) || 9999;
      if (ca !== cb) return ca - cb;
      return (parseInt(a.chapters, 10) || 9999) - (parseInt(b.chapters, 10) || 9999);
    });

    const missing = candidates.filter(item => !item.id);

    if (missing.length) {
      setMessage(`当前页有 ${missing.length} 门待学习课程尚未识别 ID，请等待页面接口加载`);
      console.warn('[铁塔助手] 未识别 ID 的待学习课程：', missing.map(item => item.name));
      return false;
    }

    state.queue = candidates.map(({ name, id, hours, credit, chapters }) => ({
      name, id, hours, credit, chapters
    }));
    state.queueIndex = 0;
    state.visited = [];
    state.currentId = '';
    saveState();

    if (!state.queue.length) {
      setMessage(`当前页无需学习：已完成 ${completed.length} 门，跳过 ${skipped.length} 门`);
      return true;
    }

    const unknownCount = candidates.filter(item => item.status === 'unknown').length;

    setMessage(
      `已过滤 ${completed.length} 门已完成课程、${skipped.length} 门跳过课程；` +
      `待学习 ${state.queue.length} 门（已按学时从低到高排序，优先省时课程）` +
      (unknownCount ? `（${unknownCount} 门状态未识别，已保留）` : '')
    );

    console.log('[铁塔助手] 待学习队列：', state.queue);
    console.log('[铁塔助手] 已完成课程：', completed.map(item => item.name));
    console.log('[铁塔助手] 跳过课程：', skipped.map(item => item.name));

    return true;
  }

  function openCourseInNewTab(item) {
    if (!item || !isUuid(item.id)) return false;

    if (shouldSkipCourse(item)) {
      setMessage(`已阻止打开跳过课程：${item.name}`);
      return false;
    }

    state.currentId = item.id;
    lastClickedCourseName = item.name;
    saveState();

    const url =
      `${location.origin}${location.pathname}${location.search}` +
      `#/onlineDetail/${item.id}`;

    const tab = window.open(url, '_blank');

    if (tab) {
      try {
        window.__towerStudyDetailTab = tab;
        tab.__towerStudyOpenedAt = Date.now();
      } catch (_) {}

      setMessage(`已在新标签页打开：${item.name}`);
      return true;
    }

    setMessage('新标签页被浏览器拦截，请允许此站点弹出窗口');
    return false;
  }

  function signalListToOpenNext() {
    // 由播放（子）标签调用：通知课程列表标签去刷新并打开下一门，然后关闭自身。
    // 这样每门新课程都从列表标签重新打开一个全新标签页，避免在同一播放页内
    // 直接切换课程导致“服务器异常”。
    if (!isRunning()) {
      try { window.close(); } catch (_) {}
      return;
    }

    const payload = { ts: Date.now(), action: 'openNext' };
    let ackReceived = false;

    // 安装一次性 ack 监听器：列表页收到信号后会回发 ack，收到后再关闭，
    // 避免过早关闭导致信号丢失。
    function onAck(event) {
      const data = event && event.data;
      if (data && data.type === 'towerStudyNextAck') {
        ackReceived = true;
        window.removeEventListener('message', onAck);
        try { window.close(); } catch (_) {}
      }
    }

    try { window.addEventListener('message', onAck); } catch (_) {}

    try {
      localStorage.setItem(NEXT_REQUEST_KEY, JSON.stringify(payload));
    } catch (_) {}

    // 多次尝试 postMessage，提高信号送达率。
    let postAttempts = 0;
    const postTimer = setInterval(() => {
      postAttempts++;

      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: 'towerStudyNextRequest', action: 'openNext' }, '*'
          );
          window.opener.focus();
        }
      } catch (_) {}

      if (ackReceived || postAttempts >= 4) {
        clearInterval(postTimer);
      }
    }, 120);

    // 超时兜底：即使没收到 ack，最多 900ms 后也关闭自身。
    setTimeout(() => {
      try { window.removeEventListener('message', onAck); } catch (_) {}
      try { clearInterval(postTimer); } catch (_) {}

      if (!window.closed) {
        try { window.close(); } catch (_) {}
      }

      // 若仍无法关闭，退回原地切换哈希。
      setTimeout(() => {
        try {
          if (!window.closed && state.currentId) {
            location.hash = `#/onlineDetail/${state.currentId}`;
          }
        } catch (_) {}
      }, 400);
    }, 900);
  }

  function openNextCourse() {
    if (!isRunning()) return;

    while (state.queueIndex < state.queue.length) {
      const item = state.queue[state.queueIndex];

      if (!item || !isUuid(item.id)) {
        state.queueIndex++;
        continue;
      }

      if (shouldSkipCourse(item)) {
        console.warn('[铁塔助手] 队列中发现跳过课程：', item.name);
        state.queueIndex++;
        continue;
      }

      if (state.visited.some(v =>
        String(v).toLowerCase() === item.id.toLowerCase()
      )) {
        state.queueIndex++;
        continue;
      }

      // v1.7.15：打开前实时核对列表卡片状态。队列构建后平台状态可能已
      // 变化，或构建时被识别为 unknown 的已完成课程会被误开——进去后只能
      // 走完结流程白等超时。这里在列表页按 ID 找到当前卡片复核状态。
      if (isListPage()) {
        try {
          const live = getCourseList().find(c =>
            c.id && c.id.toLowerCase() === item.id.toLowerCase()
          );

          if (live && live.status === 'completed') {
            console.warn('[铁塔助手] 打开前发现课程已完成，跳过：', item.name);
            setMessage(`跳过已完成的课程：${item.name}`);
            state.queueIndex++;
            saveState();
            continue;
          }
        } catch (_) {}
      }

      state.currentId = item.id;
      saveState();

      if (isDetailPage()) {
        // 修复：在播放页（子标签）内直接切换哈希跳下一课，新课程播放一会儿后
        // 容易报“服务器异常”。改为关闭本播放标签，让课程列表标签刷新后重新
        // 打开新课程。仅当本页由列表页通过 window.open 打开（存在 opener）时
        // 走此路径；手动打开的详情页退化为原地切换哈希。
        if (window.opener && !window.opener.closed) {
          signalListToOpenNext();
          return;
        }
        location.hash = `#/onlineDetail/${item.id}`;
        return;
      }

      if (openCourseInNewTab(item)) return;
      return;
    }

    if (tryNextPage()) return;

    pauseAuto('当前页未完成课程队列已处理完，未找到可用的下一页');
  }

  function tryNextPage() {
    const buttons = [...document.querySelectorAll(
      'button, a, .el-pagination button, .el-pagination li'
    )];

    const next = buttons.find(el => {
      const text = normalizeName(el.innerText || el.textContent || '');
      const aria = normalizeName(el.getAttribute('aria-label') || '');
      const title = normalizeName(el.getAttribute('title') || '');

      const matches =
        /^(下一页|下页|next|›|»)$/i.test(text) ||
        /下一页|next/i.test(aria) ||
        /下一页|next/i.test(title);

      const disabled =
        el.disabled ||
        el.hasAttribute('disabled') ||
        el.classList.contains('disabled') ||
        el.getAttribute('aria-disabled') === 'true';

      return matches && !disabled;
    });

    if (!next) return false;

    const before = getCourseList().map(item => item.name).join('|');
    next.click();
    setMessage('正在切换到下一页');

    let attempts = 0;

    const timer = setInterval(() => {
      if (!isRunning()) {
        clearInterval(timer);
        return;
      }

      attempts++;

      const after = getCourseList().map(item => item.name).join('|');

      if (after && after !== before) {
        clearInterval(timer);

        setTimeout(() => {
          if (!isRunning()) return;

          if (!buildQueue()) {
            pauseAuto('新页面课程 ID 尚未识别完成，请稍后刷新识别');
            return;
          }

          state.pageNumber++;
          saveState();

          if (state.queue.length) {
            openNextCourse();
          } else {
            setMessage('当前页没有需要学习的课程，继续寻找下一页');

            if (!tryNextPage()) {
              pauseAuto('后续页面没有可继续学习的课程');
            }
          }
        }, 1800);
      } else if (attempts >= 20) {
        clearInterval(timer);
        pauseAuto('翻页后课程列表没有变化，请检查分页');
      }
    }, 500);

    return true;
  }

  // =========================================================
  // 10. 控制面板：手动跳过、最小化、拖动、调整大小
  // =========================================================

  function readPanelUi() {
    try {
      const data = JSON.parse(localStorage.getItem(PANEL_UI_KEY) || '{}');
      return data && typeof data === 'object' ? data : {};
    } catch (_) {
      return {};
    }
  }

  function savePanelUi(patch = {}) {
    const current = readPanelUi();
    const panel = document.getElementById(PANEL_ID);

    if (panel) {
      const rect = panel.getBoundingClientRect();

      Object.assign(current, {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    }

    Object.assign(current, patch);

    try {
      localStorage.setItem(PANEL_UI_KEY, JSON.stringify(current));
    } catch (_) {}
  }

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      #${PANEL_ID} {
        position:fixed;top:90px;right:18px;z-index:2147483647;
        width:340px;height:auto;max-height:78vh;min-width:280px;
        min-height:100px;overflow:auto;resize:both;
        background:#fff;color:#222;border:1px solid #ddd;
        border-radius:10px;box-shadow:0 4px 18px #0002;
        padding:12px;font:13px/1.5 Arial,sans-serif;
      }
      #${PANEL_ID} * {box-sizing:border-box}
      #${PANEL_ID} .tsh-header {
        display:flex;align-items:center;justify-content:space-between;
        gap:8px;margin:-2px 0 8px;cursor:move;user-select:none;
        touch-action:none;
      }
      #${PANEL_ID} .tsh-title {
        font-size:14px;font-weight:700;overflow-wrap:anywhere
      }
      #${PANEL_ID} .tsh-header-buttons {
        display:flex;gap:4px;flex-shrink:0
      }
      #${PANEL_ID} .tsh-header-buttons button {padding:3px 8px}
      #${PANEL_ID} .tsh-status {
        background:#f5f6f8;border-radius:6px;padding:8px;margin:8px 0;
        overflow-wrap:anywhere
      }
      #${PANEL_ID} .tsh-buttons {
        display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0
      }
      #${PANEL_ID} .tsh-speed {
        display:flex;align-items:center;gap:10px;margin:6px 0 8px;
        padding:6px 8px;background:#f5f6f8;border-radius:6px;font-size:12px
      }
      #${PANEL_ID} .tsh-speed label {
        display:flex;align-items:center;gap:4px;cursor:pointer;user-select:none
      }
      #${PANEL_ID} .tsh-speed select {
        padding:3px 6px;border-radius:4px;border:1px solid #ccc;
        background:#fff;font-size:12px
      }
      #${PANEL_ID} button {
        border:0;border-radius:5px;background:#1677ff;color:#fff;
        padding:7px 5px;cursor:pointer;font-size:12px
      }
      #${PANEL_ID} button.secondary {background:#666}
      #${PANEL_ID} button.tsh-skip {background:#b45309}
      #${PANEL_ID} button.tsh-unskip {background:#16803c}
      #${PANEL_ID} button:disabled {opacity:.6;cursor:not-allowed}
      #${PANEL_ID} .tsh-course {
        border-top:1px solid #eee;padding:7px 0;overflow-wrap:anywhere
      }
      #${PANEL_ID} .tsh-id {
        font-size:11px;color:#666;overflow-wrap:anywhere
      }
      #${PANEL_ID} .tsh-small {
        font-size:11px;color:#666;overflow-wrap:anywhere
      }
      #${PANEL_ID}.tsh-minimized {
        width:280px!important;height:auto!important;min-height:0!important;
        max-height:none!important;resize:none!important;overflow:visible!important;
      }
      #${PANEL_ID}.tsh-minimized .tsh-content {display:none!important}
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function setupPanelDragging(panel) {
    const header = panel.querySelector('.tsh-header');
    if (!header) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    header.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      if (event.button !== 0) return;

      const rect = panel.getBoundingClientRect();

      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.right = 'auto';

      try { header.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    });

    header.addEventListener('pointermove', event => {
      if (!dragging) return;

      const maxLeft = Math.max(0, window.innerWidth - 80);
      const maxTop = Math.max(0, window.innerHeight - 40);

      const left = Math.min(maxLeft, Math.max(
        0, startLeft + event.clientX - startX
      ));

      const top = Math.min(maxTop, Math.max(
        0, startTop + event.clientY - startY
      ));

      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    });

    const stopDragging = () => {
      if (!dragging) return;
      dragging = false;
      savePanelUi();
    };

    header.addEventListener('pointerup', stopDragging);
    header.addEventListener('pointercancel', stopDragging);

    window.addEventListener('resize', () => {
      const rect = panel.getBoundingClientRect();

      if (rect.left > window.innerWidth - 80) {
        panel.style.left = `${Math.max(0, window.innerWidth - rect.width)}px`;
      }

      if (rect.top > window.innerHeight - 40) {
        panel.style.top = `${Math.max(0, window.innerHeight - 40)}px`;
      }
    });
  }

  function restorePanelUi(panel) {
    const ui = readPanelUi();

    if (Number.isFinite(ui.left) && Number.isFinite(ui.top)) {
      panel.style.left = `${Math.max(0, ui.left)}px`;
      panel.style.top = `${Math.max(0, ui.top)}px`;
      panel.style.right = 'auto';
    }

    if (Number.isFinite(ui.width) && ui.width >= 280) {
      panel.style.width = `${ui.width}px`;
    }

    if (Number.isFinite(ui.height) && ui.height >= 100) {
      panel.style.height = `${ui.height}px`;
    }

    if (ui.minimized) panel.classList.add('tsh-minimized');
  }

  function createPanel() {
    if (!document.body || document.getElementById(PANEL_ID)) return;

    addStyle();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    panel.innerHTML = `
      <div class="tsh-header">
        <div class="tsh-title">铁塔 e 学自动学习助手 v${VERSION}</div>
        <div class="tsh-header-buttons">
          <button id="tsh-minimize" class="secondary" title="最小化或展开">−</button>
        </div>
      </div>
      <div class="tsh-content">
        <div class="tsh-status" id="tsh-status"></div>
        <div class="tsh-small" id="tsh-route"></div>
        <div class="tsh-buttons">
          <button id="tsh-start">开始学习</button>
          <button id="tsh-pause" class="secondary">暂停</button>
          <button id="tsh-refresh" class="secondary">刷新识别</button>
          <button id="tsh-export" class="secondary">导出 ID</button>
        </div>
        <div class="tsh-speed" id="tsh-speed">
          <label for="tsh-speed-enable" title="开启后，播放页会自动设置 HTML5 视频倍速">
            <input type="checkbox" id="tsh-speed-enable"> 倍速播放
          </label>
          <select id="tsh-speed-rate" title="倍速档位">
            <option value="1">1.0x（正常）</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>
        <div class="tsh-speed">
          <label for="tsh-title-debug" title="开启后标签页标题会显示播放状态（倍速/进度/章节），便于远程监控；默认关闭，此时标签名与未安装插件时完全一致">
            <input type="checkbox" id="tsh-title-debug"> 标题调试
          </label>
        </div>
        <div class="tsh-small" id="tsh-count"></div>
        <div id="tsh-courses"></div>
      </div>
    `;

    document.body.appendChild(panel);
    restorePanelUi(panel);
    setupPanelDragging(panel);

    panel.querySelector('#tsh-minimize').addEventListener('click', () => {
      const minimized = panel.classList.toggle('tsh-minimized');

      panel.querySelector('#tsh-minimize').textContent = minimized ? '+' : '−';
      savePanelUi({ minimized });
    });

    panel.querySelector('#tsh-start').addEventListener('click', startAutoLearning);

    panel.querySelector('#tsh-pause').addEventListener('click', () => {
      pauseAuto('用户手动暂停');
    });

    panel.querySelector('#tsh-refresh').addEventListener('click', () => {
      lastListSignature = '';
      refreshPanel();
      setMessage('已刷新课程识别结果');
    });

    panel.querySelector('#tsh-export').addEventListener('click', () => {
      const blob = new Blob(
        [JSON.stringify(readStore(), null, 2)],
        { type: 'application/json;charset=utf-8' }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = 'tower-course-ids.json';
      a.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    const speedEnable = panel.querySelector('#tsh-speed-enable');
    const speedRate = panel.querySelector('#tsh-speed-rate');

    if (speedEnable) {
      speedEnable.addEventListener('change', () => {
        state.speedEnabled = speedEnable.checked;
        saveState();
        if (state.speedEnabled) {
          applyPlaybackRate();
          setMessage(`已开启倍速播放：${state.playbackRate || 1}x`);
        } else {
          // v1.7.12：关闭开关时显式恢复常速，
          // 否则播放器停留在关闭前的倍速（与"切回 1x 不生效"同类问题）
          resetPlaybackRate();
          setMessage('已关闭倍速播放');
        }
        refreshPanel();
      });
    }

    if (speedRate) {
      speedRate.addEventListener('change', () => {
        state.playbackRate = parseFloat(speedRate.value) || 1;
        saveState();
        if (state.speedEnabled) {
          applyPlaybackRate();
          setMessage(`倍速档位已切换为：${state.playbackRate}x`);
        }
        refreshPanel();
      });
    }

    const titleDebug = panel.querySelector('#tsh-title-debug');

    if (titleDebug) {
      titleDebug.addEventListener('change', () => {
        state.titleDebug = titleDebug.checked;
        saveState();
        if (state.titleDebug) {
          setMessage('已开启标题调试：标签页标题将显示播放状态');
        } else {
          // 关闭时立即还原平台原标题，标签名恢复与无插件一致
          restorePlatformTitle();
          setMessage('已关闭标题调试：标签名已恢复平台默认');
        }
        refreshPanel();
      });
    }

    if (window.ResizeObserver) {
      let resizeSaveTimer = null;

      new ResizeObserver(() => {
        if (panel.classList.contains('tsh-minimized')) return;
        if (resizeSaveTimer) clearTimeout(resizeSaveTimer);
        resizeSaveTimer = setTimeout(() => savePanelUi(), 300);
      }).observe(panel);
    }

    refreshPanel();
  }

  function refreshPanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    const status = panel.querySelector('#tsh-status');
    const route = panel.querySelector('#tsh-route');
    const count = panel.querySelector('#tsh-count');
    const list = panel.querySelector('#tsh-courses');
    const speedEnable = panel.querySelector('#tsh-speed-enable');
    const speedRate = panel.querySelector('#tsh-speed-rate');
    const titleDebug = panel.querySelector('#tsh-title-debug');

    if (!status || !route || !count || !list) return;

    if (speedEnable) speedEnable.checked = Boolean(state.speedEnabled);
    if (speedRate) speedRate.value = String(state.playbackRate || 1);
    if (titleDebug) titleDebug.checked = Boolean(state.titleDebug);

    status.textContent =
      `${isRunning() ? '运行中' : '已暂停'}：` +
      `${lastMessage || state.message || '等待操作'}`;

    route.textContent =
      `页面：${isDetailPage() ? '课程详情' : '课程列表'}；` +
      `课程 ID：${getCurrentRouteId() || '无'}`;

    const courses = getCourseList();
    const store = readStore();
    const manualSkip = readManualSkip();

    const completedCount = courses.filter(item =>
      item.status === 'completed'
    ).length;

    const unknownCount = courses.filter(item =>
      item.status === 'unknown'
    ).length;

    const skippedCount = courses.filter(item =>
      shouldSkipCourse(item)
    ).length;

    const manualSkippedCount = courses.filter(item =>
      isManuallySkipped(item)
    ).length;

    count.textContent =
      `当前页 ${courses.length} 门；已完成 ${completedCount} 门；` +
      `跳过 ${skippedCount} 门（手动标记）；` +
      `状态未知 ${unknownCount} 门；已保存 ${Object.keys(store).length} 条 ID；` +
      `手动跳过记录 ${Object.keys(manualSkip).length} 条`;

    list.innerHTML = '';

    // 已完成的课程不再逐条显示，减少面板冗余碍眼。
    courses
      .filter(item => item.status !== 'completed')
      .forEach(item => {
      const row = document.createElement('div');
      row.className = 'tsh-course';

      const name = document.createElement('div');
      name.textContent = item.name;

      const statusNode = document.createElement('div');
      statusNode.className = 'tsh-small';

      if (isManuallySkipped(item)) {
        statusNode.textContent = '课程状态：已手动标记跳过';
      } else {
        statusNode.textContent = ({
          completed: '课程状态：已完成（队列会跳过）',
          unfinished: '课程状态：未完成',
          unknown: '课程状态：未识别（暂时保留）'
        })[item.status];
      }

      const id = document.createElement('div');
      id.className = 'tsh-id';
      id.textContent = item.id || '尚未识别 ID';

      const meta = document.createElement('div');
      meta.className = 'tsh-small';

      const metaParts = [];
      if (item.credit) metaParts.push(`学分：${item.credit}`);
      if (item.hours) metaParts.push(`学时：${item.hours}`);
      if (item.chapters) metaParts.push(`章节：${item.chapters}`);
      meta.textContent = metaParts.join(' · ') || '学分/学时/章节：未识别';

      const openButton = document.createElement('button');
      openButton.textContent = '打开课程';
      openButton.style.marginTop = '4px';
      openButton.style.marginRight = '5px';

      if (shouldSkipCourse(item)) {
        openButton.disabled = true;
        openButton.style.background = '#888';
      } else {
        openButton.addEventListener('click', () => {
          if (!item.id) {
            lastClickedCourseName = item.name;
            setMessage(`该课程尚未识别 ID：${item.name}`);
            return;
          }
          openCourseInNewTab(item);
        });
      }

      const skipButton = document.createElement('button');
      const manuallySkipped = isManuallySkipped(item);

      skipButton.textContent = manuallySkipped ? '取消跳过' : '标记跳过学习';
      skipButton.className = manuallySkipped ? 'tsh-unskip' : 'tsh-skip';
      skipButton.style.marginTop = '4px';

      skipButton.addEventListener('click', () => {
        toggleManualSkip(item);
        setMessage(
          manuallySkipped
            ? `已取消跳过标记：${item.name}`
            : `已标记跳过学习：${item.name}`
        );
      });

      row.append(name, statusNode, meta, id, openButton, skipButton);
      list.appendChild(row);
    });
  }

  // =========================================================
  // 11. 启动和路由变化
  // =========================================================

  function startAutoLearning() {
    pauseRequested = false;
    state.running = true;

    saveState();
    resumeTimers();

    if (isDetailPage()) {
      state.currentId = getCurrentRouteId();
      saveState();

      lastAutoChapter = '';
      setMessage('已启动：定位学习中章节');

      setTimeout(() => {
        if (isRunning()) selectInitialChapter();
      }, 500);

      return;
    }

    if (!isListPage()) {
      pauseAuto('请先进入课程列表页面');
      return;
    }

    if (!buildQueue()) {
      pauseAuto(lastMessage || '课程列表尚未准备好');
      return;
    }

    if (!state.queue.length) {
      setMessage('当前页没有需要学习的课程，正在寻找下一页');

      if (!tryNextPage()) {
        pauseAuto('当前页没有需要学习的课程，且没有可用的下一页');
      }
      return;
    }

    setMessage('自动学习已启动');
    openNextCourse();
  }

  function handleRouteChange() {
    if (location.hash === lastRoute) return;
    lastRoute = location.hash;

    if (detailTimer) {
      clearInterval(detailTimer);
      detailTimer = null;
    }

    clearCompletionWait();

    lastAutoChapter = '';
    chapterClickLock = false;
    finishingCourse = false;
    playbackStarting = false;
    finishAttemptId = '';
    finishAttemptCount = 0;
    courseFinishReloadTries = 0;

    lastChapterAckCourseId = '';
    lastChapterAckTime = 0;
    lastChapterAckInProgress = false;

    if (isDetailPage() && isRunning()) {
      // v1.7.15：恢复“最后一节已确认”状态（刷新页面前由 saveLastChapterAck
      // 持久化），避免刷新后丢失确认态又重新弹一次或漏跑完结流程。
      restoreLastChapterAck(getCurrentRouteId());

      setMessage('进入课程详情页，正在识别学习中章节');

      setTimeout(() => {
        if (!isRunning()) return;

        const currentId = getCurrentRouteId();
        const index = findQueueIndexById(currentId);

        if (index >= state.queueIndex) {
          state.queueIndex = index;
          state.currentId = currentId;
          saveState();
        }

        selectInitialChapter();
      }, 700);

      detailTimer = setInterval(monitorDetail, 1200);
    }

    refreshPanel();
  }

  function init() {
    if (initialized) return;
    initialized = true;

    createPanel();
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('message', event => {
      const data = event.data;
      if (data && data.type === 'towerStudyNextRequest' &&
          data.action === 'openNext') {
        handleNextRequest();
      }
    });

    handleRouteChange();

    if (isRunning()) resumeTimers();

    // 由播放页完成信号触发的刷新后，自动打开下一门课程。
    if (isRunning() && isListPage() && state.resumeOpenNext) {
      state.resumeOpenNext = false;
      saveState();
      setTimeout(() => {
        if (!isRunning()) return;
        setMessage('正在打开下一门课程');
        openNextCourse();
      }, 1500);
    }

    setInterval(() => {
      if (!document.getElementById(PANEL_ID)) createPanel();
      if (location.hash !== lastRoute) handleRouteChange();
      handleNextRequest();
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
