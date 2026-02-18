(() => {
  const app = document.getElementById("app");

  // 設定
  const SAVE_KEY = "mosaic_save";
  const MAX_STAGE = 10;

  // 耐久時間
  const STAGE_SECONDS = 15.0;

  //外れても耐えられる量（大きいほど猶予が増える)
  const MAX_DANGER = 200;//70;
  //外れている時に危険度が増える速さ（小さいほど猶予が増える）
  const DANGER_GAIN_PER_SEC = 50;

  //覆えている時に危険度が減る速さ
  const DANGER_LOSS_PER_SEC = 40;

//ステージ名
  const STAGE_NAMES = {
  1: "男のゾウ",
  2: "吉岡の貯金",
  3: "有名子役の名台詞",
  4: "なにかの人数が見えるメガネ",
  5: "竹下の脳内",
  6: "地獄",
  7: "えっちな画像",
  8: "90分2万7千円",
  9: "涼森れむ",
  10: "白"
};

//BGM
const BGM = {
  title: "audio/bgm_title.mp3",
  stageSelect: "audio/bgm_select.mp3",
  stage: "audio/bgm_stage.mp3",
};

//BGM管理
const bgmAudio = new Audio();
bgmAudio.loop = true;
bgmAudio.volume = 0.35;

let currentBgmKey = null;

function playBgmForScreen(scr) {
  const src = BGM[scr];
  if (!src) return;

  // 同じ曲なら何もしない
  if (currentBgmKey === scr && !bgmAudio.paused) return;

  currentBgmKey = scr;

  // 曲を切り替え
  bgmAudio.pause();
  bgmAudio.currentTime = 0;
  bgmAudio.src = src;

  // autoplay制限対策：失敗しても落とさない
  bgmAudio.play().catch(() => {
    // 最初のクリックまでは再生できないことがある（仕様）
  });
}

function stopBgm() {
  currentBgmKey = null;
  bgmAudio.pause();
  bgmAudio.currentTime = 0;
}


//SE
const SE = {
  clear: "audio/se_clear.mp3",
  fail: "audio/se_fail.mp3",
};

const seAudio = new Audio();
seAudio.volume = 0.8;

function playSe(type) {
  const src = SE[type];
  if (!src) return;

  seAudio.currentTime = 0;
  seAudio.src = src;
  seAudio.play().catch(() => {});
}

  // ===== util =====
  function clampInt(n, min, max) {
    n = Number(n);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, Math.floor(n)));
  }

  // ===== セーブI/O =====
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data.unlockedStage !== "number") return null;
      return { unlockedStage: clampInt(data.unlockedStage, 1, MAX_STAGE) };
    } catch {
      return null;
    }
  }
  function writeSave(s) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  }
  function clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  // ===== 状態 =====
  let save = loadSave(); // null ならデータ無し
  let screen = "boot"; // 最初はクリック待ち
  let currentStage = 1;
  let lastResult = null; // { type, stage, message, unlockTo? }
  let rafId = null;

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function setScreen(next) {
  stopLoop();
  screen = next;

  // ★ 画面に応じてBGM切り替え
  if (screen === "title") playBgmForScreen("title");
  else if (screen === "stageSelect") playBgmForScreen("stageSelect");
  else if (screen === "stage") playBgmForScreen("stage");
  else stopBgm(); // result などは止めたいなら

  render();
}


  // ===== 画面描画 =====
  function render() {
  if (screen === "boot") renderBoot();
  else if (screen === "title") renderTitle();
  else if (screen === "stageSelect") renderStageSelect();
  else if (screen === "stage") renderStage();
  else if (screen === "result") renderResult();
}

function renderBoot() {
  app.innerHTML = `
    <div class="center">
      <div class="card">
        <h1 class="title">カクシタイ</h1>
    

        <div class="btns">
          <button id="btnStart">クリックして開始</button>
        </div>

        <p class="subtitle" style="margin-top:12px;">
          【遊び方】<br>
          ・モザイクをドラッグして枠を隠す<br>
          ・外れると危険度が上昇<br>
          ・時間切れまで隠せたらCLEAR
        </p>
      </div>
    </div>
  `;

  document.getElementById("btnStart").onclick = () => {
    // ユーザー操作 → ここからBGMが確実に鳴る
    setScreen("title");
  };
}


  // ===== タイトル =====
  function renderTitle() {
    const hasSave = !!save;

    app.innerHTML = `
      <div class="center">
        <div class="card">
          <h1 class="title">カクシタイ</h1>
          <p class="subtitle">～見たくないものを隠せ～</p>

           <img src="images/mosaic.jpg" alt=""
          style="
            display:block;
            width:100%;
            max-width:420px;
            margin: 0 auto 14px;
            border-radius:14px;
            box-shadow: 0 10px 30px rgba(0,0,0,.35);
          "
        />

          <div class="btns">
            ${hasSave ? `<button id="btnContinue">つづきから</button>` : ""}
            <button id="btnNew">はじめから</button>
          </div>

          <div class="row">
            <span class="badge">${hasSave ? `解放：ステージ${save.unlockedStage}まで` : "セーブなし"}</span>
            ${hasSave ? `<button id="btnReset">データ削除</button>` : ""}
          </div>
        </div>
      </div>
    `;

    document.getElementById("btnNew").onclick = () => {
      save = { unlockedStage: 1 };
      writeSave(save);
      setScreen("stageSelect");
    };

    if (hasSave) {
      document.getElementById("btnContinue").onclick = () => setScreen("stageSelect");
      document.getElementById("btnReset").onclick = () => {
        clearSave();
        save = null;
        setScreen("title");
      };
    }
  }

// ===== ステージ選択 =====
function renderStageSelect() {
  if (!save) {
    save = { unlockedStage: 1 };
    writeSave(save);
  }

  const unlocked = clampInt(save.unlockedStage, 1, MAX_STAGE);

  const buttons = Array.from({ length: MAX_STAGE }, (_, i) => {
    const n = i + 1;
    const locked = n > unlocked;

    const thumb = locked
      ? "images/locked.jpg"
      : `images/stage${n}.jpg`;

    const title = locked
  ? "LOCKED"
  : `STAGE ${n}：${STAGE_NAMES[n] || ""}`;


    return `
      <button class="stageCard" data-stage="${n}" ${locked ? "disabled" : ""}>
        <img src="${thumb}" alt="">
        <div class="stageLabel">${title}</div>
      </button>
    `;
  }).join("");

  app.innerHTML = `
    <div class="center">
      <div class="card">
        <h2 class="title">ステージ選択</h2>
        <div class="grid">
          ${buttons}
        </div>

        <div class="row">
          <button id="btnBack">タイトルへ</button>
          <button id="btnReset">データ削除</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btnBack").onclick = () => setScreen("title");

  document.getElementById("btnReset").onclick = () => {
    clearSave();
    save = null;
    setScreen("title");
  };

  app.querySelectorAll(".stageCard").forEach(btn => {
    btn.onclick = () => {
      if (btn.disabled) return;

      currentStage = Number(btn.dataset.stage);
      setScreen("stage");
    };
  });
}


  // ===== ステージ画面 =====
  function renderStage() {
    if (!save) {
      save = { unlockedStage: 1 };
      writeSave(save);
    }

    // ★ ステージ画像
    const stageImg = `images/stage${currentStage}.jpg`;

    // ★ 枠（ターゲット）の初期位置・サイズ（ステージごと）
    const TARGET_POS = {
      1: { left: "45%", top: "50%", w: 150, h: 150 },
      2: { left: "30%", top: "60%", w: 150, h: 150 },
      3: { left: "73%", top: "30%", w: 160, h: 160 },
      4: { left: "50%", top: "15%", w: 140, h: 90 },
      5: { left: "60%", top: "45%", w: 140, h: 180 },
      6: { left: "50%", top: "65%", w: 120, h: 110 },
      7: { left: "50%", top: "65%", w: 150, h: 140 },
      8: { left: "50%", top: "20%", w: 140, h: 120 },
      9: { left: "50%", top: "65%", w: 150, h: 140 },
      10: { left: "30%", top: "55%", w: 160, h: 160 },
    };
    const t = TARGET_POS[currentStage];

    // ★ モザイクの初期位置・サイズ（ステージごと）
    const MOSAIC_POS = {
      1: { left: "10%", top: "15%", w: 180, h: 180 },
      2: { left: "20%", top: "80%", w: 180, h: 180 },
      3: { left: "20%", top: "55%", w: 190, h: 190 },
      4: { left: "50%", top: "50%", w: 170, h: 120 },
      5: { left: "20%", top: "25%", w: 170, h: 200 },
      6: { left: "30%", top: "55%", w: 150, h: 120 },
      7: { left: "50%", top: "55%", w: 170, h: 160 },
      8: { left: "50%", top: "55%", w: 180, h: 120 },
      9: { left: "50%", top: "55%", w: 175, h: 160 },
      10: { left: "50%", top: "55%", w: 180, h: 180 },
    };
    const m0 = MOSAIC_POS[currentStage];

    // ★ 背景（ステージ画像）の表示位置（ステージごと）
    // ★ 背景（ステージ画像）の表示設定（ステージごと）
// fit: "cover" or "contain"
// pos: "50% 50%" みたいに指定（左上=0% 0%, 右下=100% 100%）
// scale: 1.0 が等倍、.2で少しズーム、1.5でかなりズーム
const BG_CFG = {
  1: { fit: "cover",  pos: "50% 50%", scale: 1.2 },
  2: { fit: "cover",  pos: "50% 30%", scale: 1.1},
  3: { fit: "cover",  pos: "100% 40%", scale: 1.0 },
  4: { fit: "cover",  pos: "50% 50%", scale: 1.0 },
  5: { fit: "cover",  pos: "60% 50%", scale: 1.25 },
  6: { fit: "cover",  pos: "50% 50%", scale: 1.8 },
  7: { fit: "cover",  pos: "70% 50%", scale: 1.9 },
  8: { fit: "cover",  pos: "50% 80%", scale: 1.2 },
  9: { fit: "cover",  pos: "50% 50%", scale: 2.0 },
  10:{ fit: "cover",  pos: "50% 50%", scale: 1.0 },
};

const bg = BG_CFG[currentStage] || { fit: "cover", pos: "50% 50%", scale: 1.0 };

    app.innerHTML = `
  <div class="center">
    <div class="card">
      <h2 class="title" style="font-size:22px;margin-bottom:8px;">
        STAGE ${currentStage}：${STAGE_NAMES[currentStage] || ""}
      </h2>

      <div class="stageLayout">
        <!-- 左：ゲーム画面 -->
        <div id="stageArea" class="stageArea">
          <img src="${stageImg}" alt=""
            style="
              position:absolute; inset:0;
              width:100%; height:100%;
              object-fit: cover;
              object-position:${bg.pos};
              transform: scale(${bg.scale});
              filter: blur(18px) brightness(.85);
              z-index:1;
            " />

          <img src="${stageImg}" alt=""
            style="
              position:absolute; inset:0;
              width:100%; height:100%;
              object-fit: contain;
              object-position:${bg.pos};
              transform: scale(${bg.scale});
              z-index:2;
            " />

          <img id="target" src="images/frame.png" alt=""
            style="
              position:absolute;
              left:${t.left};
              top:${t.top};
              width:${t.w}px;
              height:${t.h}px;
              transform:translate(-50%,-50%);
              pointer-events:none;
              z-index:3;
            "
          />

          <div id="mosaic" style="
            position:absolute;
            left:${m0.left};
            top:${m0.top};
            width:${m0.w}px;
            height:${m0.h}px;
            transform:translate(-50%,-50%);
            border-radius:6px;
            cursor:grab;
            touch-action:none;
            user-select:none;
            outline:1px solid rgba(255,255,255,.18);
            box-shadow: 0 10px 30px rgba(0,0,0,.4);
            z-index:4;
          "></div>
        </div>

        <!-- 右：情報・操作 -->
        <div class="sidePanel">
          <div class="hud">
            <div>残り：<span id="time">${STAGE_SECONDS.toFixed(1)}</span>s</div>

            <div class="dangerBarRow">
              <span>危険度</span>
              <div class="dangerBar">
                <div id="dangerFill" class="dangerFill"></div>
              </div>
            </div>

            <div id="msg" class="msgPill">点線の枠に自主規制君(吉岡)をドラッグして隠し続けろ</div>

          <div class="row">
            <button id="btnBack">ステージ選択へ</button>
            <button id="btnRetry">やり直し</button>
          </div>
        </div>
      </div>
    </div>
  </div>
`;


    document.getElementById("btnBack").onclick = () => setScreen("stageSelect");
    document.getElementById("btnRetry").onclick = () => setScreen("stage");

    const targetImg = document.getElementById("target");
    targetImg.onload = () => runStage();
    targetImg.onerror = () => runStage();
  }

 function renderResult() {
  if (!lastResult) return setScreen("stageSelect");

  const isClear = lastResult.type === "clear";
  const resultImg = isClear
    ? `images/clear_stage${lastResult.stage}.jpg`
    : `images/fail.jpg`;

  // ★ クリア時に解放を保存（ここが重要）
  if (isClear) {
    if (!save) save = { unlockedStage: 1 };

    const nextUnlock = Math.min(lastResult.stage + 1, MAX_STAGE);
    if (save.unlockedStage < nextUnlock) {
      save.unlockedStage = nextUnlock;
      writeSave(save);
    }
  }

  app.innerHTML = `
    <div class="center">
      <div class="card">
        <h2 class="title" style="font-size:26px;margin-bottom:8px;">
          ${isClear ? "CLEAR!" : "OUT…"}
        </h2>

        <img src="${resultImg}" alt=""
          style="display:block;width:100%;max-width:320px;margin: 10px auto 12px;border-radius:14px;border:1px solid rgba(255,255,255,.18);" />

        <p class="subtitle">${lastResult.message}</p>

        ${
          isClear
            ? `<div class="badge" style="margin:10px 0;">次のステージが解放されました</div>`
            : ""
        }

        <div class="row">
          <button id="btnToSelect">ステージ選択へ</button>
          ${!isClear ? `<button id="btnRetry">やり直し</button>` : ""}
        </div>
      </div>
    </div>
  `;

  document.getElementById("btnToSelect").onclick = () => setScreen("stageSelect");

  if (!isClear) {
    document.getElementById("btnRetry").onclick = () => {
      currentStage = lastResult.stage;
      setScreen("stage");
    };
  }
}


  // ===== ステージ進行（共通） =====
  function runStage() {
    const stage = document.getElementById("stageArea");
    const target = document.getElementById("target");
    const mosaic = document.getElementById("mosaic");
    const timeEl = document.getElementById("time");
    const dangerFill = document.getElementById("dangerFill");
    const msgEl = document.getElementById("msg");

    // ★ モザイク画像（固定）
    mosaic.style.background = `url("images/mosaic.jpg") center / cover no-repeat`;

    // --- ドラッグ ---
    let dragging = false;
    let ox = 0, oy = 0;

    mosaic.onpointerdown = (e) => {
      dragging = true;
      mosaic.setPointerCapture(e.pointerId);
      const r = mosaic.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
    };
    mosaic.onpointermove = (e) => {
      if (!dragging) return;
      const s = stage.getBoundingClientRect();
      const x = e.clientX - s.left - ox;
      const y = e.clientY - s.top - oy;
      mosaic.style.left = `${x}px`;
      mosaic.style.top = `${y}px`;
      mosaic.style.transform = "none";
    };
    mosaic.onpointerup = () => (dragging = false);
    mosaic.onpointercancel = () => (dragging = false);

    // --- 判定 ---
    function rectInStage(el) {
      const r = el.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
    }
    function isCovered() {
  const t = rectInStage(target);
  const m = rectInStage(mosaic);

  // --- 調整ポイント ---
  const shrink = 5; // 枠を内側に縮める(px) ←「枠をモザイクより少し小さく」したいならココ
  const slack  = 4;  // 多少ズレてもOKにする(px) ←「完全一致じゃなくてもいい」ならココ
  // -------------------

  // 判定用に枠(t)を縮めたrectを作る
  const tt = {
    x: t.x + shrink,
    y: t.y + shrink,
    w: Math.max(0, t.w - shrink * 2),
    h: Math.max(0, t.h - shrink * 2),
  };

  // モザイクが「縮めた枠」を覆ってるか（slack分だけ甘くする）
  return (
    m.x <= tt.x + slack &&
    m.y <= tt.y + slack &&
    m.x + m.w >= tt.x + tt.w - slack &&
    m.y + m.h >= tt.y + tt.h - slack
  );
}

// --- 枠の動き ---
let targetTime = 0;
let moveTime = 0;
const WAIT = 1.5;

let started = false;
let baseLeft = 50; // WAIT明けの「その場の位置」を入れる
let baseTop  = 50;

function updateTargetMovement(dt) {
  targetTime += dt;

  // 最初は停止
  if (targetTime < WAIT) return;

  // ★ 動き開始の瞬間に、停止中の位置を保存（ここが重要）
  if (!started) {
    started = true;

    // style.left/top が空のことがあるので fallback も付ける
    const curL = parseFloat(target.style.left);
    const curT = parseFloat(target.style.top);
    if (Number.isFinite(curL)) baseLeft = curL;
    if (Number.isFinite(curT)) baseTop  = curT;

    moveTime = 0; // 動きタイマーをここで0スタート
  }

  moveTime += dt;
  const t = moveTime;

  // ★ 徐々に加速（0→1）
  const ramp = Math.min(1, moveTime / 0.5);

  // デフォルトは「停止位置」
  let x = baseLeft;
  let y = baseTop;

  if (currentStage === 1) return;

  if (currentStage === 2) {
    x = baseLeft + Math.sin(t) * 20 * ramp;

  } else if (currentStage === 3) {
    y = baseTop + Math.sin(t * 1.5) * 25 * ramp;

  } else if (currentStage === 4) {
    const speed = 1.8;
    x = baseLeft + Math.cos(t * speed) * 20 * ramp;
    y = baseTop  + Math.sin(t * speed) * 20 * ramp;

  } else if (currentStage === 5) {
    const speed = 1.6;
    const rx = 35, ry = 18;
    x = baseLeft + Math.sin(t * speed) * rx * ramp;
    y = baseTop  + Math.sin(t * speed * 2) * ry * ramp;

  } else if (currentStage === 6) {
    const speed = 2.3;
    const range = 35;
    const phase = (t * speed) % 2;
    const v = phase < 1 ? phase : 2 - phase; // 0→1→0
    x = baseLeft + (v * 2 - 1) * range * ramp;

  } else if (currentStage === 7) {
    x = baseLeft + (Math.sin(t * 0.9) * 25 + Math.sin(t * 3.2) * 8) * ramp;
    y = baseTop  + (Math.cos(t * 1.1) * 25) * ramp;

  } else if (currentStage === 8) {
const speed = 3.5;

x = baseLeft + Math.sign(Math.sin(t * speed)) * 35;
y = baseTop;


  } else if (currentStage === 9) {
x = baseLeft + Math.sin(t * 1.1) * 30 + Math.sin(t * 9.0) * 5*ramp;
y = baseTop  + Math.cos(t * 1.3) * 30 * ramp;




  }else if (currentStage === 10) {

  const CHANGE_INTERVAL = 0.8;   // 位置変更間隔（小さいほど暴れる）
  const MOVE_SPEED = 3.0;        // 移動速度（大きいほど俊敏）

  if (!target._rand) {
    target._rand = {
      timer: 0,
      tx: baseLeft,
      ty: baseTop,
      x: baseLeft,
      y: baseTop
    };
  }

  const r = target._rand;

  r.timer += dt;

  // ★ 一定時間ごとに新しい目的地
  if (r.timer > CHANGE_INTERVAL) {
    r.timer = 0;

    // 端に行きすぎない安全範囲
    r.tx = 15 + Math.random() * 70;
    r.ty = 15 + Math.random() * 70;
  }

  // ★ 徐々に目的地へ移動（滑らか）
  r.x += (r.tx - r.x) * MOVE_SPEED * dt;
  r.y += (r.ty - r.y) * MOVE_SPEED * dt;

  x = r.x;
  y = r.y;
}



  // ★ 右辺が%なので、%で入れる
  target.style.left = `${x}%`;
  target.style.top  = `${y}%`;
}



    // --- 進行 ---
    let timeLeft = STAGE_SECONDS;
    let danger = 0;
    let ended = false;

   function win() {
  ended = true;

  setTimeout(() => playSe("clear"), 180); // ★遅延（ミリ秒）

  lastResult = {
    type: "clear",
    stage: currentStage,
    message: `ステージ${currentStage} クリア！`,
    unlockTo: Math.min(currentStage + 1, MAX_STAGE),
  };

  setTimeout(() => setScreen("result"), 300);
}


    function fail() {
  ended = true;

  setTimeout(() => playSe("fail"), 120); // FAILは短めが自然

  lastResult = {
    type: "fail",
    stage: currentStage,
    message: "ざんね～ん",
  };

  setTimeout(() => setScreen("result"), 300);
}



    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      updateTargetMovement(dt);

      if (!ended) {
        const covered = isCovered();

        if (covered) {
          danger = Math.max(0, danger - DANGER_LOSS_PER_SEC * dt);
          msgEl.textContent = "OK：覆えてる";
        } else {
          danger = Math.min(MAX_DANGER, danger + DANGER_GAIN_PER_SEC * dt);
          msgEl.textContent = "WARNING：ズレてる";
        }

        dangerFill.style.width = `${((danger / MAX_DANGER) * 100).toFixed(1)}%`;

        timeLeft -= dt;
        timeEl.textContent = Math.max(0, timeLeft).toFixed(1);

        if (danger >= MAX_DANGER) fail();
        else if (timeLeft <= 0) win();
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
  }

  // 起動
 // 起動
setScreen("boot");


})();





