(function () {
  var rad = Math.PI / 180;
  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };
  var globe = $('globe'), tiltEl = $('tilt');
  var elGridF = $('gridFront'), elGridB = $('gridBack');
  var elLinks = $('links'), elBig = $('dotsBig'), elSmall = $('dotsSmall');

  // Globe state
  var yaw = 0, pitch = 0, vyaw = 0, vpitch = 0, tilt = 0, drag = null, last = 0;

  // Water-link nodes (lat, lon) and the pairs that get connected
  var nodes = [[-62,10],[-48,70],[-35,-40],[-20,120],[-8,-100],[-70,-120],[-28,30],[-15,-20],[-55,160],[5,50],[-40,-150],[-80,40],[-12,85],[-30,-70],[-5,-45],[-60,-80],[-45,-10],[-22,-155]];
  var pairs = [];
  for (var i = 0; i < nodes.length; i++) {
    for (var j = i + 1; j < nodes.length; j++) {
      var a = nodes[i], b = nodes[j];
      var c = Math.sin(a[0] * rad) * Math.sin(b[0] * rad) + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.cos((a[1] - b[1]) * rad);
      if (Math.acos(Math.max(-1, Math.min(1, c))) < 42 * rad) pairs.push([i, j]);
    }
  }

  function draw() {
    var cy = Math.cos(yaw * rad), sy = Math.sin(yaw * rad);
    var cp = Math.cos(pitch * rad), sp = Math.sin(pitch * rad);
    function P(lat, lon) {
      var f = lat * rad, l = lon * rad;
      var x = Math.cos(f) * Math.sin(l), y = Math.sin(f), z = Math.cos(f) * Math.cos(l);
      var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      return [50 + 49 * x1, 50 - 49 * y2, z2];
    }
    var F = [], B = [];
    function addLine(pts) {
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var seg = 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
        if (a[2] > 0 && b[2] > 0) F.push(seg);
        else if (a[2] <= 0 && b[2] <= 0) B.push(seg);
      }
    }
    var pts, lat, lon;
    for (lon = 0; lon < 360; lon += 30) {
      pts = [];
      for (lat = -90; lat <= 90; lat += 6) pts.push(P(lat, lon));
      addLine(pts);
    }
    for (lat = -60; lat <= 60; lat += 30) {
      pts = [];
      for (lon = 0; lon <= 360; lon += 6) pts.push(P(lat, lon));
      addLine(pts);
    }
    var np = nodes.map(function (n) { return P(n[0], n[1]); });
    var links = [], big = [], small = [];
    pairs.forEach(function (pr) {
      var a = np[pr[0]], b = np[pr[1]];
      if (a[2] > 0.05 && b[2] > 0.05) links.push('M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1));
    });
    np.forEach(function (p) {
      if (p[2] > 0.55) big.push('M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'h0');
      else if (p[2] > 0.05) small.push('M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'h0');
    });
    elGridF.setAttribute('d', F.join(''));
    elGridB.setAttribute('d', B.join(''));
    elLinks.setAttribute('d', links.join(''));
    elBig.setAttribute('d', big.join(''));
    elSmall.setAttribute('d', small.join(''));
    tiltEl.style.transform = 'rotate(' + tilt.toFixed(2) + 'deg)';
  }

  function tick() {
    if (!drag) {
      yaw += vyaw;
      pitch += vpitch;
      vyaw *= 0.94;
      vpitch *= 0.94;
      if (Math.abs(vyaw) < 0.01) vyaw = 0;
      if (Math.abs(vpitch) < 0.01) vpitch = 0;
      if (!reduced && Date.now() - last > 4000) yaw += 0.12;
    } else {
      vyaw *= 0.85;
      vpitch *= 0.85;
    }
    var target = Math.max(-13, Math.min(13, -vyaw * 2.6));
    tilt += (target - tilt) * 0.12;
    yaw %= 360;
    pitch %= 360;
    var still = reduced && !drag && vyaw === 0 && vpitch === 0 && Math.abs(tilt) < 0.01;
    if (!still) draw();
    requestAnimationFrame(tick);
  }

  globe.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY };
    last = Date.now();
    vyaw = 0;
    vpitch = 0;
    try { globe.setPointerCapture(e.pointerId); } catch (err) {}
    globe.classList.add('dragging');
  });
  globe.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    var k = 0.4;
    yaw += dx * k;
    pitch += dy * k;
    vyaw = Math.max(-8, Math.min(8, vyaw * 0.5 + dx * k * 0.5));
    vpitch = Math.max(-8, Math.min(8, vpitch * 0.5 + dy * k * 0.5));
    last = Date.now();
  });
  function release(e) {
    drag = null;
    last = Date.now();
    try { globe.releasePointerCapture(e.pointerId); } catch (err) {}
    globe.classList.remove('dragging');
  }
  globe.addEventListener('pointerup', release);
  globe.addEventListener('pointercancel', release);
  globe.addEventListener('keydown', function (e) {
    var step = 12, hit = true;
    if (e.key === 'ArrowLeft') yaw -= step;
    else if (e.key === 'ArrowRight') yaw += step;
    else if (e.key === 'ArrowUp') pitch -= step;
    else if (e.key === 'ArrowDown') pitch += step;
    else hit = false;
    if (hit) { e.preventDefault(); last = Date.now(); }
  });

  requestAnimationFrame(tick);

  // Enrollment + consent
  var consent = $('consent'), status = $('status'), cta = $('cta');
  function setStatus(text, cls) {
    status.textContent = text;
    status.className = 'status' + (cls ? ' ' + cls : '');
  }
  consent.addEventListener('change', function () {
    cta.classList.toggle('ready', consent.checked);
    if (!consent.checked) setStatus('');
    else if (status.classList.contains('warn')) setStatus('');
  });
  function choose(label, url) {
    if (!consent.checked) {
      setStatus('Please accept the privacy policy and cookie policy to continue.', 'warn');
      return;
    }
    // TODO: replace with your real sign-up links, e.g. window.location.href = url;
    setStatus(label + ' enrollment selected. [Link to your sign-up flow goes here]', 'ok');
  }
  $('btnSeeker').addEventListener('click', function () { choose('Job Seeker', '/enrol/job-seeker'); });
  $('btnEmployer').addEventListener('click', function () { choose('Employer', '/enrol/employer'); });
})();
