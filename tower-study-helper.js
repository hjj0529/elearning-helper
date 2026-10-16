// ==UserScript==
// @name         铁塔 e 学自动学习助手
// @namespace    tower-study-helper
// @version      1.7.38
// @description  自动识别课程ID、过滤已完成和跳过课程、自动播放切换章节；支持分页、新标签页、面板拖动缩放及最后一节弹窗自动确认；修复“直接完结”课程不跳转问题，播放页完结后关闭并回列表刷新再开新课；面板显示学分/学时/章节，移除系统异常跳过名单，默认跳过末节考试课程，PPT章节加载失败自动刷新；增强播放页与列表页信号可靠性；v1.7.3 适配新版(/new/student)接口探查与 ID 识别；v1.7.4 课程列表面板不再逐条显示已完成的课程，减少冗余；v1.7.5 移除面板"捕获接口"文本显示（静默写入 localStorage 供调试）；v1.7.6 调试数据额外写入屏幕外不可见 span(#tsh-debug)；v1.7.7 调试数据额外写入页面标题(TSHDBG:前缀)，便于外部读取定位新版接口与ID字段格式；v1.7.8 移除标题调试，新增倍速播放开关与档位（默认关闭，仅对 HTML5 视频生效）；v1.7.9 恢复轻量标题调试(TSH:前缀，仅标签标题非面板)用于外部监控，倍速被平台重置时自动恢复并计数以观测验证机制；v1.7.10 修正面板标题版本号与运行时 guard 保持一致；v1.7.11 播放页标题心跳改为 5 秒节流（关键字段变化仍即时刷新），并修复详情页进度接口冲刷 page 字段，便于外部 claim/截图标签页；v1.7.12 修复倍速档位切回 1x 不生效（播放器停留在原倍速）及关闭倍速开关不恢复常速的问题，新增首次开启倍速时平台提示弹窗（学习时长按实际学习时间统计，不受倍速切换影响）的自动确认；v1.7.13 修复播放中标签页无法被外部 claim/截图的问题（详情页标题改由播放心跳独占，接口日志不再每秒级改写标题；心跳节流 5s→15s，倍速/状态变化仍即时刷新）；v1.7.14 标题调试默认关闭（标签名与未安装插件时完全一致），面板新增"标题调试"开关，开启后才以可读格式在标签页标题显示播放状态，关闭时立即还原平台原标题；v1.7.15 修复"最后一节弹窗确认后卡在等待平台更新课程状态、不关标签不开新课"：完结轮询链断裂后重启会重置 30 秒计时导致超时分支永远走不到，现改为同一课程等待起点不重置、轮询链异常/路由瞬空不再断裂，超时后平台未更新章节状态则刷新页面重查，仍超时则凭"弹窗已确认+视频已播完"强制进入下一课；v1.7.18 新增课程列表页会话保活：默认开启、10分钟一次（5-60分钟可调），用 Web Worker 定时器（不受后台标签降频影响）周期性向平台发轻量同源请求维持登录会话，防止挂机一段时间后被平台登出导致无法继续学习；心跳全程纯后台不改标题不碰焦点不影响用户其他工作，仅当检测到登录态失效时告警（标签标题红字+页面红色横幅+尽力弹前台）；v1.7.19 增强自动翻页可靠性：翻页后课程 ID 识别由单次等待改为每 2 秒重试（最长 30 秒）不再立即暂停，翻页点击 25 秒后列表无变化时自动重试一次翻页，慢网络下多页自动学习不再中断；v1.7.20 会话保活改为纯保活模式：移除登录态检测与告警（启发式判定在登录状态良好时误报"登录已失效"横幅，平台真实登出表现为整页跳转 OA 登录页无需插件判定），只保留周期心跳维持会话；v1.7.21 移除面板"标题调试"功能（含播放页写标题心跳等整套逻辑，该功能已无实际作用），标签名恒与平台一致；v1.7.22 修复"视频已在自动播放但面板停留提示'已点击播放按钮，等待播放器响应'"：进场时序留下的等待类陈旧消息在检测到视频确实播放后自动纠正为"正在播放：第N节"；v1.7.23 修复"学完关播放页后清单页未刷新、反复重开刚学完课程"死循环：详情页不再与列表页竞争消费完成信号键、写回状态前先读回最新进度不覆盖、新增独立"本会话已学完"清单硬跳过、列表刷新后等数据稳定+缓冲数秒再重新取状态选下一课；v1.7.24 修复"播放页提示已暂停：当前页未完成课程队列已处理完、不再与列表页互动翻页"回归：播放页队列耗尽时不再就地暂停（避免 running=false 同步给列表页造成全局停摆），改为通知列表页刷新并由列表侧完成选课与翻页；v1.7.25 优化播放器检测机制：PPT/文档章节播放器加载慢时不再立即报"暂未发现可控制的播放器"，先按"加载中"等待 90 秒（每 10 秒刷新已等待秒数）并持续重试，播放器一出现即接管自动播放，播放按钮退化查找范围扩大；v1.7.26 面板新增"选课顺序"下拉：顺序学习（默认，列表页从上到下）/倒序学习/高学时优先/低学时优先，点开始学习后按此顺序构建学习队列，运行中更改会立即重排剩余队列，学完一课后按设定顺序继续；v1.7.27 修复 PPT 章节"有大播放按钮却不点击"问题：无 video/无 play-btn 时先走 PPT 播放器启动流程——播放器区域出现后缓冲 2 秒等就绪再找大播放按钮点击，播放迹象靠按钮消失/暂停控件出现判断，无迹象按 4/8/16/30 秒指数退避重试，找不到控件时打印容器 DOM 供排查；v1.7.28 修复"列表页刷新后分页重置回第 1 页、队列耗尽时从第 1 页逐页重走已完成的页"（页数越多越慢，约 O(N²)）：未运行时以分页器高亮校准页码（人工翻页后开始即从该页起），运行中刷新恢复/队列耗尽时优先"点页码直达"、未渲染目标页码则连续点"下一页"快进（不逐页构建队列）回到目标页再继续；v1.7.29 修复"学习中在列表页改选课顺序、学完下一课仍按旧顺序"：跨标签设置双向同步——任何状态写入都先采纳对端的"选课顺序+队列排序"（队列要求 ID 集合一致），播放页写回前也采纳列表页的新设置不再用旧内存覆盖，倍速/保活等设置写入同样先读回最新状态；v1.7.30 修复"进入播放页页面未加载完就点击播放按钮导致偶发黑屏、长时间停在已点击播放按钮等待响应"：新章节播放按钮延迟 5 秒再点击（等待页面/播放器就绪），并新增播放卡死两级兜底——video 存在但 30 秒未进入播放状态自动刷新播放页，刷新后 60 秒仍未播放则按手动跳过方式标记该课程（面板可取消）并自动续学下一课，计时持久化跨刷新存活；v1.7.31 修复 v1.7.30 误跳过回归（慢网络下大量课程被标记跳过）：卡死计时改为"无加载进展"语义——currentTime 前进/readyState 提升/缓冲增长任一出现即重置计时窗口，仅指纹完全不变（真卡死）才触发刷新；持久化记录超 10 分钟自动过期，跨会话残留不再影响新会话；新增"曾播放成功"标记——学一半中途卡死的课刷新救不回时改为暂停等人工，不再标记跳过，只有从未播上过的课才标记跳过续学；v1.7.32 修复"视频还在播放却提示：视频结束，但平台尚未标记完成；不会直接跳过该章节"：ended 后等待平台标记完成的轮询改为单例定时器（不再多次 ended 叠加），视频恢复播放（平台回跳/拖进度/自动重播）立即自我取消等待，该消息纳入陈旧消息自愈（确认在播即纠正为"正在播放"）；播放按钮延迟点击 5 秒放宽到 10 秒；v1.7.33 修复"视频中途被平台暂停（防挂机人工确认）却误报：视频学习中途卡死且刷新未能恢复，已暂停"：卡死检测新增"健康暂停"判定（暂停+无错误+readyState>=HAVE_FUTURE_DATA+有数据源+缓冲覆盖当前位置即非卡死，点一次播放即可恢复），健康暂停不再刷新页面/标记跳过，改为持续尝试自动恢复（3 分钟窗口），超窗才以准确的"已暂停等人工"消息暂停并保留学习进度；恢复期间面板消息统一由恢复进度占据，视频恢复播放后自愈为"正在播放：第N节"；v1.7.34 新增面板"后台学习"开关（默认开启，纯增量、不影响原有规则）：开启后课程列表页与播放页在同一个标签内完成"后台切换"——开课改为同标签导航到详情页、学完改为同标签导航回列表页并整页加载（复用既有 resumeOpenNext 流程），全程不新开标签、不抢焦点（浏览器无手势/后台打开的标签必然前台，页面脚本无法干预，同标签导航是脚本内唯一可行的后台方式）；关闭开关即完全恢复 v1.7.33 的新标签前台行为（代码路径逐行一致）；v1.7.35 面板新增"返回课程列表"按钮：暂停当前学习并回到课程列表（后台模式下同一标签导航返回，双标签模式下关闭本播放标签回到列表标签，已在列表页时仅提示）；v1.7.36 "后台学习"开关跨标签双向同步：在哪个页面（标签）改都生效——另一标签通过 storage 事件立即采纳并在面板给出提示，写回状态前也先采纳持久化最新值（避免旧内存值把别处刚改的开关覆盖回去，与 v1.7.29 选课顺序同类加固），单标签后台模式下因每次切换都是整页加载，各页面天然读取最新值；v1.7.37 移除面板"导出 ID"按钮（该按钮只是把自动采集的"课程名→课程 ID"库导出成 JSON，属早期逆向平台 ID 格式的排障入口，日常无用；采集与存储逻辑保持不变，排障时可在控制台执行 copy(localStorage.getItem('towerStudyHelperCourseIdsV1')) 导出）；v1.7.38 修复"从第 N 页开课后点返回列表却回到第 1 页"（分页是平台客户端状态、整页加载必然重置）——返回列表时置 restorePageOnReturn 标记，列表页加载后等分页器就绪并按 state.pageNumber 恢复页码（复用 v1.7.28 的恢复逻辑，新增 allowPaused 参数使暂停态也能恢复），同时把面板按钮名"返回课程列表"改为"返回列表"（UI 更整齐）
// @match        https://elearning.chinatowercom.cn/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  if (window.__towerStudyHelper201) return;
  window.__towerStudyHelper201 = true;

  const VERSION = '1.7.38';

  const STORE_KEY = 'towerStudyHelperCourseIdsV1';
  const STATE_KEY = 'towerStudyHelperAutoStateV152';
  const SKIP_KEY = 'towerStudyHelperManualSkipV1';
  // v1.7.23：本会话已学完课程清单（独立 key，不随 STATE_KEY 竞态被覆盖）。
  // 列表卡片状态回传有延迟时，靠它硬性跳过刚学完的课程，杜绝
  // "开→识别已完成→关→再开"的死循环。
  const FINISHED_KEY = 'towerStudyHelperFinishedV1';
  const PANEL_UI_KEY = 'towerStudyHelperPanelUiV1';
  // v1.7.34：后台学习（单标签）模式的"本标签是自动化起始标签"标记与列表页地址。
  // 用 sessionStorage：仅当前标签可见、hash 导航与整页刷新都不丢，
  // 用户手动打开的其它标签不会被误当作后台自动化标签。
  const BG_TAB_KEY = 'towerStudyHelperBackgroundTabV1';
  const BG_LIST_URL_KEY = 'towerStudyHelperBackgroundListUrlV1';

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

  // v1.7.25：播放器加载等待窗口。PPT/文档章节或慢网络下播放器渲染较晚，
  // 进场先按"加载中"持续等待并重试，超窗后才提示未发现播放器。
  const PLAYER_WAIT_NOTICE_MS = 90000;
  const PLAYER_WAIT_MSG_INTERVAL = 10000;

  // v1.7.27：PPT/文档类播放器启动参数。容器出现后先缓冲等就绪再点击，
  // 点击后留观察期避免监控循环反复乱点（观察期按次数指数退避）。
  const PPT_PLAY_READY_DELAY_MS = 2000;
  const PPT_PLAY_RETRY_INTERVAL_MS = 4000;

  // v1.7.30：进入播放页后延迟点击播放按钮（页面/播放器未加载完就点击
  // 容易导致偶发黑屏），等待期间由监控循环持续观察播放器就绪迹象。
  // v1.7.32：5 秒仍偶发偏快，放宽到 10 秒。
  const PLAY_CLICK_DELAY_MS = 10000;

  // v1.7.30：播放卡死两级兜底——video 存在但超过 30 秒未进入播放状态
  // 先刷新播放页；刷新后 60 秒仍未播放则按手动跳过方式标记该课程并续学。
  // v1.7.31：计时改为"无进展"语义（缓冲/readyState/currentTime 有任一
  // 进展即重置窗口），并加记录过期与"曾播放过"保护，修复慢网络下
  // "有加载进展也被误判卡死→刷新清空缓冲→跳过"的死亡螺旋。
  const PLAY_STUCK_REFRESH_MS = 30000;
  const PLAY_STUCK_SKIP_MS = 60000;
  const PLAY_STUCK_KEY = 'towerStudyHelperPlayStuckV1';
  // 持久化记录超过 10 分钟视为过期（跨天/跨会话残留不再影响新会话）
  const PLAY_STUCK_RECORD_MAX_AGE_MS = 600000;

  // v1.7.33：健康暂停自动恢复窗口。平台防挂机机制会在视频学习中途
  // 暂停视频、要求人工点击确认继续——此时视频缓冲完好、点一次播放
  // 即恢复，并非卡死。此类"暂停但健康"不再计入卡死计时（不刷新页面、
  // 不标记跳过），交由 ensurePlayback 持续重试恢复；超过窗口仍恢复
  // 不了，才以准确的"已暂停等人工"消息暂停并保留学习进度。
  const PLAY_RESUME_MAX_MS = 180000;
  const PLAY_RESUME_MSG_INTERVAL = 15000;

  // v1.7.26：选课顺序选项（面板下拉，点"开始学习"后按此顺序构建学习队列）
  const COURSE_ORDER_LABELS = {
    forward: '顺序学习',
    reverse: '倒序学习',
    hoursHigh: '高学时优先',
    hoursLow: '低学时优先'
  };

  const COURSE_ORDER_DESC = {
    forward: '按列表页从上到下的顺序',
    reverse: '按列表页从下到上的倒序',
    hoursHigh: '按学时从高到低',
    hoursLow: '按学时从低到高'
  };

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
  // v1.7.18：会话保活（仅课程列表页）。Worker 定时器不受后台标签降频影响，
  // 页面定时器作为 Worker 创建失败时的降级方案。
  let keepAliveWorker = null;
  let keepAliveFallbackTimer = null;
  let keepAliveLastBeatAt = 0;
  // 最近一次捕获到的课程列表接口 URL，保活心跳优先重放它（最轻量的真实业务请求）
  let lastCourseListApiUrl = '';
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

  // v1.7.25：播放器加载等待状态（按"课程|章节"键区分，切换章节自动重置）
  let playerWaitKey = '';
  let playerWaitStart = 0;
  let playerWaitLastMsgAt = 0;
  let playerWaitNotified = false;

  // v1.7.27：PPT 播放器启动状态（按"课程|章节"键切换时重置）
  let pptPlayerKey = '';
  let pptContainerSeenAt = 0;
  let pptPlayClickAt = 0;
  let pptPlayAttempts = 0;
  let pptClickedEl = null;
  let pptDomCaptured = false;

  // v1.7.30：播放按钮延迟点击闸门（按"课程|章节"键，进入新章节后
  // 延迟窗口内不点击播放，给页面/播放器加载留时间）
  let playClickGateKey = '';
  let playClickGateStart = 0;

  // v1.7.30：播放卡死监控状态（进度持久化到 localStorage，刷新后恢复）
  let playStuckKey = '';
  let playStuckStart = 0;
  let playStuckRefreshed = false;
  // v1.7.31：最近一次"加载进展"指纹与本页是否曾播放成功
  let playStuckLastProgress = '';
  let playStuckEverPlayed = false;

  // v1.7.33：健康暂停的自动恢复等待状态（按"课程|章节"键；视频恢复
  // 播放或切换章节即重置，保证每次中途暂停都拿到完整重试窗口）
  let playResumeKey = '';
  let playResumeStart = 0;
  let playResumeLastMsgAt = 0;
  // 当前 tick 是否处于"健康暂停待恢复"状态（ensurePlayback 据此抑制
  // 自己的等待类消息，避免与恢复进度消息互相覆盖）
  let playResumeActive = false;

  // v1.7.32：ended 后等待平台标记完成的轮询定时器（单例）
  let videoEndedWaitTimer = null;

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

    // v1.7.18：记录最近一次课程列表接口，供会话保活心跳重放
    //（GET 重放同一列表接口是最轻量、最真实的保活请求）。
    if (/\/api\//i.test(text) && isCourseListApi(text)) {
      lastCourseListApiUrl = text;
    }
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

  // v1.7.23：已学完清单（独立 localStorage key，免疫 STATE_KEY 覆盖竞态）
  function readFinishedIds() {
    try {
      const value = JSON.parse(localStorage.getItem(FINISHED_KEY) || '[]');
      return Array.isArray(value)
        ? value.map(v => String(v).toLowerCase()).filter(Boolean)
        : [];
    } catch (_) {
      return [];
    }
  }

  function markCourseFinished(id) {
    id = String(id || '').trim().toLowerCase();
    if (!id) return;

    try {
      const list = readFinishedIds().filter(v => v !== id);
      list.push(id);
      // 只保留最近 50 条，避免长期挂课无限增长
      localStorage.setItem(FINISHED_KEY, JSON.stringify(list.slice(-50)));
    } catch (_) {}
  }

  function isCourseFinishedId(id) {
    id = String(id || '').trim().toLowerCase();
    return id ? readFinishedIds().includes(id) : false;
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

      // v1.7.21：原"标题调试"写标题逻辑已移除，标签名恒与平台一致。

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
  // v1.7.21：原"标题调试"功能（setDebugTitle/buildDebugTitle/restorePlatformTitle/
  // 播放页写标题心跳等）已整体移除——该功能目前没有实际作用，且标签名恒定
  // 与平台一致即可。
  // ---------------------------------------------------------

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
        if (video.__tshRateResets <= 60) {
          try { video.playbackRate = target; } catch (_) {}
        } else if (video.__tshRateResets === 61) {
          setMessage('倍速被平台反复重置，已停止自动恢复（可能触发验证机制）');
        }
      }
    });
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
      // v1.7.38：手动"返回列表"后需要恢复离开前的页码
      restorePageOnReturn: false,
      speedEnabled: false,
      playbackRate: 1.25,
      keepAlive: true,
      keepAliveMinutes: 10,
      // v1.7.26：选课顺序（forward=顺序学习[默认] / reverse=倒序学习 /
      // hoursHigh=高学时优先 / hoursLow=低学时优先）
      courseOrder: 'forward',
      // v1.7.34：后台学习（单标签）开关，默认开启
      backgroundMode: true
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

  // =========================================================
  // v1.7.29：跨标签"设置类字段"双向同步
  // courseOrder（选课顺序）与 queue 的排序由列表页变更，播放页只推进
  // queueIndex/visited 等进度字段。此前 storage 监听仅在 running 变化时
  // 才同步 state，列表页改的选课顺序传不到播放页，播放页随后的 saveState
  // 又用内存旧值整体写回 → 学完下一课仍按旧顺序选课（用户实测 bug）。
  // =========================================================

  function queueOrderSignature(list) {
    return (Array.isArray(list) ? list : [])
      .map(item => String(item && item.id || '').toLowerCase())
      .join('|');
  }

  function sameQueueIdSet(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }

    const setB = new Set(
      b.map(item => String(item && item.id || '').toLowerCase())
    );

    return a.every(item =>
      setB.has(String(item && item.id || '').toLowerCase())
    );
  }

  // 采纳远端的"选课顺序 + 队列排序"两项，返回是否有实际变化。
  // 队列仅在 ID 集合完全一致（同一份队列的不同排序）时采纳，避免覆盖
  // 另一标签重建过的不同队列；进度字段（queueIndex/visited 等）不碰。
  function adoptRemoteQueueSettings(remote) {
    let data = remote || null;

    if (!data) {
      try {
        data = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      } catch (_) {
        return false;
      }
    }

    if (!data || typeof data !== 'object') return false;

    let changed = false;

    if (typeof data.courseOrder === 'string') {
      const next = normalizeCourseOrder(data.courseOrder);
      if (next !== state.courseOrder) {
        state.courseOrder = next;
        changed = true;
      }
    }

    if (Array.isArray(data.queue) && sameQueueIdSet(data.queue, state.queue)) {
      if (
        queueOrderSignature(data.queue) !== queueOrderSignature(state.queue)
      ) {
        state.queue = data.queue;
        changed = true;
      }
    }

    return changed;
  }

  // v1.7.36：后台学习开关的双向同步。返回是否有变化。
  // 该开关存在共享的 localStorage 状态里，但另一标签的内存态不会自动更新，
  // 若不显式采纳，会出现"面板勾选不同步"以及"旧内存值把别处刚改的设置
  // 覆盖回去"（与 v1.7.29 修复的选课顺序同类问题）。
  function adoptRemoteBackgroundMode(remote) {
    let data = remote || null;

    if (!data) {
      try {
        data = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      } catch (_) {
        return false;
      }
    }

    if (!data || typeof data.backgroundMode !== 'boolean') return false;
    if (state.backgroundMode === data.backgroundMode) return false;

    state.backgroundMode = data.backgroundMode;
    return true;
  }

  function saveState(options = {}) {
    // v1.7.29：播放页写回前先采纳列表页的"选课顺序+队列排序"，旧内存值
    // 不再覆盖列表页刚做的设置；本页刚改设置的写入用 skipAdoptSettings 跳过。
    if (isDetailPage() && !options.skipAdoptSettings) {
      adoptRemoteQueueSettings();
    }

    // v1.7.36：后台学习开关始终以持久化最新值为准（哪个标签改都算数），
    // 避免本页旧内存值把它覆盖回去。
    if (!options.skipAdoptSettings) {
      adoptRemoteBackgroundMode();
    }

    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  // =========================================================
  // v1.7.34：后台学习（单标签）模式
  // 勾选后：开课与"学完交接"都在同一个标签内用导航完成，不新开标签、
  // 不抢焦点；取消勾选时完全不进入这些分支，行为与 v1.7.33 逐行一致。
  // =========================================================

  function isBackgroundMode() {
    return state.backgroundMode !== false;
  }

  function markBackgroundTab() {
    try { sessionStorage.setItem(BG_TAB_KEY, '1'); } catch (_) {}
  }

  function clearBackgroundTab() {
    try { sessionStorage.removeItem(BG_TAB_KEY); } catch (_) {}
  }

  function isBackgroundAutomationTab() {
    try {
      return sessionStorage.getItem(BG_TAB_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  // 后台导航只在"本标签就是自动化起始标签"时启用：用户手动打开的详情页、
  // 或另一个前台标签都不会被本模式接管（避免把用户的标签导航走）。
  function backgroundAutoReady() {
    return isBackgroundAutomationTab();
  }

  function rememberBackgroundListUrl() {
    try {
      if (isListPage()) sessionStorage.setItem(BG_LIST_URL_KEY, location.href);
    } catch (_) {}
  }

  function getBackgroundListUrl() {
    try {
      const saved = sessionStorage.getItem(BG_LIST_URL_KEY);

      if (saved && saved.includes('#/online') &&
          !saved.includes('/onlineDetail/')) {
        return saved;
      }
    } catch (_) {}

    return `${location.origin}${location.pathname}${location.search}#/online`;
  }

  // 在同一标签内导航到目标地址并整页加载：等价于"新标签打开该地址"，
  // 但始终留在原标签——后台标签的导航与刷新都不会抢焦点。
  function backgroundNavigateTo(url) {
    try {
      rememberBackgroundListUrl();
      location.href = url;

      // 先同步写入 hash 再整页刷新：刷新以新 URL 加载，避免 SPA 在同一
      // 文档内反复切换课程残留状态（v1.7.23 记载的"服务器异常"隐患）。
      setTimeout(() => {
        try { location.reload(); } catch (_) {}
      }, 150);

      return true;
    } catch (error) {
      console.warn('[铁塔助手] 后台导航失败：', error);
      return false;
    }
  }

  // 后台模式的"学完交接"：同标签回课程列表，复用既有 resumeOpenNext 流程
  // （与 handleNextRequest 相同的状态处理，只是不关标签、不发跨标签信号）
  function goBackToListInBackground() {
    state = loadState();
    state.resumeOpenNext = true;
    saveState();
    setMessage('正在返回课程列表，继续下一门课程');

    return backgroundNavigateTo(getBackgroundListUrl());
  }

      // v1.7.34/1.7.38：面板"返回列表"——暂停当前学习并回到课程列表页。
  // 后台模式（或本标签本身没有 opener）→ 同标签导航回列表；
  // 双标签模式 → 关闭当前播放标签即回到列表标签（关闭失败再退回导航）。
  function goBackToCourseList() {
    if (isListPage()) {
      setMessage('当前已在课程列表页');
      return;
    }

    pauseAuto('已暂停：正在返回列表');

    const listUrl = getBackgroundListUrl();
    const hasOpener = Boolean(window.opener && !window.opener.closed);

    if (backgroundAutoReady() || !hasOpener) {
      // v1.7.38：记住"回列表后要恢复的页码"。分页是平台客户端状态（URL 里
      // 不带页码），整页加载会重置回第 1 页，必须回列表后按 state.pageNumber
      // 恢复，否则会像 v1.7.37 那样无论从第几页离开都跳回第 1 页。
      state.restorePageOnReturn = true;
      saveState();

      if (backgroundNavigateTo(listUrl)) return;
    }

    try {
      window.close();
    } catch (_) {
      setMessage('无法自动返回课程列表，请手动切换到列表页');
    }
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

      // v1.7.28：页码校准（纯读取，不触发任何翻页）。仅在未运行时校准，
      // 供人工翻页后点"开始学习"从该页起；运行中列表页刷新后的第 1 页
      // 是瞬时状态，不能反过来覆盖"学习进度所在页"的目标页码。
      if (isListPage() && !isRunning()) {
        const domPage = readCurrentPageFromDom();
        if (domPage && domPage !== state.pageNumber) {
          state.pageNumber = domPage;
          saveState();
        }
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

    // v1.7.23：详情页绝不消费该信号键（把检查挪到 removeItem 之前）。
    // 此前详情页自身 1 秒轮询会与列表页 storage 事件竞争消费，抢先吃掉
    // 后列表页收不到信号、清单页不刷新，详情页随即重开刚学完的课程。
    if (isDetailPage()) return;

    // 消费触发键，避免列表页重复刷新或重复处理。
    try { localStorage.removeItem(NEXT_REQUEST_KEY); } catch (_) {}

    if (!isRunning()) {
      setMessage('收到播放页完成信号（当前已暂停，稍后继续）');
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

    // v1.7.23：先从 localStorage 读回最新状态再写入。此前直接用列表页
    // 内存中的旧 state 加 resumeOpenNext 整体写回，会把详情页刚记录的
    // visited/queueIndex 进度覆盖掉（storage 监听仅在 running 变化时同步
    // state），刷新后队列回退 → 重开刚学完的课程 → 死循环。
    state = loadState();
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

    if (!incoming || typeof incoming !== 'object') return;

    // v1.7.36：后台学习开关双向同步——在哪个页面（标签）改都生效，本标签
    // 面板勾选立即跟随；运行中的那一轮仍按当前方式跑完（与改动方的提示
    // 一致），下次点"开始学习"时按新设置生效。
    if (adoptRemoteBackgroundMode(incoming)) {
      setMessage(incoming.backgroundMode
        ? '其他标签已开启“后台学习”：下次开始学习后按后台方式切换'
        : '其他标签已关闭“后台学习”：本轮仍按当前方式继续，下次开始学习后生效');
    }

    // v1.7.29：任何跨标签状态写入都先采纳"选课顺序+队列排序"（双向同步，
    // 面板显示与后续选课立即生效），不再只在 running 变化时才同步。
    if (adoptRemoteQueueSettings(incoming)) refreshPanel();

    if (typeof incoming.running !== 'boolean') return;

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
    const primary = document.querySelector(PLAY_BUTTON_SELECTOR);
    if (primary) return primary;

    // v1.7.25：PPT/文档播放器的按钮可能不在 .video-component 容器内，
    // 退化查找可见的 .play-btn（platformButtonIsPlay 仍会校验 play 语义）。
    return [...document.querySelectorAll('.play-btn')].find(el =>
      el.getClientRects().length > 0
    ) || null;
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

  // v1.7.22：播放状态消息自愈。进场时序里 ensurePlayback 可能在播放器
  // 就绪前就留下"等待播放器响应/未发现播放器"等消息，而此后"已在播放"
  // 的早退分支与监控循环的播放分支都不更新消息——视频明明正常在播，
  // 面板却永远停在等待提示（用户报告：学习中的课程自动播放后，插件一直
  // 提示"已点击播放按钮，等待播放器响应"，像读不到播放数据）。
  // 修法：确认在播时，若当前消息属于等待/失败类陈旧文案，纠正为
  // "正在播放：第N节"；只在文案陈旧时纠正一次，不逐 tick 刷屏。
  const STALE_PLAYBACK_MESSAGE_RE =
    /等待播放器响应|未发现可控制的播放器|未发现播放器|等待播放器加载|就绪后点击播放|PPT 播放按钮|自动播放未成功|自动播放遇到异常|播放页加载中|视频已暂停|视频结束，但平台尚未标记完成|视频播放结束，等待平台更新/;

  function correctPlaybackMessageIfStale() {
    const current = lastMessage || state.message || '';
    if (!STALE_PLAYBACK_MESSAGE_RE.test(current)) return;

    const active = getActiveChapter();
    const chapter = active ? getChapterName(active) : '';
    setMessage(chapter ? `正在播放：${chapter}` : '视频正在播放');
  }

  // v1.7.25：未发现播放器时的分级处理。PPT/文档章节或慢网络下，进场瞬间
  // 播放器（video / play-btn）还没渲染出来，此前直接报"暂未发现可控制的
  // 播放器"后就不再重试（monitorDetail 里 video 为 null 不触发 ensurePlayback），
  // 等播放器真正加载完反而无人接管，自动播放失败。
  // 现在：先按"加载中"等待 PLAYER_WAIT_NOTICE_MS，期间每 10 秒刷新已等待
  // 秒数；超窗后发一次终态提示但继续重试，播放器一出现即接管播放。
  function handlePlayerNotReady() {
    const active = getActiveChapter();
    const chapterName = active ? getChapterName(active) : '';
    const key = `${getCurrentRouteId()}|${chapterName}`;

    if (key !== playerWaitKey) {
      playerWaitKey = key;
      playerWaitStart = Date.now();
      playerWaitLastMsgAt = 0;
      playerWaitNotified = false;
    }

    const elapsed = Date.now() - playerWaitStart;
    const now = Date.now();

    if (elapsed < PLAYER_WAIT_NOTICE_MS) {
      if (
        !playerWaitLastMsgAt ||
        now - playerWaitLastMsgAt >= PLAYER_WAIT_MSG_INTERVAL
      ) {
        playerWaitLastMsgAt = now;
        const seconds = Math.max(1, Math.round(elapsed / 1000));
        setMessage(
          chapterName
            ? `等待播放器加载：${chapterName}（已等 ${seconds}s，PPT/大文件章节加载较慢）`
            : `等待播放器加载（已等 ${seconds}s）`
        );
      }
      return;
    }

    if (!playerWaitNotified) {
      playerWaitNotified = true;
      // 超窗仍无播放器：区分"PPT/文档章节（平台自动计时）"与真异常
      setMessage(
        isNonVideoContent()
          ? 'PPT/文档章节未找到可点击的播放控件，等待平台自动计时完成'
          : '当前章节暂未发现可控制的播放器，将持续重试'
      );
    }
  }

  // =========================================================
  // v1.7.27：PPT/文档类播放器启动（无 <video>、无 .play-btn 的章节）
  // 可见性判断复用第 7 节的 isElementVisible（同作用域函数声明提升）。
  // =========================================================

  // 元素是否带"播放"语义（类名 / aria-label / title / svg use），且不是暂停控件
  function hasPlaySemantic(el) {
    if (!el || !el.getAttribute) return false;

    const cls = String(el.getAttribute('class') || '');
    const aria = String(el.getAttribute('aria-label') || '');
    const title = String(el.getAttribute('title') || '');
    let useHref = '';

    try {
      const uses = el.tagName === 'USE'
        ? [el]
        : [...(el.querySelectorAll ? el.querySelectorAll('use') : [])];

      useHref = uses.map(u =>
        String(u.getAttribute('href') || u.getAttribute('xlink:href') || '')
      ).join(' ');
    } catch (_) {}

    const hay = `${cls} ${aria} ${title} ${useHref}`;
    if (/pause|暂停/i.test(hay)) return false;
    return /play|播放|▶/i.test(hay);
  }

  function findPlayerContainer() {
    return (
      document.querySelector('.box.video-component') ||
      document.querySelector('[class*="video-component"]') ||
      document.querySelector('[class*="ppt-player" i]') ||
      document.querySelector('[class*="player-container" i]') ||
      null
    );
  }

  // 在播放器区域（及页面级兜底）里找可点击的大播放按钮
  function findPptPlayCandidate(container) {
    const tryList = list => {
      for (const el of list) {
        if (!isElementVisible(el)) continue;
        if (!hasPlaySemantic(el)) continue;
        return el;
      }
      return null;
    };

    if (container) {
      // 1) 平台预览遮罩里的大播放图（img.cursor-pointer 结构）
      for (const image of container.querySelectorAll('img')) {
        if (
          image.classList.contains('cursor-pointer') &&
          isElementVisible(image)
        ) return image;
      }

      // 2) 常见大播放按钮 class
      const commonSelectors =
        '[class*="play-btn" i], [class*="big-play" i], [class*="bigPlay" i], ' +
        '[class*="poster-play" i], [class*="play-overlay" i], [class*="btn-play" i], ' +
        '.vjs-big-play-button, .play-btn';

      const commonHit = tryList(container.querySelectorAll(commonSelectors));
      if (commonHit) return commonHit;

      // 3) 容器内任何带播放语义的可点元素（按钮/链接/图标/svg）
      const clickables = container.querySelectorAll(
        'button, [role="button"], a, img, svg, use, [class*="play" i], [class*="cursor-pointer" i]'
      );
      const clickHit = tryList(clickables);
      if (clickHit) return clickHit;
    }

    // 4) 页面级常见大播放按钮兜底（排除插件自身面板）
    const panel = document.getElementById(PANEL_ID);
    const pageList = [...document.querySelectorAll(
      '.vjs-big-play-button, .big-play-button, [class*="big-play" i], ' +
      '[class*="poster-play" i], img.cursor-pointer'
    )].filter(el => !panel || !panel.contains(el));

    return tryList(pageList);
  }

  // 是否已有播放迹象（无 <video> 时靠"按钮消失/出现暂停控件"判断）
  function pptPlaybackStarted() {
    const video = getVideo();
    if (video) return videoIsPlaying(video);

    // 点击过的按钮已隐藏或被移除 → 播放器通常已进入播放态
    if (pptClickedEl) {
      if (!pptClickedEl.isConnected || !isElementVisible(pptClickedEl)) {
        return true;
      }
    }

    // 容器内出现"暂停"语义控件 → 正在播放
    const container = findPlayerContainer();
    if (container) {
      const controls = container.querySelectorAll(
        'button, [role="button"], a, svg, use'
      );

      for (const el of controls) {
        if (!isElementVisible(el)) continue;

        const cls = String(el.getAttribute?.('class') || '');
        const aria = String(el.getAttribute?.('aria-label') || '');
        const title = String(el.getAttribute?.('title') || '');
        const text = String(el.textContent || '');

        if (/pause/i.test(`${cls} ${aria} ${title}`)) return true;
        if (/暂停/.test(text)) return true;
      }
    }

    return false;
  }

  // v1.7.27：PPT/文档类播放器启动流程。截图确认这类章节页面上有大播放
  // 按钮，但既无 <video> 也无 .play-btn，旧逻辑直接落进"未发现播放器"，
  // 从未尝试点击 → 平台不自动播、计时也无法推进。
  // 现在：容器出现 → 缓冲 2 秒等就绪（用户反馈普通课程进场即点没问题、
  // PPT 类要等就绪）→ 找大播放按钮点击 → 观察播放迹象 → 无迹象按指数
  // 退避重试（4s/8s/16s/30s 封顶）。
  // 返回 true = 已接管（等待就绪/已点击/已在播放），false = 无播放器区域。
  function tryStartPptLikePlayer() {
    const container = findPlayerContainer();
    if (!container) return false;

    const active = getActiveChapter();
    const chapter = active ? getChapterName(active) : '';
    const key = `${getCurrentRouteId()}|${chapter}`;

    if (key !== pptPlayerKey) {
      pptPlayerKey = key;
      pptContainerSeenAt = Date.now();
      pptPlayClickAt = 0;
      pptPlayAttempts = 0;
      pptClickedEl = null;
      pptDomCaptured = false;
    }

    if (!pptContainerSeenAt) pptContainerSeenAt = Date.now();

    if (pptPlaybackStarted()) {
      const msg = chapter ? `正在播放：${chapter}` : 'PPT 正在播放';
      if (lastMessage !== msg) setMessage(msg);
      return true;
    }

    const now = Date.now();

    // 就绪缓冲：容器刚出现时播放器还在初始化，先等一会儿再动手
    if (now - pptContainerSeenAt < PPT_PLAY_READY_DELAY_MS) {
      const msg = '检测到播放器区域，等待就绪后点击播放…';
      if (lastMessage !== msg) setMessage(msg);
      return true;
    }

    // 点击后的观察期（指数退避），避免 1.2 秒一轮的监控重复乱点
    if (pptPlayClickAt) {
      const interval = Math.min(
        PPT_PLAY_RETRY_INTERVAL_MS *
          Math.pow(2, Math.max(0, pptPlayAttempts - 1)),
        30000
      );
      if (now - pptPlayClickAt < interval) return true;
    }

    const candidate = findPptPlayCandidate(container);

    if (!candidate) {
      // 每章节抓一次容器 DOM 到控制台，便于排查可点控件（用户可复制反馈）
      if (!pptDomCaptured) {
        pptDomCaptured = true;
        try {
          console.log(
            '[铁塔助手] PPT 播放器容器 DOM（排查用）：',
            (container.outerHTML || '').slice(0, 5000)
          );
        } catch (_) {}
      }
      return false;
    }

    if (playbackStarting) return true;

    playbackStarting = true;
    try {
      pptPlayAttempts++;
      pptPlayClickAt = Date.now();
      pptClickedEl = candidate;
      candidate.click();
      setMessage(
        `已点击 PPT 播放按钮（第 ${pptPlayAttempts} 次），等待播放器响应`
      );
    } catch (error) {
      console.warn('[铁塔助手] 点击 PPT 播放按钮失败', error);
    } finally {
      playbackStarting = false;
    }

    return true;
  }

  async function ensurePlayback() {
    if (!isRunning() || isExamPage() || playbackStarting) return;

    const active = getActiveChapter();
    if (!active || isChapterCompleted(active)) return;

    // v1.7.30：进入新播放页后先延迟 5 秒再点击播放，给页面/播放器加载
    // 留时间（进场就点容易触发偶发黑屏）；已在播放则不拦。
    const gateKey = `${getCurrentRouteId()}|${getChapterName(active)}`;

    if (gateKey !== playClickGateKey) {
      playClickGateKey = gateKey;
      playClickGateStart = Date.now();
    }

    if (Date.now() - playClickGateStart < PLAY_CLICK_DELAY_MS) {
      const gateVideo = getVideo();

      if (!(gateVideo && videoIsPlaying(gateVideo))) {
        const waitSec = Math.ceil(
          (PLAY_CLICK_DELAY_MS - (Date.now() - playClickGateStart)) / 1000
        );
        setMessage(`播放页加载中，${waitSec} 秒后再尝试播放`);
        return;
      }
    }

    const video = getVideo();
    const button = getPlatformPlayButton();

    if (!video && !button) {
      // v1.7.27：PPT/文档类章节常见"有大播放按钮但无 <video>、无 .play-btn"，
      // 先走 PPT 播放器启动流程（等就绪 → 点击大播放按钮 → 观察播放迹象）。
      if (tryStartPptLikePlayer()) return;
      // v1.7.25：播放器区域仍未出现时，进入等待/重试流程。
      handlePlayerNotReady();
      return;
    }

    // 播放器已出现：清掉等待状态（下次进入慢章节重新计时）
    playerWaitKey = '';
    playerWaitStart = 0;
    playerWaitLastMsgAt = 0;
    playerWaitNotified = false;

    if (video && videoIsPlaying(video)) {
      removePlayOverlayWhenPlaying();
      applyPlaybackRate();
      correctPlaybackMessageIfStale();
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
        } else if (!playResumeActive) {
          // v1.7.33：健康暂停恢复重试期间，由 monitorPlaybackStuck 统一
          // 汇报恢复进度，避免两条等待消息每 tick 互相覆盖
          setMessage('已点击播放按钮，等待播放器响应');
        }
        return;
      }

      // v1.7.33：同上——恢复重试期的失败提示不覆盖恢复进度消息
      if (!playResumeActive) {
        setMessage('自动播放未成功，请检查播放器状态');
      }
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

  // =========================================================
  // v1.7.30：播放卡死两级兜底（黑屏/点击无响应场景）
  // video 存在但长时间无法进入播放状态：
  //   第一级 30 秒 → 刷新播放页重试（计时持久化，刷新后继续按第二级计时）
  //   第二级 60 秒 → 按"手动标记跳过"同款方式写入跳过名单并续学下一课
  // =========================================================

  function readPlayStuck(courseId, chapterName) {
    try {
      const data = JSON.parse(localStorage.getItem(PLAY_STUCK_KEY) || '{}');
      const key = `${courseId || ''}|${normalizeName(chapterName)}`;
      const item = data[key];

      if (item && typeof item === 'object') {
        const start = Number(item.start) || 0;

        // v1.7.31：记录过期保护——超过 10 分钟的残留记录（跨会话/跨天）
        // 视为不存在，避免旧时间戳让重进章节秒触发刷新/跳过。
        if (start && Date.now() - start > PLAY_STUCK_RECORD_MAX_AGE_MS) {
          return { start: 0, refreshed: false, played: false };
        }

        return {
          start,
          refreshed: !!item.refreshed,
          played: !!item.played
        };
      }
    } catch (_) {}

    return { start: 0, refreshed: false, played: false };
  }

  function writePlayStuck(courseId, chapterName, record) {
    try {
      const data = JSON.parse(localStorage.getItem(PLAY_STUCK_KEY) || '{}');
      const key = `${courseId || ''}|${normalizeName(chapterName)}`;

      if (record) data[key] = record;
      else delete data[key];

      localStorage.setItem(PLAY_STUCK_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function resetPlayStuckState() {
    playStuckKey = '';
    playStuckStart = 0;
    playStuckRefreshed = false;
    playStuckLastProgress = '';
    playStuckEverPlayed = false;
  }

  // v1.7.33：中断"卡死"链——健康暂停不属于卡死。清掉持久化的计时/
  // 刷新标记（保留"曾播放成功"，后续真卡死时据此决定暂停还是跳过），
  // 避免残留的 refreshed 标记让下一次真卡死秒进第二级计时。
  function abortPlayStuckChain(courseId, chapterName) {
    const saved = readPlayStuck(courseId, chapterName);
    const played = saved.played || playStuckEverPlayed;

    if (saved.start || saved.refreshed || playStuckStart || playStuckRefreshed) {
      writePlayStuck(courseId, chapterName, {
        start: 0,
        refreshed: false,
        played
      });
    }

    playStuckKey = `${courseId}|${chapterName}`;
    playStuckStart = 0;
    playStuckRefreshed = false;
    playStuckLastProgress = '';
    playStuckEverPlayed = played;
  }

  // v1.7.31：加载进展指纹。currentTime 前进、readyState 提升、缓冲区
  // 增长任一出现都算"有进展"——只有指纹完全不变才算真正卡死。
  function videoProgressFingerprint(video) {
    let bufferedEnd = 0;

    try {
      if (video.buffered && video.buffered.length) {
        bufferedEnd = video.buffered.end(video.buffered.length - 1) || 0;
      }
    } catch (_) {}

    return [
      Math.floor(video.currentTime || 0),
      video.readyState || 0,
      bufferedEnd.toFixed(1)
    ].join('|');
  }

  // v1.7.33：区分"暂停但健康"与"真卡死"。平台防挂机/人工暂停时视频
  // 缓冲完好（当前位置有数据、无错误、有数据源），点一次播放即可继续
  // ——这类不是卡死，不能刷新页面（丢进度且恢复不了）或标记跳过。
  // 真卡死（黑屏/源损坏/缓冲推不动）表现为 readyState 低、无缓冲、
  // 解码错误或无数据源，仍走原两级兜底。
  function videoHealthyPaused(video) {
    if (!video || video.ended || !video.paused) return false;
    if (video.error) return false;
    // HAVE_FUTURE_DATA 以下：缓冲区覆盖不到当前位置，点了也播不动
    if (video.readyState < 3) return false;
    // NETWORK_EMPTY / NETWORK_NO_SOURCE
    if (video.networkState === 0 || video.networkState === 3) return false;

    try {
      if (!video.buffered || !video.buffered.length) return false;
      const end = video.buffered.end(video.buffered.length - 1);
      if (video.currentTime > end + 0.25) return false;
    } catch (_) {
      return false;
    }

    return true;
  }

  // 播放卡死两级兜底（黑屏/点击无响应场景，v1.7.31 起按"无进展"计时；
  // v1.7.33 起"暂停但缓冲完好"判定为健康暂停，不走卡死链路）
  function monitorPlaybackStuck() {
    // v1.7.33：默认不在恢复等待态，只有下方健康暂停分支会置 true
    playResumeActive = false;

    if (!isRunning() || !isDetailPage()) {
      resetPlayStuckState();
      return false;
    }

    // 人工控制、最后一节等待、完结流程、考试页各自有处理逻辑，不纳入卡死计时
    if (manualControlActive() || lastChapterAckInProgress || finishingCourse) {
      resetPlayStuckState();
      return false;
    }

    const active = getActiveChapter();
    if (!active || isChapterCompleted(active)) {
      resetPlayStuckState();
      return false;
    }

    const video = getVideo();
    // 无 video（PPT/文档类）由 monitorPptLoad 的 7 分钟机制独立处理
    if (!video) {
      resetPlayStuckState();
      return false;
    }

    const courseId = getCurrentRouteId();
    const chapterName = getChapterName(active);

    // 正常播放或已播完：视为健康。v1.7.31：同时持久化"曾播放成功"标记
    //（学一半中途卡死的场景据此不再标记跳过，改为暂停等人工）；计时
    // 状态复位但保留 everPlayed，卡死重新开始时无需再读盘。
    if (videoIsPlaying(video) || video.ended) {
      if (!playStuckEverPlayed) {
        playStuckEverPlayed = true;
        writePlayStuck(courseId, chapterName, {
          start: 0,
          refreshed: false,
          played: true
        });
      }

      playStuckKey = `${courseId}|${chapterName}`;
      playStuckStart = 0;
      playStuckRefreshed = false;
      playStuckLastProgress = '';
      // v1.7.33：恢复播放即重置恢复等待窗口，下次中途暂停重新计时
      playResumeKey = '';
      playResumeStart = 0;
      playResumeLastMsgAt = 0;
      return false;
    }

    // v1.7.33：暂停但缓冲完好/无错误 → 平台防挂机暂停或人工暂停，不是
    // 卡死（点一次播放即恢复）。中断卡死链（不刷新、不跳过），交给
    // ensurePlayback 持续重试恢复；超过窗口仍恢复不了才以准确消息
    // 暂停等人工，保留学习进度。
    if (videoHealthyPaused(video)) {
      abortPlayStuckChain(courseId, chapterName);

      const resumeKey = `${courseId}|${chapterName}`;

      if (resumeKey !== playResumeKey) {
        playResumeKey = resumeKey;
        playResumeStart = Date.now();
        playResumeLastMsgAt = 0;
      }

      playResumeActive = true;

      const now = Date.now();

      if (
        !playResumeLastMsgAt ||
        now - playResumeLastMsgAt >= PLAY_RESUME_MSG_INTERVAL
      ) {
        playResumeLastMsgAt = now;
        const seconds = Math.max(1, Math.round((now - playResumeStart) / 1000));
        setMessage(
          `视频已暂停，正在尝试自动恢复播放（已等 ${seconds}s）；` +
          '如平台要求人工点击确认，点击一次播放即可继续'
        );
      }

      if (now - playResumeStart > PLAY_RESUME_MAX_MS) {
        pauseAuto(
          '视频已暂停且多次自动恢复未成功（平台可能要求人工点击确认继续），' +
          '已暂停等人工处理；在播放页点击一次播放即可恢复，' +
          '然后点面板“开始学习”继续'
        );
        return true;
      }

      return false;
    }

    const key = `${courseId}|${chapterName}`;

    if (key !== playStuckKey) {
      playStuckKey = key;

      // 刷新页面后内存状态丢失，从 localStorage 恢复起点/刷新标记/曾播放标记，
      // 保证"刷新后 60 秒仍未播放"的第二级计时连续。
      const saved = readPlayStuck(courseId, chapterName);
      playStuckStart = saved.start || Date.now();
      playStuckRefreshed = saved.refreshed;
      playStuckEverPlayed = saved.played || playStuckEverPlayed;
      playStuckLastProgress = videoProgressFingerprint(video);

      if (!saved.start) {
        writePlayStuck(courseId, chapterName, {
          start: playStuckStart,
          refreshed: false,
          played: playStuckEverPlayed
        });
      }
    }

    // v1.7.31：曾健康播放后计时被复位（start=0），再次停播时重新起算
    if (!playStuckStart) {
      playStuckStart = Date.now();
      playStuckLastProgress = videoProgressFingerprint(video);
      return false;
    }

    // v1.7.31：有加载进展即重置无进展窗口（防慢网络"有进展也判死"）
    const fingerprint = videoProgressFingerprint(video);

    if (fingerprint !== playStuckLastProgress) {
      playStuckLastProgress = fingerprint;
      playStuckStart = Date.now();

      if (playStuckRefreshed) {
        writePlayStuck(courseId, chapterName, {
          start: playStuckStart,
          refreshed: true,
          played: playStuckEverPlayed
        });
      }

      return false;
    }

    const elapsed = Date.now() - playStuckStart;

    // 第一级：30 秒无任何加载进展 → 刷新播放页，60 秒第二级计时从刷新起算
    if (!playStuckRefreshed && elapsed > PLAY_STUCK_REFRESH_MS) {
      playStuckRefreshed = true;
      playStuckStart = Date.now();
      writePlayStuck(courseId, chapterName, {
        start: playStuckStart,
        refreshed: true,
        played: playStuckEverPlayed
      });

      setMessage(
        `播放器 ${Math.round(elapsed / 1000)} 秒无加载进展，正在刷新播放页重试`
      );

      setTimeout(() => {
        if (isRunning()) location.reload();
      }, 1000);

      return true;
    }

    // 第二级：刷新后 60 秒仍无进展
    if (playStuckRefreshed && elapsed > PLAY_STUCK_SKIP_MS) {
      // v1.7.31：本页曾播放成功过（学一半卡死）的课不标记跳过——
      // 标记跳过会让它永久不再学习，改为暂停等人工处理。
      if (playStuckEverPlayed) {
        writePlayStuck(courseId, chapterName, null);
        resetPlayStuckState();
        pauseAuto(
          '视频学习中途卡死且刷新未能恢复，已暂停；请人工检查后继续'
        );
        return true;
      }

      markCourseStuckSkipped(courseId, chapterName);
      return true;
    }

    return false;
  }

  // 与手动跳过同款：写入 SKIP_KEY（面板可取消），随后推进队列续学
  function markCourseStuckSkipped(courseId, chapterName) {
    const id = String(courseId || '').trim().toLowerCase();
    const queueIndex = findQueueIndexById(id);
    const queueItem = queueIndex >= 0 ? state.queue[queueIndex] : null;
    const name = normalizeName(queueItem?.name || lastClickedCourseName);

    const key = skipKey({ id, name });

    if (key) {
      const data = readManualSkip();
      data[key] = { name, id, time: Date.now() };
      writeManualSkip(data);
    }

    writePlayStuck(courseId, chapterName, null);
    resetPlayStuckState();
    stopCurrentVideo();

    advancePastCurrentCourse(
      id,
      `播放器多次尝试仍无法播放，已跳过并标记该课程（${name || id}）`
    );
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

      // v1.7.32：同一时刻只允许一个 ended 轮询（多次 ended 叠加会互相
      // 干扰），且视频一旦恢复播放立即自我取消，不再写"尚未标记完成"。
      if (videoEndedWaitTimer) clearInterval(videoEndedWaitTimer);

      setMessage('视频播放结束，等待平台更新完成状态');

      let attempts = 0;

      videoEndedWaitTimer = setInterval(() => {
        if (!isRunning()) {
          clearInterval(videoEndedWaitTimer);
          videoEndedWaitTimer = null;
          return;
        }

        attempts++;

        // v1.7.32：平台回跳/人工拖进度/自动重播等导致视频恢复播放时，
        // 结束等待作废（此前会等满 120 秒后误报"尚未标记完成"）。
        const current = getVideo();

        if (current && videoIsPlaying(current)) {
          clearInterval(videoEndedWaitTimer);
          videoEndedWaitTimer = null;
          correctPlaybackMessageIfStale();
          return;
        }

        const active = getActiveChapter();

        if (active && isChapterCompleted(active)) {
          clearInterval(videoEndedWaitTimer);
          videoEndedWaitTimer = null;
          goNextChapter();
        } else if (attempts >= 120) {
          clearInterval(videoEndedWaitTimer);
          videoEndedWaitTimer = null;
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

    // v1.7.30：video 存在但长时间不播放的两级兜底（30 秒刷新/60 秒跳过）
    if (monitorPlaybackStuck()) return;

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
      correctPlaybackMessageIfStale();
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
      // v1.7.25：播放器尚未加载出来（video 为 null）时也持续重试，
      // 慢加载的 PPT/文档章节播放器就绪后能立即被接管开始播放。
      if (!video || (video.paused && !video.ended)) ensurePlayback();
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
    if (active) writePlayStuck(id, getChapterName(active), null);

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

    // v1.7.23：同时写入独立的已学完清单，供选课时硬跳过
    markCourseFinished(id);

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

  function normalizeCourseOrder(value) {
    return Object.prototype.hasOwnProperty.call(COURSE_ORDER_LABELS, value)
      ? value
      : 'forward';
  }

  function courseOrderLabel(value) {
    return COURSE_ORDER_LABELS[normalizeCourseOrder(value)] ||
      COURSE_ORDER_LABELS.forward;
  }

  function courseOrderDesc(value) {
    return COURSE_ORDER_DESC[normalizeCourseOrder(value)] ||
      COURSE_ORDER_DESC.forward;
  }

  // v1.7.26：按面板选定的选课顺序排序候选课程（输入保持列表页 DOM 顺序）。
  // - forward：不排序，保持列表页第一个到最后一个的原始顺序
  // - reverse：原始顺序倒过来
  // - hoursHigh / hoursLow：按学时高→低 / 低→高；学时未识别的课程固定排最后，
  //   学时相同学分升序、再按章节数升序（保持稳定可预期）
  function sortCoursesByOrder(list) {
    const mode = normalizeCourseOrder(state.courseOrder);

    if (mode === 'reverse') return list.slice().reverse();

    if (mode === 'hoursHigh' || mode === 'hoursLow') {
      const dir = mode === 'hoursHigh' ? -1 : 1;

      return list.slice().sort((a, b) => {
        const ha = parseFloat(a.hours);
        const hb = parseFloat(b.hours);
        const na = Number.isFinite(ha) ? ha : null;
        const nb = Number.isFinite(hb) ? hb : null;

        if (na === null && nb === null) return 0;
        if (na === null) return 1;
        if (nb === null) return -1;
        if (na !== nb) return (na - nb) * dir;

        const ca = parseFloat(a.credit) || 0;
        const cb = parseFloat(b.credit) || 0;
        if (ca !== cb) return ca - cb;

        return (parseInt(a.chapters, 10) || 0) - (parseInt(b.chapters, 10) || 0);
      });
    }

    return list;
  }

  function buildQueue() {
    const courses = getCourseList();

    if (!courses.length) {
      setMessage('没有识别到课程卡片，请等待列表加载');
      return false;
    }

    const skipped = courses.filter(item => shouldSkipCourse(item));
    const completed = courses.filter(item =>
      item.status === 'completed' || isCourseFinishedId(item.id)
    );

    const candidates = courses.filter(item =>
      item.status !== 'completed' &&
      !shouldSkipCourse(item) &&
      !isCourseFinishedId(item.id)
    );

    // v1.7.26：按面板选定的选课顺序排序（默认顺序学习=列表页原始顺序；
    // 此前版本为硬编码"学时从低到高"，现由用户在面板选择）。
    const ordered = sortCoursesByOrder(candidates);

    const missing = ordered.filter(item => !item.id);

    if (missing.length) {
      setMessage(`当前页有 ${missing.length} 门待学习课程尚未识别 ID，请等待页面接口加载`);
      console.warn('[铁塔助手] 未识别 ID 的待学习课程：', missing.map(item => item.name));
      return false;
    }

    state.queue = ordered.map(({ name, id, hours, credit, chapters }) => ({
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

    const unknownCount = ordered.filter(item => item.status === 'unknown').length;

    setMessage(
      `已过滤 ${completed.length} 门已完成课程、${skipped.length} 门跳过课程；` +
      `待学习 ${state.queue.length} 门（选课顺序：${courseOrderLabel(state.courseOrder)}，${courseOrderDesc(state.courseOrder)}）` +
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

    // v1.7.34：后台学习模式——同一标签导航到详情页（不新开标签、不抢焦点）
    if (backgroundAutoReady()) {
      rememberBackgroundListUrl();
      setMessage(`正在后台切换课程：${item.name}`);

      if (backgroundNavigateTo(url)) return true;

      setMessage('后台导航失败，回退为新标签打开');
    }

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
    // v1.7.34：后台学习模式——同一标签导航回课程列表继续选课（整页加载，
    // 复用列表页既有的 resumeOpenNext 流程；不关标签、不抢焦点）。
    if (backgroundAutoReady() && goBackToListInBackground()) return;

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

      // v1.7.23：本会话刚学完的课程硬跳过（独立清单）。列表卡片状态
      // 回传有延迟、或状态被竞态覆盖时，这是防"重开刚学完课程"死循环
      // 的最后一道闸。
      if (isCourseFinishedId(item.id)) {
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
        // v1.7.34：后台学习模式同样走"回列表"交接（经列表页中转，
        // 避开 detail→detail 的"服务器异常"）。
        if (backgroundAutoReady() ||
            (window.opener && !window.opener.closed)) {
          signalListToOpenNext();
          return;
        }
        location.hash = `#/onlineDetail/${item.id}`;
        return;
      }

      if (openCourseInNewTab(item)) return;
      return;
    }

    // v1.7.24：队列在播放页视角处理完时，不要就地暂停——播放页没有
    // 分页控件，pauseAuto 还会把 running=false 同步给列表页造成全局
    // 停摆（v1.7.23 引入"本会话已学完"硬跳过后，页尾课程学完时队列
    // 耗尽会发生在详情页，触发此回归）。改为通知列表页刷新，由列表侧
    // 用平台最新状态重新走"选课 → 翻页"流程（列表页才有分页控件）。
    if (isDetailPage()) {
      // v1.7.34：后台学习模式（本页无 opener）同样回列表继续
      if (backgroundAutoReady() ||
          (window.opener && !window.opener.closed)) {
        setMessage('本页可开课程已处理完，通知课程列表页刷新并继续');
        signalListToOpenNext();
        return;
      }
      // 无 opener（手动打开的详情页）：无法通知列表页，退回下方原地翻页尝试
    }

    // v1.7.28：队列耗尽但列表停在目标页之前（刷新丢页码）时，先回到
    // 记录的目标页再继续，避免从第 1 页逐页重走已完成的页（约 O(N²)）。
    if (isListPage()) {
      const domPage = readCurrentPageFromDom();
      const target = Math.max(1, parseInt(state.pageNumber, 10) || 1);

      if (domPage && target > domPage) {
        setMessage(`回到第 ${target} 页继续寻找未完成课程`);
        restoreTargetPage(() => {
          if (!isRunning()) return;
          if (tryNextPage()) return;
          pauseAuto('当前页未完成课程队列已处理完，未找到可用的下一页');
        });
        return;
      }
    }

    if (tryNextPage()) return;

    pauseAuto('当前页未完成课程队列已处理完，未找到可用的下一页');
  }

  function findNextPageButton() {
    const buttons = [...document.querySelectorAll(
      'button, a, .el-pagination button, .el-pagination li'
    )];

    return buttons.find(el => {
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
  }

  // v1.7.19：翻页成功后的队列重建。新页课程 ID 来自翻页后的接口返回，
  // 慢网络下原来的单次 1.8 秒等待可能识别不全，导致 buildQueue 失败并
  // 直接暂停自动化（用户需手动点"开始学习"）。现改为每 2 秒重试
  // buildQueue，最多等 30 秒，全部识别成功后再继续。
  function rebuildQueueAfterFlip() {
    const startedAt = Date.now();

    function attempt() {
      if (!isRunning()) return;

      if (buildQueue()) {
        // v1.7.28：页码以分页器高亮为准（绝对读数），读不到再退回自增，
        // 避免漂移的计数在多页场景越走越偏。
        const domPage = readCurrentPageFromDom();
        state.pageNumber = domPage || (state.pageNumber + 1);
        saveState();

        if (state.queue.length) {
          openNextCourse();
        } else {
          setMessage('当前页没有需要学习的课程，继续寻找下一页');

          if (!tryNextPage()) {
            pauseAuto('后续页面没有可继续学习的课程');
          }
        }
        return;
      }

      if (Date.now() - startedAt >= 30000) {
        pauseAuto(
          '新页面课程 ID 识别超时（30 秒），请稍后点击"开始学习"继续'
        );
        return;
      }

      setMessage('新页面课程 ID 仍在识别中，等待接口返回…');
      setTimeout(attempt, 2000);
    }

    setTimeout(attempt, 1800);
  }

  function tryNextPage(isRetry) {
    const next = findNextPageButton();

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
        rebuildQueueAfterFlip();
      } else if (attempts >= 50) {
        // v1.7.19：25 秒列表仍无变化时，重试一次翻页点击（再给 25 秒），
        // 仍失败才暂停——网络慢时不再一次点击未生效就中断自动化。
        clearInterval(timer);

        if (!isRetry) {
          setMessage('翻页后列表暂无变化，重试一次翻页点击');
          if (tryNextPage(true)) return;
        }

        pauseAuto('翻页后课程列表没有变化，请检查分页');
      }
    }, 500);

    return true;
  }

  // =========================================================
  // v1.7.28：页码校准与"回目标页"（A 方案）
  // 列表页整页刷新后分页会重置回第 1 页。此前队列耗尽时只能从第 1 页
  // 逐页重走已完成的页（每页 2~4 秒、含 ID 识别轮询），页数越多累计
  // 代价越大（约 O(N²)）。现在：以分页器高亮为准校准 state.pageNumber
  // （人工翻页时也记录），恢复/耗尽时优先"点页码直达"，分页器未渲染
  // 目标页码时连续点"下一页"快进（不逐页构建队列），回到目标页才继续。
  // =========================================================

  // 从分页器高亮项读当前页码（读失败返回 0 表示未知）
  function readCurrentPageFromDom() {
    const active = document.querySelector(
      '.el-pagination .el-pager li.is-active, ' +
      '.el-pagination .el-pager li.is-current, ' +
      '.el-pagination .el-pager [aria-current="page"], ' +
      '.el-pager li.is-active, .el-pager li.is-current'
    );
    if (!active) return 0;

    const n = parseInt(
      normalizeName(active.innerText || active.textContent || ''),
      10
    );

    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  // 找分页器里可点击的指定页码按钮（排除当前高亮与禁用项）
  function findPageNumberButton(pageNo) {
    const pager = document.querySelector('.el-pagination .el-pager') ||
      document.querySelector('.el-pager');
    if (!pager) return null;

    const items = [...pager.querySelectorAll('li, button')];

    return items.find(el => {
      const text = normalizeName(el.innerText || el.textContent || '');
      if (text !== String(pageNo)) return false;

      const active =
        el.classList.contains('is-active') ||
        el.classList.contains('is-current') ||
        el.getAttribute('aria-current') === 'page';
      const disabled =
        el.classList.contains('disabled') ||
        el.getAttribute('aria-disabled') === 'true' ||
        el.hasAttribute('disabled');

      return !active && !disabled;
    }) || null;
  }

  // 点击某个翻页控件并等待列表内容变化（复用课程名签名对比，4 秒超时
  // 照常回调，由下一步逻辑决定去留）
  function clickAndWaitListChange(el, message, callback) {
    const before = getCourseList().map(item => item.name).join('|');
    if (message) setMessage(message);

    try { el.click(); } catch (_) { callback(); return; }

    let attempts = 0;

    const timer = setInterval(() => {
      attempts++;

      const after = getCourseList().map(item => item.name).join('|');

      if (after && after !== before) {
        clearInterval(timer);
        setTimeout(callback, 400);  // 留一点渲染缓冲
      } else if (attempts >= 8) {
        clearInterval(timer);
        callback();
      }
    }, 500);
  }

  // v1.7.38：等待分页器渲染完成。整页加载后列表与分页器是异步出现的，
  // 恢复页码前要先等到分页器可读；与自动化运行状态无关（暂停时也等待）。
  function waitForPagerReady(callback, timeoutMs = 12000) {
    const startedAt = Date.now();

    const timer = setInterval(() => {
      const domPage = readCurrentPageFromDom();

      if (domPage > 0 || Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        callback(domPage);
      }
    }, 500);
  }

  // 回到 state.pageNumber 记录的目标页：优先直接点页码（1 次到位），
  // 分页器没渲染目标页码时连续点"下一页"快进。全程不构建队列。
  // v1.7.38：新增 allowPaused —— 手动"返回列表"后用户通常是暂停态，
  // 此时也要能恢复页码；原有调用点不传该参数，行为完全不变。
  function restoreTargetPage(done, allowPaused) {
    const target = Math.max(1, parseInt(state.pageNumber, 10) || 1);
    if (target <= 1) { done(); return; }

    let steps = 0;
    const maxSteps = target + 3;

    function finish() {
      const landed = readCurrentPageFromDom();
      if (landed) {
        state.pageNumber = landed;
        saveState();
      }
      done();
    }

    function step() {
      if (!isRunning() && !allowPaused) { done(); return; }

      const current = readCurrentPageFromDom();
      if (current >= target || steps >= maxSteps) { finish(); return; }

      const direct = findPageNumberButton(target);

      if (direct) {
        steps++;
        clickAndWaitListChange(
          direct,
          `恢复到第 ${target} 页（当前第 ${current || '未知'} 页）`,
          step
        );
        return;
      }

      const next = findNextPageButton();
      if (!next) { finish(); return; }

      steps++;
      clickAndWaitListChange(next, null, step);
    }

    step();
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

  // =========================================================
  // v1.7.18：课程列表页会话保活（v1.7.20 起只保活、不做登录态检测）
  // =========================================================
  // 背景：平台会话疑似为滑动过期——一段时间无请求即登出；两个标签
  // （列表/播放）共享同一 Cookie 会话，因此只需列表页单独保活即可。
  // 播放页在播放时平台天然有秒级进度上报，无需任何处理。
  //
  // 实现要点：
  // 1. Web Worker 定时器：隐藏标签页的 Worker 不受浏览器后台降频
  //    （普通 setInterval 后台最坏被压到约 1 小时一次），保证间隔严格兑现；
  //    Worker 创建失败时降级为页面定时器。
  // 2. 心跳 = 一次同源轻量 GET（优先重放最近的课程列表接口，未捕获时
  //    退回当前页面地址），纯后台网络活动：不改标题、不碰焦点，
  //    完全不影响用户在其他标签页的工作。
  // 3. v1.7.20：移除登录态检测与告警。原实现用 401/403 状态码、重定向
  //    URL 关键字、响应体文案三类启发式判定是否被登出，实际会误报
  //    （登录状态良好也弹"登录已失效"横幅）——平台真实登出表现为整页
  //    跳转 OA 登录页（URL 变化），页面自己会给出信号，无需靠猜响应。
  //    故降级为纯保活：只发心跳维持会话，不做任何登出判定。
  const KEEPALIVE_MIN_MINUTES = 5;
  const KEEPALIVE_MAX_MINUTES = 60;

  function keepAliveEnabled() {
    return state.keepAlive !== false;
  }

  function getKeepAliveMinutes() {
    let minutes = parseInt(state.keepAliveMinutes, 10);
    if (!Number.isFinite(minutes)) minutes = 10;
    return Math.min(
      KEEPALIVE_MAX_MINUTES,
      Math.max(KEEPALIVE_MIN_MINUTES, minutes)
    );
  }

  function createKeepAliveWorker() {
    try {
      const code = [
        'let timer = null;',
        'onmessage = function (e) {',
        '  if (timer) clearInterval(timer);',
        '  timer = null;',
        '  const ms = e && e.data && e.data.intervalMs;',
        '  if (ms > 0) {',
        '    timer = setInterval(function () { postMessage(Date.now()); }, ms);',
        '  }',
        '};'
      ].join('\n');

      const url = URL.createObjectURL(
        new Blob([code], { type: 'text/javascript' })
      );
      const worker = new Worker(url);
      URL.revokeObjectURL(url);

      worker.onmessage = function () { runKeepAliveBeat(); };
      return worker;
    } catch (error) {
      console.warn('[铁塔助手] 保活 Worker 创建失败，降级为页面定时器', error);
      return null;
    }
  }

  // 应用当前保活设置（开关/间隔变化时调用）
  function applyKeepAliveInterval() {
    const ms = getKeepAliveMinutes() * 60 * 1000;

    if (keepAliveWorker) {
      keepAliveWorker.postMessage({
        intervalMs: keepAliveEnabled() ? ms : 0
      });
      return;
    }

    // 降级路径：页面定时器（后台可能被浏览器降频）
    if (keepAliveFallbackTimer) {
      clearInterval(keepAliveFallbackTimer);
      keepAliveFallbackTimer = null;
    }
    if (keepAliveEnabled()) {
      keepAliveFallbackTimer = setInterval(runKeepAliveBeat, ms);
    }
  }

  function startKeepAlive() {
    if (!keepAliveWorker && !keepAliveFallbackTimer) {
      keepAliveWorker = createKeepAliveWorker();
    }
    applyKeepAliveInterval();
  }

  function runKeepAliveBeat() {
    // 播放页不需要保活（播放时平台天然有活动请求），心跳只在列表页执行
    if (isDetailPage()) return;
    if (!keepAliveEnabled()) return;

    keepAliveLastBeatAt = Date.now();

    // 优先重放最近捕获的课程列表接口；尚未捕获时退回当前页面地址
    //（SPA 文档请求同样能焐热会话）。
    const url = lastCourseListApiUrl || location.href;

    // v1.7.20：纯保活，只发请求焐热会话，不解析响应、不做登录态判定
    //（此前的状态码/重定向/响应体启发式检测会误报，已按用户决定移除）。
    originalFetch.call(window, url, {
      credentials: 'include',
      cache: 'no-store'
    }).then(() => {}).catch(() => {
      // 网络瞬断/离线静默忽略，下个周期再试
    });
  }

  // 标签切回前台时立即补发一次心跳（限制最小间隔 60 秒，避免频繁切换刷请求）
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!keepAliveEnabled() || isDetailPage()) return;
    if (Date.now() - keepAliveLastBeatAt > 60000) runKeepAliveBeat();
  });

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
          <button id="tsh-back-list" class="secondary" title="暂停当前学习并回到课程列表（会恢复到离开前的页码）：后台模式下同一标签返回，双标签模式下关闭本播放标签">返回列表</button>
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
          <label for="tsh-keepalive" title="列表页定期向平台发轻量请求保持登录会话，防止挂机久了被登出；全程后台运行不改标题不碰焦点，不影响其他工作">
            <input type="checkbox" id="tsh-keepalive"> 会话保活
          </label>
          <select id="tsh-keepalive-interval" title="保活心跳间隔">
            <option value="5">5分钟</option>
            <option value="10">10分钟</option>
            <option value="15">15分钟</option>
            <option value="30">30分钟</option>
            <option value="60">60分钟</option>
          </select>
        </div>
        <div class="tsh-speed">
          <label for="tsh-course-order" title="决定点“开始学习”后的选课顺序；学完一课后按此顺序继续下一课">
            选课顺序
          </label>
          <select id="tsh-course-order" title="选课顺序：顺序学习/倒序学习/高学时优先/低学时优先">
            <option value="forward">顺序学习</option>
            <option value="reverse">倒序学习</option>
            <option value="hoursHigh">高学时优先</option>
            <option value="hoursLow">低学时优先</option>
          </select>
        </div>
        <div class="tsh-speed">
          <label for="tsh-background" title="开启后：课程列表与播放页在同一个标签内后台完成切换，不新开标签、不抢焦点；取消勾选则恢复原来的新标签打开方式">
            <input type="checkbox" id="tsh-background"> 后台学习
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

    const backToListButton = panel.querySelector('#tsh-back-list');

    if (backToListButton) {
      backToListButton.addEventListener('click', goBackToCourseList);
    }

    panel.querySelector('#tsh-refresh').addEventListener('click', () => {
      lastListSignature = '';
      refreshPanel();
      setMessage('已刷新课程识别结果');
    });

    // v1.7.37：移除面板"导出 ID"按钮。该按钮只是把脚本自动采集维护的
    // "课程名 → 课程 ID"库导出成 JSON，属早期逆向平台 ID 格式时的排障入口，
    // 日常无用（课程 ID 在面板课程列表里逐条可见）。
    // 采集与存储逻辑（readStore/saveCourseId/getCourseId + STORE_KEY）保持不变；
    // 需要排障导出时在页面控制台执行：
    //   copy(localStorage.getItem('towerStudyHelperCourseIdsV1'))

    const speedEnable = panel.querySelector('#tsh-speed-enable');
    const speedRate = panel.querySelector('#tsh-speed-rate');

    if (speedEnable) {
      speedEnable.addEventListener('change', () => {
        // v1.7.29：写设置前先读回最新状态，避免列表页运行中的旧内存
        // 覆盖播放页刚记录的进度（与选课顺序同类问题的加固）。
        state = loadState();
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
        state = loadState();  // v1.7.29：写设置前先读回最新状态
        state.playbackRate = parseFloat(speedRate.value) || 1;
        saveState();
        if (state.speedEnabled) {
          applyPlaybackRate();
          setMessage(`倍速档位已切换为：${state.playbackRate}x`);
        }
        refreshPanel();
      });
    }

    const keepAliveEnable = panel.querySelector('#tsh-keepalive');
    const keepAliveIntervalSel =
      panel.querySelector('#tsh-keepalive-interval');

    if (keepAliveEnable) {
      keepAliveEnable.addEventListener('change', () => {
        state = loadState();  // v1.7.29：写设置前先读回最新状态
        state.keepAlive = keepAliveEnable.checked;
        saveState();
        applyKeepAliveInterval();
        if (state.keepAlive) {
          // 立即焐一下，同时完成一次登录态检测
          runKeepAliveBeat();
          setMessage(
            `已开启会话保活：每 ${getKeepAliveMinutes()} 分钟一次，仅列表页后台运行`
          );
        } else {
          setMessage('已关闭会话保活');
        }
        refreshPanel();
      });
    }

    if (keepAliveIntervalSel) {
      keepAliveIntervalSel.addEventListener('change', () => {
        state = loadState();  // v1.7.29：写设置前先读回最新状态
        state.keepAliveMinutes =
          parseInt(keepAliveIntervalSel.value, 10) || 10;
        saveState();
        applyKeepAliveInterval();
        setMessage(`会话保活间隔已改为 ${getKeepAliveMinutes()} 分钟`);
        refreshPanel();
      });
    }

    const courseOrderSel = panel.querySelector('#tsh-course-order');

    if (courseOrderSel) {
      courseOrderSel.addEventListener('change', () => {
        // v1.7.26：先从 localStorage 读回最新状态再写（与 handleNextRequest
        // 同策略），避免列表/播放双标签场景下用旧内存状态覆盖另一标签的进度。
        state = loadState();
        state.courseOrder = normalizeCourseOrder(courseOrderSel.value);

        // 已构建的队列立即按新顺序重排剩余部分（已开始的部分保持原位），
        // 保证"一旦选定，学完当前课后后续课程按设定顺序开展"。
        if (
          Array.isArray(state.queue) &&
          state.queue.length > state.queueIndex + 1
        ) {
          const head = state.queue.slice(0, state.queueIndex + 1);
          const tail = sortCoursesByOrder(state.queue.slice(state.queueIndex + 1));
          state.queue = head.concat(tail);
        }

        // v1.7.29：跳过详情页采纳逻辑——本页刚改的值就是最新值，
        // 不可被远端旧值覆盖回去。
        saveState({ skipAdoptSettings: true });
        setMessage(
          `选课顺序已设为：${courseOrderLabel(state.courseOrder)}` +
          `（${courseOrderDesc(state.courseOrder)}）`
        );
        refreshPanel();
      });
    }

    const backgroundToggle = panel.querySelector('#tsh-background');

    if (backgroundToggle) {
      backgroundToggle.addEventListener('change', () => {
        // 与其它设置一致：写前先读回最新状态，避免覆盖它处刚写的进度
        state = loadState();
        state.backgroundMode = backgroundToggle.checked;
        saveState({ skipAdoptSettings: true });

        if (state.backgroundMode) {
          markBackgroundTab();
          setMessage('已开启后台学习：课程列表与播放页在同一标签内后台切换，不抢焦点');
        } else if (isRunning()) {
          // 运行中关闭：本轮仍按后台方式跑完（半途切换会让列表页缺失、
          // 交接信号无处可去），下次点"开始学习"后恢复新标签方式
          setMessage('已关闭后台学习：本轮仍按后台方式继续，下次开始学习后恢复新标签方式');
        } else {
          clearBackgroundTab();
          setMessage('已关闭后台学习：恢复新标签打开方式');
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
    const keepAliveEnable = panel.querySelector('#tsh-keepalive');
    const keepAliveIntervalSel =
      panel.querySelector('#tsh-keepalive-interval');
    const courseOrderSel = panel.querySelector('#tsh-course-order');
    const backgroundToggle = panel.querySelector('#tsh-background');

    if (!status || !route || !count || !list) return;

    if (speedEnable) speedEnable.checked = Boolean(state.speedEnabled);
    if (speedRate) speedRate.value = String(state.playbackRate || 1);
    if (keepAliveEnable) keepAliveEnable.checked = keepAliveEnabled();
    if (keepAliveIntervalSel) {
      keepAliveIntervalSel.value = String(getKeepAliveMinutes());
    }
    if (courseOrderSel) {
      courseOrderSel.value = normalizeCourseOrder(state.courseOrder);
    }
    if (backgroundToggle) {
      backgroundToggle.checked = isBackgroundMode();
    }

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

    // v1.7.34：后台学习模式下把本次运行的标签标记为"后台自动化标签"
    // （sessionStorage 仅本标签可见）；关闭勾选时清除标记恢复原行为。
    if (isBackgroundMode()) markBackgroundTab();
    else clearBackgroundTab();

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

    // v1.7.28：开始学习时以当前显示页为准（人工翻到某页再开始即从该页起）
    const startPage = readCurrentPageFromDom();
    if (startPage && startPage !== state.pageNumber) {
      state.pageNumber = startPage;
      saveState();
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

    // v1.7.18：会话保活（Worker 定时器，默认开启，仅列表页生效）
    startKeepAlive();

    if (isRunning()) resumeTimers();

    // v1.7.38：手动"返回列表"（后台/同标签返回）后恢复离开前的页码。
    // 由自动化交接驱动的回列表（resumeOpenNext）会自行恢复目标页，标记作废。
    if (isListPage() && state.restorePageOnReturn) {
      const target = Math.max(1, parseInt(state.pageNumber, 10) || 1);
      const autoHandoff = Boolean(state.resumeOpenNext);

      state.restorePageOnReturn = false;
      saveState();

      if (target > 1 && !autoHandoff) {
        setMessage(`正在回到第 ${target} 页…`);

        waitForPagerReady(() => {
          if (!isListPage()) return;

          restoreTargetPage(() => {
            const landed = Math.max(1, parseInt(state.pageNumber, 10) || 1);

            setMessage(
              landed === target
                ? `已回到第 ${target} 页`
                : `已回到第 ${landed} 页（目标第 ${target} 页）`
            );
          }, true);
        });
      }
    }

    // 由播放页完成信号触发的刷新后，自动打开下一门课程。
    if (isRunning() && isListPage() && state.resumeOpenNext) {
      state.resumeOpenNext = false;
      saveState();

      // v1.7.23：刷新后不急着开课。先等课程列表卡片渲染完成且数据签名
      // 连续 2 秒不变（说明列表数据已加载稳定），并至少缓冲 3 秒让平台
      // 把刚学完课程的状态回传到列表，然后才重新获取状态、选择下一课；
      // 最长等 12 秒兜底，超时也照常尝试（此时靠已学完清单硬跳过兜底）。
      setMessage('列表已刷新，正在等待课程状态数据就绪…');

      const startedAt = Date.now();
      let lastSig = null;
      let stableSince = 0;

      const readyTimer = setInterval(() => {
        if (!isRunning()) {
          clearInterval(readyTimer);
          return;
        }

        const courses = getCourseList();
        const sig = courses
          .map(c => `${c.name}|${c.status}`)
          .join(';;');
        const now = Date.now();

        if (!courses.length) {
          lastSig = null;
          stableSince = 0;
        } else if (sig === lastSig) {
          if (!stableSince) stableSince = now;
        } else {
          lastSig = sig;
          stableSince = now;
        }

        const stableFor = stableSince ? now - stableSince : 0;
        const ready = stableFor >= 2000 && now - startedAt >= 3000;
        const timedOut = now - startedAt >= 12000;

        if (!ready && !timedOut) return;

        clearInterval(readyTimer);
        if (!isRunning()) return;

        // v1.7.28：刷新后分页重置回第 1 页，先恢复到学完课程所在的目标
        // 页再继续（开课本身按 ID 与页无关，恢复是为了面板显示正确、且
        // 队列耗尽时直接从目标页续走，不必从第 1 页逐页重走）。
        const resumeTargetPage =
          Math.max(1, parseInt(state.pageNumber, 10) || 1);
        const resumeDomPage = readCurrentPageFromDom();

        if (resumeTargetPage > 1 && (!resumeDomPage || resumeDomPage < resumeTargetPage)) {
          setMessage(`列表已刷新，恢复到第 ${resumeTargetPage} 页继续`);

          restoreTargetPage(() => {
            if (!isRunning()) return;
            setMessage(
              ready
                ? '课程状态数据已就绪，正在打开下一门课程'
                : '等待课程状态数据超时，尝试打开下一门课程'
            );
            openNextCourse();
          });
          return;
        }

        setMessage(
          ready
            ? '课程状态数据已就绪，正在打开下一门课程'
            : '等待课程状态数据超时，尝试打开下一门课程'
        );
        openNextCourse();
      }, 500);
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
