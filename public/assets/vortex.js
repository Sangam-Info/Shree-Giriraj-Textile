/* =====================================================================
   vortex.js  —  3D spinning-thread background (vanilla port)
   Ported from the Originkit "Tornado / Vortex" (Three.js) component.
   No build step, no framework. Requires global THREE (loaded from CDN).
   Exposes: window.initVortex(canvas, container, opts) -> { setRunning, dispose }
   ===================================================================== */
(function () {
  "use strict";

  if (typeof THREE === "undefined") {
    console.warn("[Vortex] THREE not found — background disabled.");
    window.initVortex = function () { return null; };
    return;
  }

  var TAU = Math.PI * 2;
  var PX_PER_WORLD = 60;
  var CURVE_SAMPLES = 1024;
  var STRAND_SEGMENTS = 400;
  var WOBBLE = 0.008;
  var FADE_ZONE = 0.15;
  var FORM_HEIGHT = 10;
  var BASE_ZOOM = 67;

  var LINE_GLOW_MAX = 1;
  var DOT_GLOW_MAX = 4.2;
  var COMET_SPEED_MAX = 0.15;
  var COMET_GLOW_MAX = 1;
  var DOT_SIZE_SCALE = 1000;

  var RIPPLE_RADIUS = 2;
  var RIPPLE_STRENGTH = 0.5;
  var RIPPLE_SPRING = 50;
  var RIPPLE_DAMPING = 9;
  var SCALE_SPRING = 65;
  var SCALE_DAMPING = 11;
  var SCALE_PEAK = 1.8;

  var WAVE_SPEED = 5;
  var WAVE_WIDTH = 1.2;
  var WAVE_DECAY = 0.8;
  var WAVE_LIFE = 2.5;
  var WAVE_STRENGTH = 0.04;
  var MAX_WAVES = 16;

  var RUN_LOW = 0.03;
  var RUN_HIGH = 0.95;
  var RUN_FADE = 0.1;

  var HIT_RADIUS = 0.8;
  var HIT_BOOST = 1.6;
  var HIT_BOOST_TIME = 0.4;
  var HIT_FLASH = 6;
  var HIT_FADE = 0.6;
  var HIT_POP = 1.3;
  var HIT_RESPAWN = 8;

  var STRAND_HZ = 1 / 30;

  var ENTRANCE = {
    strandStart: 0, strandEnd: 2,
    dotStart: 1.2, dotEnd: 3,
    cometStart: 3, cometEnd: 5
  };

  function clamp(x, a, b) { return Math.min(Math.max(x, a), b); }
  function fovForZoom(zoom) { return clamp(2 * BASE_ZOOM - zoom, 1, 175); }

  function ramp(now, from, to) {
    if (now <= from) return 0;
    if (now >= to) return 1;
    var t = (now - from) / (to - from);
    return 1 - (1 - t) * (1 - t) * (1 - t);
  }

  function monotone(points) {
    var n = points.length;
    var slope = [];
    for (var i = 0; i < n - 1; i++) {
      slope[i] = (points[i + 1][1] - points[i][1]) / (points[i + 1][0] - points[i][0]);
    }
    var m = [slope[0]];
    for (var j = 1; j < n - 1; j++) {
      m[j] = slope[j - 1] * slope[j] <= 0 ? 0 : (slope[j - 1] + slope[j]) / 2;
    }
    m[n - 1] = slope[n - 2];
    for (var k = 0; k < n - 1; k++) {
      if (Math.abs(slope[k]) < 1e-12) { m[k] = m[k + 1] = 0; continue; }
      var a = m[k] / slope[k];
      var b = m[k + 1] / slope[k];
      var s = a * a + b * b;
      if (s > 9) {
        var kk = 3 / Math.sqrt(s);
        m[k] = kk * a * slope[k];
        m[k + 1] = kk * b * slope[k];
      }
    }
    return function (x) {
      if (x <= points[0][0]) return points[0][1];
      if (x >= points[n - 1][0]) return points[n - 1][1];
      var i = 0;
      while (i < n - 2 && points[i + 1][0] < x) i++;
      var h = points[i + 1][0] - points[i][0];
      var t = (x - points[i][0]) / h;
      var t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * points[i][1] +
        (t3 - 2 * t2 + t) * h * m[i] +
        (-2 * t3 + 3 * t2) * points[i + 1][1] +
        (t3 - t2) * h * m[i + 1];
    };
  }

  function bake(fn) {
    var table = new Float32Array(CURVE_SAMPLES);
    for (var i = 0; i < CURVE_SAMPLES; i++) table[i] = fn(i / (CURVE_SAMPLES - 1));
    return table;
  }

  function sample(table, t) {
    if (t <= 0) return table[0];
    var last = table.length - 1;
    if (t >= 1) return table[last];
    var x = t * last;
    var i = x | 0;
    return table[i] + (table[i + 1] - table[i]) * (x - i);
  }

  function makeShape(cfg) {
    var w = clamp(cfg.waistAt, 0.08, 0.92);
    var floor = cfg.floorRadius;
    var crown = cfg.crownRadius;
    var turn = cfg.twist * TAU;

    var radius = bake(monotone([
      [0, floor],
      [0.24 * w, floor * 0.667],
      [0.5 * w, floor * 0.3],
      [0.76 * w, floor * 0.08],
      [w, cfg.waistRadius],
      [w + 0.3 * (1 - w), crown * 0.2],
      [w + 0.6 * (1 - w), crown * 0.44],
      [1, crown]
    ]));
    var height = bake(monotone([
      [0, 0], [0.1, 0.2], [0.2, 0.8], [0.35, 2],
      [0.5, FORM_HEIGHT * 0.38], [0.75, FORM_HEIGHT * 0.7], [1, FORM_HEIGHT]
    ]));
    var angle = bake(monotone([
      [0, 0], [0.15, 0.15 * turn], [0.25, 0.25 * turn], [0.45, 0.55 * turn],
      [0.6, 0.7 * turn], [0.8, 0.88 * turn], [1, turn]
    ]));

    return {
      writePoint: function (out, at, s, lane, flow, wobble, phase, time) {
        var r = sample(radius, s);
        var y = sample(height, s);
        var a = sample(angle, s) + lane + flow;
        var rr = r + Math.sin(s * 25 + phase + time * 0.3) * wobble * r;
        out[at] = Math.cos(a) * rr;
        out[at + 1] = y;
        out[at + 2] = Math.sin(a) * rr;
      },
      lane: function (i, total) { return (i / total) * TAU; }
    };
  }

  function createVortex(canvas, container, cfgRef) {
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance"
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.25;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(fovForZoom(cfgRef.current.zoom), 1, 0.1, 500);
    var group = new THREE.Group();
    scene.add(group);

    var repelUniforms = {
      uMouse: { value: new THREE.Vector2(0, 0) },
      uAspect: { value: 1 },
      uRadius: { value: 0.2 },
      uStrength: { value: 0 }
    };
    function withRepel(material) {
      material.onBeforeCompile = function (shader) {
        shader.uniforms.uMouse = repelUniforms.uMouse;
        shader.uniforms.uAspect = repelUniforms.uAspect;
        shader.uniforms.uRadius = repelUniforms.uRadius;
        shader.uniforms.uStrength = repelUniforms.uStrength;
        shader.vertexShader = shader.vertexShader
          .replace("void main() {",
            "uniform vec2 uMouse;\nuniform float uAspect;\nuniform float uRadius;\nuniform float uStrength;\nvoid main() {")
          .replace("#include <fog_vertex>",
            "#include <fog_vertex>\n" +
            "if (uStrength > 0.0 && uRadius > 0.0 && gl_Position.w > 0.0) {\n" +
            "  vec2 ndc = gl_Position.xy / gl_Position.w;\n" +
            "  vec2 off = ndc - uMouse;\n" +
            "  float dist = length(off * vec2(uAspect, 1.0));\n" +
            "  float f = uStrength * exp(-(dist * dist) / (2.0 * uRadius * uRadius));\n" +
            "  float mlen = length(off);\n" +
            "  if (mlen > 1e-4) { ndc += (off / mlen) * f; gl_Position.xy = ndc * gl_Position.w; }\n" +
            "}");
      };
      return material;
    }

    var shape;
    var disposables = [];
    function track(x) { disposables.push(x); return x; }

    var strands = [];
    var strandPos = new Float32Array(0);
    var strandCol = new Float32Array(0);
    var strandGeo = null;

    var dotList = [];
    var dotCount = 0;
    var dotMesh = null;
    var dotColors = new Float32Array(0);
    var dotHome = new Float32Array(0);
    var dotShift = new Float32Array(0);
    var dotVel = new Float32Array(0);
    var dotScale = new Float32Array(0);
    var dotScaleVel = new Float32Array(0);
    var dotHitAt = new Float32Array(0);
    var dotFlash = new Float32Array(0);
    var dotAlive = new Float32Array(0);
    var rippleAwake = false;

    var cometList = [];
    var cometTex = null;

    var waves = [];
    var wavesAwake = false;

    var dummy = new THREE.Matrix4();
    var tint = { strand: new THREE.Color(), dot: new THREE.Color(), comet: new THREE.Color() };
    var lastColors = { line: "", dot: "", comet: "" };

    function syncColors(cfg) {
      if (cfg.lineColor !== lastColors.line) { tint.strand.set(cfg.lineColor); lastColors.line = cfg.lineColor; }
      if (cfg.dotColor !== lastColors.dot) { tint.dot.set(cfg.dotColor); lastColors.dot = cfg.dotColor; }
      if (cfg.cometColor !== lastColors.comet) {
        tint.comet.set(cfg.cometColor); lastColors.comet = cfg.cometColor;
        for (var c = 0; c < cometList.length; c++) {
          cometList[c].head.material.color.setRGB(tint.comet.r * 1.2, tint.comet.g * 1.2, tint.comet.b * 1.2);
        }
      }
    }

    function blob(size, stops) {
      var cel = document.createElement("canvas");
      cel.width = cel.height = size;
      var ctx2d = cel.getContext("2d");
      if (ctx2d) {
        var g = ctx2d.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
        ctx2d.fillStyle = g;
        ctx2d.fillRect(0, 0, size, size);
      }
      var tex = new THREE.Texture(cel);
      tex.needsUpdate = true;
      return tex;
    }

    function build() {
      var cfg = cfgRef.current;
      for (var gi = group.children.length - 1; gi >= 0; gi--) group.remove(group.children[gi]);
      for (var di = 0; di < disposables.length; di++) disposables[di].dispose();
      disposables = [];

      shape = makeShape(cfg);
      camera.fov = fovForZoom(cfg.zoom);
      camera.updateProjectionMatrix();
      syncColors(cfg);

      var count = Math.max(3, Math.round(cfg.lineCount));
      var segs = STRAND_SEGMENTS - 1;
      var verts = count * segs * 2;
      strandPos = new Float32Array(verts * 3);
      strandCol = new Float32Array(verts * 3);
      strandGeo = track(new THREE.BufferGeometry());
      strandGeo.setAttribute("position", new THREE.BufferAttribute(strandPos, 3).setUsage(THREE.DynamicDrawUsage));
      strandGeo.setAttribute("color", new THREE.BufferAttribute(strandCol, 3).setUsage(THREE.DynamicDrawUsage));
      var strandMat = track(withRepel(new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false
      })));
      var strandLines = new THREE.LineSegments(strandGeo, strandMat);
      strandLines.frustumCulled = false;
      group.add(strandLines);

      strands = [];
      for (var i = 0; i < count; i++) {
        strands.push({
          lane: shape.lane(i, count),
          speed: 0.95 + Math.random() * 0.1,
          pulse: Math.random() * TAU,
          wobblePhase: Math.random() * TAU,
          from: 0, to: 1, bright: 0.5,
          offset: i * segs * 2 * 3,
          pts: new Float32Array(STRAND_SEGMENTS * 3),
          cols: new Float32Array(STRAND_SEGMENTS * 3)
        });
      }

      dotCount = cfg.showDots ? Math.max(0, Math.round(cfg.dotCount)) : 0;
      dotList = [];
      for (var d = 0; d < dotCount; d++) {
        var sv = Math.random() < 0.5 ? 0.2 + Math.random() * 0.4 : 0.05 + Math.random() * 0.9;
        var str = Math.floor(Math.random() * strands.length);
        dotList.push({
          s: sv, lane: strands[str].lane, strand: str,
          pulse: Math.random() * TAU,
          flickerRate: 0.15 + Math.random() * 4.5,
          bright: 0.04 + Math.pow(Math.random(), 1.5) * 0.96
        });
      }

      dotHome = new Float32Array(dotCount * 3);
      dotShift = new Float32Array(dotCount * 3);
      dotVel = new Float32Array(dotCount * 3);
      dotScale = new Float32Array(dotCount).fill(1);
      dotScaleVel = new Float32Array(dotCount);
      dotHitAt = new Float32Array(dotCount);
      dotFlash = new Float32Array(dotCount);
      dotAlive = new Float32Array(dotCount).fill(1);
      dotColors = new Float32Array(dotCount * 3);
      rippleAwake = false;

      if (dotCount > 0) {
        var dotGeo = track(new THREE.PlaneGeometry(1, 1));
        var dotMat = track(withRepel(new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0.9,
          blending: THREE.AdditiveBlending, depthWrite: false
        })));
        dotMesh = new THREE.InstancedMesh(dotGeo, dotMat, dotCount);
        dotMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        dotMesh.instanceColor = new THREE.InstancedBufferAttribute(dotColors, 3);
        dotMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        dotMesh.frustumCulled = false;
        group.add(dotMesh);
      } else {
        dotMesh = null;
      }

      waves = [];
      for (var wv = 0; wv < MAX_WAVES; wv++) waves.push({ active: false, x: 0, y: 0, z: 0, at: 0, amp: 1 });
      wavesAwake = false;

      cometTex = track(blob(32, [
        [0, "rgba(255,255,255,0.9)"],
        [0.3, "rgba(255,190,120,0.4)"],
        [0.7, "rgba(230,150,60,0.08)"],
        [1, "rgba(0,0,0,0)"]
      ]));
      var cometTotal = cfg.showComets ? Math.max(0, Math.round(cfg.cometCount)) : 0;
      var tailLen = Math.max(2, Math.round(cfg.cometTail));
      cometList = [];
      for (var ci = 0; ci < cometTotal; ci++) {
        var trail = new Float32Array(tailLen * 3);
        var trailCol = new Float32Array(tailLen * 3);
        var geo = track(new THREE.BufferGeometry());
        geo.setAttribute("position", new THREE.BufferAttribute(trail, 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute("color", new THREE.BufferAttribute(trailCol, 3).setUsage(THREE.DynamicDrawUsage));
        var lineMat = track(withRepel(new THREE.LineBasicMaterial({
          vertexColors: true, transparent: true, opacity: 0.9,
          blending: THREE.AdditiveBlending, depthWrite: false
        })));
        var line = new THREE.Line(geo, lineMat);
        line.frustumCulled = false;
        var headMat = track(new THREE.SpriteMaterial({
          map: cometTex, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
          color: new THREE.Color(tint.comet.r * 1.2, tint.comet.g * 1.2, tint.comet.b * 1.2)
        }));
        var head = new THREE.Sprite(headMat);
        head.scale.set(0.35, 0.35, 1);
        group.add(line); group.add(head);

        var home = strands[Math.floor(Math.random() * strands.length)];
        var speed = cfg.cometSpeed * (0.7 + Math.random() * 0.6);
        cometList.push({
          bright: 0.7 + Math.random() * 0.3,
          lane: home.lane, speed: speed, pulse: home.speed, wobblePhase: home.wobblePhase,
          base: speed, boost: 0, boostMul: 1, racing: false, s: 0, idle: 0,
          idleFor: 0.4 + (ci / cometTotal) * cfg.cometDelay,
          trail: trail, trailCol: trailCol, geo: geo, line: line, head: head
        });
      }

      born = 0;
      resize();
    }

    var distance = FORM_HEIGHT / 2 / Math.tan((BASE_ZOOM * Math.PI) / 180 / 2);
    var viewDir = new THREE.Vector3(3.4, -0.6, 10).normalize();
    var lookTarget = new THREE.Vector3(0, FORM_HEIGHT / 2, 0);
    camera.position.copy(lookTarget).addScaledVector(viewDir, distance);
    camera.lookAt(lookTarget);

    var viewHeight = 1;

    function resize() {
      var cfg = cfgRef.current;
      var w = container.clientWidth || 1;
      var h = container.clientHeight || 1;
      viewHeight = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      repelUniforms.uAspect.value = w / h;
      repelUniforms.uRadius.value = clamp(cfg.repelRadius / (h / 2), 0.01, 3);
      if (!cfg.running) renderer.render(scene, camera);
    }
    var observer = new ResizeObserver(resize);

    var repelTarget = 0;
    function onPointerMove(e) {
      var cfg = cfgRef.current;
      var rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      repelUniforms.uMouse.value.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      repelTarget = cfg.hoverRepel && cfg.running ? clamp(cfg.repelStrength / 100, 0, 1) * 0.45 : 0;
    }
    function onPointerLeave() { repelTarget = 0; }
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("pointercancel", onPointerLeave);

    function addWave(x, y, z, at, amp) {
      wavesAwake = true;
      var slot = 0, oldest = Infinity;
      for (var i = 0; i < MAX_WAVES; i++) {
        if (!waves[i].active) { slot = i; break; }
        if (waves[i].at < oldest) { oldest = waves[i].at; slot = i; }
      }
      waves[slot] = { active: true, x: x, y: y, z: z, at: at, amp: amp };
    }

    function waveAt(x, y, z, now, out, at, radius) {
      var ox = 0, oy = 0, oz = 0, any = false;
      for (var i = 0; i < MAX_WAVES; i++) {
        var w = waves[i];
        if (!w.active) continue;
        var age = now - w.at;
        if (age > WAVE_LIFE) { w.active = false; continue; }
        any = true;
        var dx = x - w.x, dy = y - w.y, dz = z - w.z;
        var dd = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dd < 0.001 || dd > radius * 1.5) continue;
        var front = Math.abs(dd - WAVE_SPEED * age);
        if (front > WAVE_WIDTH) continue;
        var shell = Math.cos(((front / WAVE_WIDTH) * Math.PI) / 2);
        var fade = Math.exp(-age / WAVE_DECAY);
        var near = 1 / Math.max(dd, 0.3);
        var push = RIPPLE_STRENGTH * w.amp * WAVE_STRENGTH * shell * fade * near;
        ox += (dx / dd) * push; oy += (dy / dd) * push; oz += (dz / dd) * push;
      }
      if (!any) wavesAwake = false;
      out[at] += ox; out[at + 1] += oy; out[at + 2] += oz;
    }

    function burstAt(idx, now, force) {
      rippleAwake = true;
      var x = dotHome[idx * 3], y = dotHome[idx * 3 + 1], z = dotHome[idx * 3 + 2];
      addWave(x, y, z, now, force);
      var radius = RIPPLE_RADIUS, maxSq = radius * radius;
      for (var j = 0; j < dotCount; j++) {
        var dx = dotHome[j * 3] - x, dy = dotHome[j * 3 + 1] - y, dz = dotHome[j * 3 + 2] - z;
        var sq = dx * dx + dy * dy + dz * dz;
        if (sq > maxSq || sq < 1e-4) continue;
        var dd = Math.sqrt(sq);
        var f = 1 - dd / radius;
        var push = (RIPPLE_STRENGTH * force * f * f) / Math.max(dd, 0.1);
        dotVel[j * 3] += dx * push; dotVel[j * 3 + 1] += dy * push; dotVel[j * 3 + 2] += dz * push;
        var swell = 1 + (SCALE_PEAK - 1) * force * f * f;
        if (swell > dotScale[j]) { dotScale[j] = swell; dotScaleVel[j] = 0; }
      }
    }

    function settle(dt) {
      var moving = false;
      for (var i = 0; i < dotCount; i++) {
        var at = i * 3;
        for (var kk = 0; kk < 3; kk++) {
          var a = -RIPPLE_SPRING * dotShift[at + kk] - RIPPLE_DAMPING * dotVel[at + kk];
          dotVel[at + kk] += a * dt;
          dotShift[at + kk] += dotVel[at + kk] * dt;
        }
        var restSq = dotShift[at] * dotShift[at] + dotShift[at + 1] * dotShift[at + 1] + dotShift[at + 2] * dotShift[at + 2];
        var velSq = dotVel[at] * dotVel[at] + dotVel[at + 1] * dotVel[at + 1] + dotVel[at + 2] * dotVel[at + 2];
        if (restSq < 1e-8 && velSq < 1e-8) {
          dotShift[at] = dotShift[at + 1] = dotShift[at + 2] = 0;
          dotVel[at] = dotVel[at + 1] = dotVel[at + 2] = 0;
        } else moving = true;
        var sa = -SCALE_SPRING * (dotScale[i] - 1) - SCALE_DAMPING * dotScaleVel[i];
        dotScaleVel[i] += sa * dt;
        dotScale[i] += dotScaleVel[i] * dt;
        if (Math.abs(dotScale[i] - 1) < 0.001 && Math.abs(dotScaleVel[i]) < 0.001) {
          dotScale[i] = 1; dotScaleVel[i] = 0;
        } else moving = true;
      }
      if (!moving) rippleAwake = false;
    }

    var frame = 0, born = 0, flow = 0, strandClock = 0, heldFrame = false, tick = 0;
    var lastTime = performance.now();

    function drawStrand(strand, now, entrance) {
      var cfg = cfgRef.current;
      var spin = flow * strand.speed;
      var bright = strand.bright * cfg.lineGlow;
      var lift = 0.15 + bright * 1.5;
      var alpha = Math.min(bright * 0.5 * (0.9 + 0.1 * Math.sin(now * 0.18 + strand.pulse)), 0.7) * Math.min(entrance * 3, 1);
      var reach = strand.from + entrance * (strand.to - strand.from);
      var tipFade = 0.15 * (strand.to - strand.from);
      var pts = strand.pts, cols = strand.cols;

      for (var i = 0; i < STRAND_SEGMENTS; i++) {
        var u = i / (STRAND_SEGMENTS - 1);
        var s = strand.from + u * (strand.to - strand.from);
        var at = i * 3;
        shape.writePoint(pts, at, s, strand.lane, spin, WOBBLE, strand.wobblePhase, now);
        if (wavesAwake) waveAt(pts[at], pts[at + 1], pts[at + 2], now, pts, at, RIPPLE_RADIUS);
        var edge = 1, kk;
        if (u < FADE_ZONE) { kk = u / FADE_ZONE; edge = kk * kk; }
        else if (u > 1 - FADE_ZONE) { kk = (1 - u) / FADE_ZONE; edge = kk * kk; }
        var tip = 1;
        if (s > reach) tip = 0;
        else if (s > reach - tipFade) { tip = (reach - s) / tipFade; tip *= tip; }
        var v = edge * lift * tip * alpha;
        cols[at] = tint.strand.r * v; cols[at + 1] = tint.strand.g * v; cols[at + 2] = tint.strand.b * v;
      }

      var w = strand.offset;
      for (var si = 0; si < STRAND_SEGMENTS - 1; si++) {
        var a = si * 3, b = (si + 1) * 3;
        strandPos[w] = pts[a]; strandPos[w + 1] = pts[a + 1]; strandPos[w + 2] = pts[a + 2];
        strandCol[w] = cols[a]; strandCol[w + 1] = cols[a + 1]; strandCol[w + 2] = cols[a + 2];
        w += 3;
        strandPos[w] = pts[b]; strandPos[w + 1] = pts[b + 1]; strandPos[w + 2] = pts[b + 2];
        strandCol[w] = cols[b]; strandCol[w + 1] = cols[b + 1]; strandCol[w + 2] = cols[b + 2];
        w += 3;
      }
    }

    function driveComet(comet, now, dt, entrance) {
      var cfg = cfgRef.current;
      var tailLen = comet.trail.length / 3;
      if (!comet.racing) {
        comet.head.material.opacity = 0;
        if (entrance < 0.3) return;
        comet.idle += dt;
        if (comet.idle > comet.idleFor) {
          comet.racing = true;
          comet.s = cfg.flowDir < 0 ? RUN_HIGH : RUN_LOW;
          comet.base = cfg.cometSpeed * (0.7 + Math.random() * 0.6);
          comet.speed = comet.base; comet.boost = 0; comet.boostMul = 1;
          var home = strands[Math.floor(Math.random() * strands.length)];
          comet.lane = home.lane; comet.pulse = home.speed; comet.wobblePhase = home.wobblePhase;
        }
        return;
      }
      if (comet.boost > 0) {
        comet.boost -= dt;
        if (comet.boost <= 0) { comet.boost = 0; comet.boostMul = 1; }
        else comet.boostMul = 1 + (HIT_BOOST - 1) * (comet.boost / HIT_BOOST_TIME);
        comet.speed = comet.base * comet.boostMul;
      }
      comet.s += dt * comet.speed * cfg.flowDir;
      if (cfg.flowDir < 0 ? comet.s < RUN_LOW : comet.s > RUN_HIGH) {
        comet.racing = false; comet.idle = 0;
        comet.idleFor = cfg.cometDelay * (0.6 + Math.random() * 0.8);
        comet.trailCol.fill(0);
        comet.geo.attributes.color.needsUpdate = true;
        comet.head.material.opacity = 0;
        return;
      }
      var spin = flow * comet.pulse;
      var ends = clamp((comet.s - RUN_LOW) / RUN_FADE, 0, 1) * clamp((RUN_HIGH - comet.s) / RUN_FADE, 0, 1);
      for (var i = 0; i < tailLen; i++) {
        var s = clamp(comet.s - i * 0.005 * cfg.flowDir, 0.005, 0.995);
        var at = i * 3;
        shape.writePoint(comet.trail, at, s, comet.lane, spin, WOBBLE, comet.wobblePhase, now);
        var along = (1 - i / tailLen) * (1 - i / tailLen);
        var v = comet.bright * cfg.cometGlow * along * ends;
        var hot = entrance * (i < 3 ? 1.3 : 1);
        comet.trailCol[at] = tint.comet.r * v * hot;
        comet.trailCol[at + 1] = tint.comet.g * v * hot;
        comet.trailCol[at + 2] = tint.comet.b * v * hot;
      }
      comet.head.position.set(comet.trail[0], comet.trail[1], comet.trail[2]);
      var swell = comet.boost > 0 ? 1 + (comet.boostMul - 1) * 0.8 : 1;
      comet.head.material.opacity = ends * 0.35 * entrance * swell;
      comet.head.scale.set(0.35 * swell, 0.35 * swell, 1);
      comet.geo.attributes.position.needsUpdate = true;
      comet.geo.attributes.color.needsUpdate = true;
    }

    function collide(now) {
      var cfg = cfgRef.current;
      var force = cfg.collideForce;
      if (force <= 0) return;
      var hitSq = HIT_RADIUS * HIT_RADIUS;
      for (var c = 0; c < cometList.length; c++) {
        var comet = cometList[c];
        if (!comet.racing) continue;
        var x = comet.trail[0], y = comet.trail[1], z = comet.trail[2];
        if (x === 0 && y === 0 && z === 0) continue;
        for (var i = 0; i < dotCount; i += 3) {
          var dx = dotHome[i * 3] - x, dy = dotHome[i * 3 + 1] - y, dz = dotHome[i * 3 + 2] - z;
          var sq = dx * dx + dy * dy + dz * dz;
          if (sq < hitSq && dotHitAt[i] === 0) {
            dotHitAt[i] = 0.001;
            dotFlash[i] = HIT_FLASH * force;
            dotScale[i] = 1 + (HIT_POP - 1) * force;
            burstAt(i, now, force);
            comet.boost = HIT_BOOST_TIME;
            comet.boostMul = 1 + (HIT_BOOST - 1) * force;
            comet.speed = comet.base * comet.boostMul;
          }
        }
      }
    }

    function step(now) {
      frame = requestAnimationFrame(step);
      var cfg = cfgRef.current;
      var dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      if (!cfg.running) {
        if (!heldFrame) { renderer.render(scene, camera); heldFrame = true; }
        return;
      }
      heldFrame = false;

      if (born === 0) born = now;
      var t = (now - born) / 1000;

      var fadeStrand = ramp(t, ENTRANCE.strandStart, ENTRANCE.strandEnd);
      var fadeDot = ramp(t, ENTRANCE.dotStart, ENTRANCE.dotEnd);
      var fadeComet = ramp(t, ENTRANCE.cometStart, ENTRANCE.cometEnd);

      syncColors(cfg);
      var fov = fovForZoom(cfg.zoom);
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
      repelUniforms.uRadius.value = clamp(cfg.repelRadius / (viewHeight / 2), 0.01, 3);

      flow += dt * cfg.flowSpeed;
      var us = repelUniforms.uStrength;
      us.value += (repelTarget - us.value) * Math.min(1, dt * 12);

      strandClock += dt;
      if (strandClock >= STRAND_HZ && strandGeo) {
        strandClock -= STRAND_HZ;
        for (var sidx = 0; sidx < strands.length; sidx++) drawStrand(strands[sidx], t, fadeStrand);
        strandGeo.attributes.position.needsUpdate = true;
        strandGeo.attributes.color.needsUpdate = true;
      }

      if (rippleAwake) settle(dt);

      if (dotMesh && dotCount > 0) {
        var size = cfg.dotSize;
        for (var i = 0; i < dotCount; i++) {
          var dot = dotList[i];
          var strand = strands[dot.strand] || strands[0];
          var spin = flow * strand.speed;
          var at = i * 3;
          shape.writePoint(dotHome, at, dot.s, dot.lane, spin, WOBBLE, strand.wobblePhase, t);

          if (dotHitAt[i] > 0) {
            dotHitAt[i] += dt;
            var age = dotHitAt[i];
            if (age < HIT_FADE) {
              var k = age / HIT_FADE;
              dotAlive[i] = (1 + (HIT_POP - 1) * (1 - k)) * (1 - k * k);
              dotFlash[i] = HIT_FLASH * (1 - k * k) * (1 - k * k);
            } else { dotAlive[i] = 0; dotFlash[i] = 0; }
            if (age > HIT_RESPAWN) { dotHitAt[i] = 0; dotAlive[i] = 1; dotFlash[i] = 0; }
          }

          var alive = dotAlive[i];
          var scale = size * dotScale[i] * alive;
          dummy.makeScale(scale, scale, scale);
          dummy.setPosition(dotHome[at] + dotShift[at], dotHome[at + 1] + dotShift[at + 1], dotHome[at + 2] + dotShift[at + 2]);
          dotMesh.setMatrixAt(i, dummy);

          var beat = 1 - cfg.dotFlicker + cfg.dotFlicker * (0.08 + 0.92 * Math.pow(Math.max(0, Math.sin(t * dot.flickerRate + dot.pulse)), 2.5));
          var swollen = dotScale[i] > 1.02 ? 1 + (dotScale[i] - 1) * 0.5 : 1;
          var v = dot.bright * beat * cfg.dotGlow * swollen * fadeDot * (1 + dotFlash[i]) * alive;
          dotColors[at] = tint.dot.r * v; dotColors[at + 1] = tint.dot.g * v; dotColors[at + 2] = tint.dot.b * v;
        }
        dotMesh.instanceMatrix.needsUpdate = true;
        if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
        dotMesh.material.opacity = 0.9 * fadeDot;
      }

      for (var cm = 0; cm < cometList.length; cm++) driveComet(cometList[cm], t, dt, fadeComet);
      tick++;
      if (tick % 2 === 0 && dotCount > 0) collide(t);

      renderer.render(scene, camera);
    }

    build();
    observer.observe(container);
    lastTime = performance.now();
    frame = requestAnimationFrame(step);

    return {
      rebuild: function () { build(); },
      dispose: function () {
        cancelAnimationFrame(frame);
        observer.disconnect();
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
        container.removeEventListener("pointercancel", onPointerLeave);
        for (var i = 0; i < disposables.length; i++) disposables[i].dispose();
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
      }
    };
  }

  /* ---- Preset (textile "spinning thread" look, tuned warm) ---------- */
  var PRESET = {
    topRadius: 380, waistRadius: 53, waistPosition: 50, bottomRadius: 1150,
    twist: 3, zoom: 75, speed: 10, direction: "right",
    lineOptions: { count: 240, color: "#ffd79a", glow: 9 },
    dots: true, dotOptions: { count: 8000, size: 20, color: "#fff2d6", glow: 10, flicker: 10 },
    comets: true, cometOptions: { count: 10, speed: 6, color: "#f6a723", glow: 7, tail: 19, delay: 8, collide: 6 },
    repel: true, repelOptions: { radius: 60, strength: 10 }
  };
  var DEFAULTS = {
    lineOptions: { count: 240, color: "#ffffff", glow: 10 },
    dotOptions: { count: 8000, size: 20, color: "#ffffff", glow: 10, flicker: 10 },
    cometOptions: { count: 10, speed: 6, color: "#f6a723", glow: 6, tail: 19, delay: 8, collide: 6 },
    repelOptions: { radius: 60, strength: 10 }
  };

  function buildConfig(userOpts) {
    var o = Object.assign({}, PRESET, userOpts || {});
    var line = Object.assign({}, DEFAULTS.lineOptions, PRESET.lineOptions, o.lineOptions);
    var dot = Object.assign({}, DEFAULTS.dotOptions, PRESET.dotOptions, o.dotOptions);
    var comet = Object.assign({}, DEFAULTS.cometOptions, PRESET.cometOptions, o.cometOptions);
    var shove = Object.assign({}, DEFAULTS.repelOptions, PRESET.repelOptions, o.repelOptions);
    var dir = o.direction === "left" ? -1 : 1;
    var reduced = false;
    try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    return {
      floorRadius: o.bottomRadius / PX_PER_WORLD,
      waistRadius: o.waistRadius / PX_PER_WORLD,
      crownRadius: o.topRadius / PX_PER_WORLD,
      waistAt: 1 - o.waistPosition / 100,
      twist: o.twist, zoom: o.zoom,
      flowDir: dir,
      flowSpeed: (o.speed / 100) * dir,
      lineCount: line.count, lineColor: line.color, lineGlow: (line.glow / 10) * LINE_GLOW_MAX,
      showDots: o.dots, dotCount: dot.count, dotSize: dot.size / DOT_SIZE_SCALE,
      dotColor: dot.color, dotGlow: (dot.glow / 10) * DOT_GLOW_MAX, dotFlicker: dot.flicker / 10,
      showComets: o.comets, cometCount: comet.count, cometSpeed: (comet.speed / 10) * COMET_SPEED_MAX,
      cometColor: comet.color, cometGlow: (comet.glow / 10) * COMET_GLOW_MAX,
      cometTail: comet.tail, cometDelay: comet.delay, collideForce: comet.collide / 10,
      hoverRepel: o.repel, repelRadius: shove.radius, repelStrength: shove.strength,
      running: !reduced
    };
  }

  window.initVortex = function (canvas, container, userOpts) {
    if (!canvas || !container) return null;
    var cfgRef = { current: buildConfig(userOpts) };
    var api;
    try { api = createVortex(canvas, container, cfgRef); }
    catch (e) { console.warn("[Vortex] init failed:", e); return null; }
    return {
      cfgRef: cfgRef,
      setRunning: function (v) { cfgRef.current.running = !!v; },
      rebuild: function () { api.rebuild(); },
      dispose: function () { api.dispose(); }
    };
  };
})();
