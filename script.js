(function () {
  "use strict";

  var posts = Array.prototype.slice.call(document.querySelectorAll(".post"));

  /* 滑到卡片时像收到微信消息一样“跳”出来。
     入场用 CSS animation（而不是 transition）实现：
     只要加上 in-view，动画就一定从 0% 播放，
     不会因为首屏在第一次绘制前就加类而“直接显现、没有弹的效果”。 */
  if (!("IntersectionObserver" in window)) {
    posts.forEach(function (p) { p.classList.add("in-view"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      // 同一批进入视口的卡片，按从上到下的顺序轻微错开
      var shown = entries.filter(function (e) { return e.isIntersecting; });
      shown.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      shown.forEach(function (entry, i) {
        entry.target.style.setProperty("--d", Math.min(i * 70, 280) + "ms");
        entry.target.classList.add("in-view");
      });

      entries.forEach(function (entry) {
        // 从下方完全离开时复位，下次滑回来可再次触发
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
          entry.target.classList.remove("in-view");
          entry.target.style.removeProperty("--d");
        }
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -6% 0px" });

    posts.forEach(function (p) { io.observe(p); });
  }

  /* 点击关键词方块，展开/收起里面的内容 */
  posts.forEach(function (post) {
    var btn = post.querySelector(".keyword");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = post.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* 回到顶部按钮 */
  var toTop = document.querySelector(".to-top");
  if (toTop) {
    var onScroll = function () {
      toTop.classList.toggle("show", window.scrollY > 320);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
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

  /* 雨丝：细长的下落线，尾部渐隐 */
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

  /* 玻璃上的水珠：暗边 + 亮圈 + 高光点 */
  function makeBead() {
    var r = rand(0.9, 3.6);
    return { x: rand(0, W), y: rand(0, H), r: r, a: rand(0.12, 0.5) * (r > 2.2 ? 1 : 0.7) };
  }

  /* 会顺着玻璃往下淌的水珠，身后留一条水痕 */
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

  /* 切到后台就暂停，省点电 */
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
