(function () {
  "use strict";

  var posts = Array.prototype.slice.call(document.querySelectorAll(".post"));

  if (!("IntersectionObserver" in window)) {
    posts.forEach(function (p) { p.classList.add("in-view"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      var shown = entries.filter(function (e) { return e.isIntersecting; });
      shown.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      shown.forEach(function (entry, i) {
        entry.target.style.setProperty("--d", Math.min(i * 70, 280) + "ms");
        entry.target.classList.add("in-view");
      });

      entries.forEach(function (entry) {
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
          entry.target.classList.remove("in-view");
          entry.target.style.removeProperty("--d");
        }
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -6% 0px" });

    posts.forEach(function (p) { io.observe(p); });
  }

  posts.forEach(function (post) {
    var btn = post.querySelector(".keyword");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = post.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
})();

/* ------- 一直下雨：全屏雨丝 + 玻璃水珠（不挡点击） ------- */
(function () {
  "use strict";

  var canvas = document.querySelector(".rain");
  if (!canvas) { return; }
  var ctx = canvas.getContext("2d");
  if (!ctx) { return; }

  var TAU = Math.PI * 2;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = 0, H = 0, DPR = 1;
  var streaks = [], beads = [], runners = [];
  var raf = 0, last = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fade(a) { return clamp(a, 0, 1).toFixed(3); }

  function makeStreak(anywhere) {
    return {
      x: rand(-40, W + 40),
      y: anywhere ? rand(-H, H) : rand(-H * 0.5, -20),
      len: rand(18, 62),
      vy: rand(360, 880),
      w: rand(0.6, 1.7),
      a: rand(0.05, 0.16)
    };
  }

  function makeBead() {
    var r = rand(0.9, 3.6);
    return { x: rand(0, W), y: rand(0, H), r: r, a: rand(0.12, 0.5) * (r > 2.2 ? 1 : 0.7) };
  }

  function makeRunner(anywhere) {
    return {
      x: rand(0, W),
      y: anywhere ? rand(0, H) : rand(-60, -20),
      r: rand(1.8, 4),
      vy: rand(26, 64),
      wob: rand(0, TAU),
      trail: 0,
      maxTrail: rand(50, 170)
    };
  }

  function build() {
    var i;
    streaks = [];
    var ns = Math.round(clamp((W * H) / 12000, 40, 140));
    for (i = 0; i < ns; i++) { streaks.push(makeStreak(true)); }

    beads = [];
    var nb = Math.round(clamp((W * H) / 6000, 60, 240));
    for (i = 0; i < nb; i++) { beads.push(makeBead()); }

    runners = [];
    var nr = Math.round(clamp(W / 150, 4, 12));
    for (i = 0; i < nr; i++) { runners.push(makeRunner(true)); }
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * DPR));
    canvas.height = Math.max(1, Math.round(H * DPR));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
    if (reduce) { render(); }
  }

  function drawBead(x, y, r, a) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = "rgba(0,0,0," + fade(a * 0.55) + ")";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = "rgba(255,255,255," + fade(a * 0.3) + ")";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.34, Math.max(0.45, r * 0.34), 0, TAU);
    ctx.fillStyle = "rgba(255,255,255," + fade(a * 1.5) + ")";
    ctx.fill();
  }

  function drawStreak(s) {
    var g = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.len);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255," + fade(s.a) + ")");
    ctx.strokeStyle = g;
    ctx.lineWidth = s.w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x, s.y + s.len);
    ctx.stroke();
  }

  function drawRunner(r) {
    if (r.trail > 1) {
      var top = r.y - r.trail;
      var g = ctx.createLinearGradient(r.x, top, r.x, r.y);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.75, "rgba(255,255,255,0.05)");
      g.addColorStop(1, "rgba(255,255,255,0.11)");
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(0.8, r.r * 0.85);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(r.x, top);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
    }
    drawBead(r.x, r.y, r.r, 0.55);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    var i;
    for (i = 0; i < streaks.length; i++) { drawStreak(streaks[i]); }
    for (i = 0; i < beads.length; i++) { drawBead(beads[i].x, beads[i].y, beads[i].r, beads[i].a); }
    for (i = 0; i < runners.length; i++) { drawRunner(runners[i]); }
  }

  function step(dt) {
    var i, s, r;
    for (i = 0; i < streaks.length; i++) {
      s = streaks[i];
      s.y += s.vy * dt;
      if (s.y - s.len > H) { streaks[i] = makeStreak(false); }
    }
    for (i = 0; i < runners.length; i++) {
      r = runners[i];
      r.wob += dt * 1.6;
      r.vy += 34 * dt;
      r.x += Math.sin(r.wob) * 10 * dt;
      r.y += r.vy * dt;
      r.trail = Math.min(r.maxTrail, r.trail + r.vy * dt);
      if (r.y > H + 24) { runners[i] = makeRunner(false); }
    }
  }

  function frame(now) {
    if (!last) { last = now; }
    step(Math.min(0.05, (now - last) / 1000));
    last = now;
    render();
    raf = window.requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  if (!reduce) { raf = window.requestAnimationFrame(frame); }

  document.addEventListener("visibilitychange", function () {
    if (reduce) { return; }
    if (document.hidden) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      last = 0;
      raf = window.requestAnimationFrame(frame);
    }
  });
})();

/* ------- 右下角音乐播放器（进入页面自动播放） ------- */
(function () {
  "use strict";

  var wrap = document.getElementById("music");
  var btn = document.getElementById("musicBtn");
  var audio = document.getElementById("bgm");
  var bar = document.getElementById("musicBar");
  if (!wrap || !btn || !audio) { return; }

  var R = 22;
  var C = 2 * Math.PI * R;
  if (bar) {
    bar.style.strokeDasharray = C.toFixed(2);
    bar.style.strokeDashoffset = C.toFixed(2);
  }

  function setPlaying(on) {
    wrap.classList.toggle("is-playing", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "暂停音乐" : "播放音乐");
  }

  function updateProgress() {
    if (!bar) { return; }
    var d = audio.duration;
    var p = (d && isFinite(d)) ? Math.min(1, audio.currentTime / d) : 0;
    bar.style.strokeDashoffset = (C * (1 - p)).toFixed(2);
  }

  function tryAutoPlay() {
    audio.volume = 0.6;
    var pr = audio.play();
    if (pr && typeof pr.catch === "function") {
      pr.catch(function () {
        setPlaying(false);
        var resume = function () {
          audio.play().catch(function () {});
          document.removeEventListener("click", resume);
          document.removeEventListener("touchstart", resume);
          document.removeEventListener("keydown", resume);
        };
        document.addEventListener("click", resume, { once: true });
        document.addEventListener("touchstart", resume, { once: true });
        document.addEventListener("keydown", resume, { once: true });
      });
    }
  }

  btn.addEventListener("click", function () {
    if (audio.paused) {
      var pr = audio.play();
      if (pr && typeof pr.catch === "function") { pr.catch(function () { setPlaying(false); }); }
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", function () { setPlaying(true); });
  audio.addEventListener("pause", function () { setPlaying(false); });
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", updateProgress);
  audio.addEventListener("ended", function () { setPlaying(false); updateProgress(); });
  audio.addEventListener("error", function () { setPlaying(false); });

  /* 第一次向下滑动时开始播放，之后再滑动不再触发 */
  var armed = true;
  var lastY = window.scrollY || 0;
  window.addEventListener("scroll", function () {
    var y = window.scrollY || window.pageYOffset || 0;
    if (armed && y > lastY && y > 20) {
      armed = false;
      if (audio.paused) { tryAutoPlay(); }
    }
    lastY = y;
  }, { passive: true });
})();

/* ------- 悬浮播放器夹在手机框内，不越过边框 ------- */
(function () {
  "use strict";

  var phone = document.querySelector(".phone");
  if (!phone) { return; }
  var root = document.documentElement;
  var pending = false;

  function apply() {
    pending = false;
    var vh = window.innerHeight || root.clientHeight || 0;
    var gap = vh - phone.getBoundingClientRect().bottom; /* 手机框底边离视口底部的距离 */
    root.style.setProperty("--lift", (gap > 0 ? gap : 0).toFixed(1) + "px");
  }
  function schedule() {
    if (pending) { return; }
    pending = true;
    window.requestAnimationFrame(apply);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("load", schedule);
  if ("ResizeObserver" in window) { new ResizeObserver(schedule).observe(phone); }
  apply();
  window.setTimeout(schedule, 300);
})();