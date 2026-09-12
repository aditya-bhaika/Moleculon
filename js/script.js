// ===================================================================
// Moleculon — interaction & animation layer
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {

  const configuredApiBase = document.querySelector('meta[name="api-base"]')?.content.trim();
  const API_BASE = configuredApiBase ? configuredApiBase.replace(/\/$/, '') : window.location.origin;

  /* ---------- Scroll progress bar ---------- */
  const progressBar = document.getElementById('progress-bar');
  function updateProgress(){
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    progressBar.style.width = scrolled + '%';
  }
  document.addEventListener('scroll', updateProgress, {passive:true});
  updateProgress();

  /* ---------- Header dark-mode toggle over dark sections ---------- */
  const header = document.getElementById('site-header');
  const darkSections = document.querySelectorAll('.section.dark, .hero');
  function updateHeaderMode(){
    const y = window.scrollY + 60;
    let onDark = false;
    darkSections.forEach(sec => {
      const top = sec.offsetTop, bottom = top + sec.offsetHeight;
      if (y >= top && y < bottom) onDark = true;
    });
    header.classList.toggle('dark-mode', onDark);
  }
  document.addEventListener('scroll', updateHeaderMode, {passive:true});
  updateHeaderMode();

  /* ---------- Active-section indicator in the nav ---------- */
  const navLinkMap = {};
  document.querySelectorAll('.nav-link:not(.nav-cta)').forEach(a => {
    const id = a.getAttribute('href').slice(1);
    navLinkMap[id] = a;
  });
  const navSectionIds = Object.keys(navLinkMap);
  function updateActiveNav(){
    const y = window.scrollY + 140;
    let current = null;
    navSectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= y) current = id;
    });
    navSectionIds.forEach(id => navLinkMap[id].classList.toggle('active', id === current));
  }
  document.addEventListener('scroll', updateActiveNav, {passive:true});
  updateActiveNav();

  /* ---------- Mobile nav toggle ---------- */
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
  }));

  /* ---------- Instantly reveal a section's content on any anchor jump ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', () => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) revealSection(target);
    });
  });
  if (window.location.hash){
    const target = document.querySelector(window.location.hash);
    if (target) revealSection(target);
  }

  /* ---------- Reveal-on-scroll ----------
     Generous rootMargin so content reveals well before/after it's
     exactly in the viewport (protects fast scrolls and anchor jumps).
     A hard fallback timeout guarantees nothing stays invisible even
     if the observer never fires for some reason. */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.01, rootMargin: '200px 0px 200px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));

  function revealNow(el){
    el.classList.add('in-view');
    revealObserver.unobserve(el);
  }
  function revealSection(section){
    section.querySelectorAll('.reveal').forEach(revealNow);
    section.querySelectorAll('.stat-num').forEach(el => runStatCounter(el));
    section.querySelectorAll('.bar-fill').forEach(el => fillBar(el));
  }
  // Belt-and-suspenders: force-reveal anything left over shortly after load.
  window.addEventListener('load', () => {
    setTimeout(() => revealEls.forEach(revealNow), 2500);
  });

  /* ---------- Animated stat counters ---------- */
  const statEls = document.querySelectorAll('.stat-num');
  function runStatCounter(el){
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.target);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    function tick(now){
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(target * eased);
      el.innerHTML = prefix + val + (suffix ? `<span class="stat-unit">${suffix}</span>` : '');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    statObserver.unobserve(el);
  }
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) runStatCounter(entry.target); });
  }, { threshold: 0.01, rootMargin: '200px 0px 200px 0px' });
  statEls.forEach(el => statObserver.observe(el));

  /* ---------- Bar chart fill ---------- */
  const barFills = document.querySelectorAll('.bar-fill');
  function fillBar(el){
    if (el.dataset.done) return;
    el.dataset.done = '1';
    el.style.width = el.dataset.width + '%';
    barObserver.unobserve(el);
  }
  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) fillBar(entry.target); });
  }, { threshold: 0.01, rootMargin: '200px 0px 200px 0px' });
  barFills.forEach(el => barObserver.observe(el));

  // Belt-and-suspenders: make sure numbers/bars never stay stuck at zero.
  window.addEventListener('load', () => {
    setTimeout(() => {
      statEls.forEach(runStatCounter);
      barFills.forEach(fillBar);
    }, 2500);
  });

  /* ---------- Pillar tabs ---------- */
  const pillarTabs = document.querySelectorAll('.pillar-tab');
  pillarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      pillarTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.pillar-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('panel-' + tab.dataset.pillar).classList.add('active');
    });
  });

  /* ---------- Wedge timeline scroll progress ---------- */
  const wedgeSection = document.getElementById('wedge');
  const timelineFill = document.getElementById('timeline-fill');
  const timelineSteps = document.querySelectorAll('.timeline-step');
  function updateWedge(){
    if (!wedgeSection) return;
    const rect = wedgeSection.getBoundingClientRect();
    const vh = window.innerHeight;
    let progress = (vh - rect.top) / (rect.height + vh) ;
    progress = Math.max(0, Math.min(1, progress));
    timelineFill.style.width = (progress * 100) + '%';
    const activeIndex = Math.min(3, Math.floor(progress * 4));
    timelineSteps.forEach((step, i) => step.classList.toggle('active', i <= activeIndex && progress > 0.05));
  }
  document.addEventListener('scroll', updateWedge, {passive:true});
  updateWedge();

  /* ---------- Accordion ---------- */
  document.querySelectorAll('.accordion-head').forEach(head => {
    head.addEventListener('click', () => {
      const item = head.parentElement;
      const wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ---------- Hero canvas: interactive circular DNA helix ----------
     A double helix bent into a closed ring (a torus knot) — reads as
     plasmid-style circular DNA, the molecule biotech R&D actually
     engineers. Auto-rotates; tilts toward the cursor for parallax. */
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TURNS = 14;        // helix twists around the ring
  const POINTS = 220;      // ring resolution
  const STEP = 6;          // sampling step for rungs / nucleotide markers
  const BASE_TILT = 1.1;   // fixed viewing angle, radians

  let W, H, cx, cy, ringRadius, tubeRadius, maxDepth;
  const tilt = { x: 0, y: 0 };
  const targetTilt = { x: 0, y: 0 };
  let spin = 0;

  function resizeCanvas(){
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    cx = W / 2;
    cy = H / 2;
    ringRadius = Math.min(W, H) * 0.3;
    tubeRadius = ringRadius * 0.16;
    maxDepth = ringRadius + tubeRadius;
  }

  function helixPoint(theta, phaseOffset){
    const phi = theta * TURNS + phaseOffset;
    const r = ringRadius + tubeRadius * Math.cos(phi);
    return { x: r * Math.cos(theta), y: tubeRadius * Math.sin(phi), z: r * Math.sin(theta) };
  }

  function rotate(x, y, z, rx, ry){
    const y1 = y * Math.cos(rx) - z * Math.sin(rx);
    const z1 = y * Math.sin(rx) + z * Math.cos(rx);
    const x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
    const z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
    return { x: x2, y: y1, z: z2 };
  }

  function project(p){
    return { sx: cx + p.x, sy: cy + p.y, z: p.z };
  }

  function depthAlpha(z, base){
    const t = Math.max(0, Math.min(1, (z + maxDepth) / (2 * maxDepth)));
    return base * (0.22 + 0.65 * t);
  }

  function strokeStrand(points, colorRGB, baseAlpha){
    ctx.lineWidth = 1.6;
    let bucket = null;
    for (let i = 0; i < points.length - 1; i++){
      const z = (points[i].z + points[i + 1].z) / 2;
      const alpha = depthAlpha(z, baseAlpha);
      const nextBucket = Math.round(alpha * 24);
      if (nextBucket !== bucket){
        if (bucket !== null) ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${colorRGB},${alpha.toFixed(3)})`;
        const p0 = project(points[i]);
        ctx.moveTo(p0.sx, p0.sy);
        bucket = nextBucket;
      }
      const p1 = project(points[i + 1]);
      ctx.lineTo(p1.sx, p1.sy);
    }
    ctx.stroke();
  }

  function drawHelix(){
    ctx.clearRect(0, 0, W, H);

    tilt.x += (targetTilt.x - tilt.x) * 0.045;
    tilt.y += (targetTilt.y - tilt.y) * 0.045;
    if (!reduceMotion) spin += 0.0016;

    const rx = BASE_TILT + tilt.x;
    const ry = spin + tilt.y;

    const strandA = [], strandB = [];
    for (let i = 0; i <= POINTS; i++){
      const theta = (i / POINTS) * Math.PI * 2;
      const a = helixPoint(theta, 0);
      const b = helixPoint(theta, Math.PI);
      strandA.push(rotate(a.x, a.y, a.z, rx, ry));
      strandB.push(rotate(b.x, b.y, b.z, rx, ry));
    }

    for (let i = 0; i < POINTS; i += STEP){
      const a = strandA[i], b = strandB[i];
      const pa = project(a), pb = project(b);
      ctx.strokeStyle = `rgba(210,210,218,${depthAlpha((a.z + b.z) / 2, 0.28).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
      ctx.stroke();
    }

    strokeStrand(strandA, '255,255,255', 0.95);
    strokeStrand(strandB, '150,150,160', 0.95);

    function drawMarkers(points, colorRGB){
      for (let i = 0; i < points.length; i += STEP){
        const p = project(points[i]);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorRGB},${depthAlpha(points[i].z, 0.95).toFixed(3)})`;
        ctx.fill();
      }
    }
    drawMarkers(strandA, '255,255,255');
    drawMarkers(strandB, '190,190,198');

    if (!reduceMotion) requestAnimationFrame(drawHelix);
  }

  resizeCanvas();
  drawHelix();
  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    if (rect.height === 0) return;
    const nx = Math.max(-1, Math.min(1, (e.clientX - rect.left - cx) / cx));
    const ny = Math.max(-1, Math.min(1, (e.clientY - rect.top - cy) / cy));
    targetTilt.y = nx * 0.5;
    targetTilt.x = -ny * 0.35;
  });
  window.addEventListener('mouseleave', () => { targetTilt.x = 0; targetTilt.y = 0; });

  /* ================================================================
     Client-side fallback simulation engine — mirrors server.py so the
     demos still work when no Python backend is reachable (e.g. a
     static host like GitHub Pages).
     ================================================================ */
  const COMPOUND_PREFIXES = ["MLC", "BRX", "NVR", "CDX", "PXL", "ZTN"];
  function randCompoundId(){
    const prefix = COMPOUND_PREFIXES[Math.floor(Math.random() * COMPOUND_PREFIXES.length)];
    const number = Math.floor(Math.random() * 900) + 100;
    let suffix = '';
    for (let i = 0; i < 2; i++) suffix += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    return `${prefix}-${number}${suffix}`;
  }
  function screenCandidatesLocal(candidatesRaw){
    const candidates = Math.max(100, Math.min(candidatesRaw, 200000));
    const shortlisted = Math.max(3, Math.min(15, Math.round(Math.sqrt(candidates) / 14)));
    const scores = Array.from({length: shortlisted}, () => Math.round((62 + Math.random() * 35) * 10) / 10)
      .sort((a, b) => b - a);
    const top_candidates = scores.map(score => ({ id: randCompoundId(), score }));
    const minutesSaved = (candidates - shortlisted) * 35;
    const weeksSaved = minutesSaved / (60 * 40);
    const time_saved = weeksSaved >= 1
      ? `~${Math.round(weeksSaved).toLocaleString()} lab-weeks`
      : `~${Math.round(minutesSaved)} minutes`;
    return { screened: candidates, shortlisted, top_candidates, time_saved };
  }
  const SOC_KEYWORDS = [
    [["headache","migraine","dizziness","seizure","numbness"], "Nervous system disorders"],
    [["rash","itch","hives","skin"], "Skin & subcutaneous disorders"],
    [["nausea","vomit","diarrhea","abdominal","stomach"], "Gastrointestinal disorders"],
    [["breath","cough","wheeze","respiratory","lung"], "Respiratory disorders"],
    [["chest pain","palpitation","cardiac","heart"], "Cardiac disorders"],
    [["fever","fatigue","chills","malaise","weakness"], "General disorders & administration site conditions"],
    [["anxiety","depression","insomnia","confusion"], "Psychiatric disorders"],
  ];
  const SERIOUSNESS_LABELS = {
    hospitalization: "Serious — Hospitalization",
    life_threatening: "Serious — Life-threatening",
    disability: "Serious — Persistent disability",
  };
  function triageCaseLocal(rawText, flags){
    const text = (rawText || '').toLowerCase().trim();
    let seriousness = "Non-serious";
    for (const f of flags){
      if (SERIOUSNESS_LABELS[f]){ seriousness = SERIOUSNESS_LABELS[f]; break; }
    }
    const expectedness = (text.includes('known') || text.includes('expected'))
      ? "Expected (listed in reference safety information)"
      : "Unexpected — flagged for expedited review";
    let system_organ_class = "General disorders & administration site conditions";
    for (const [keywords, soc] of SOC_KEYWORDS){
      if (keywords.some(k => text.includes(k))){ system_organ_class = soc; break; }
    }
    const snippet = text ? (text.slice(0,160) + (text.length > 160 ? '…' : '')) : 'no narrative provided';
    const seriousnessTail = seriousness.includes('—') ? seriousness.split('—')[1].trim().toLowerCase() : 'non-serious';
    const draft_report = `Case narrative indicates a ${seriousnessTail} event consistent with ${system_organ_class.toLowerCase()}. ` +
      `Reported presentation: "${snippet}". Recommend causality assessment against current reference safety information and ` +
      `routing for ${seriousness.includes('Serious') ? 'expedited' : 'periodic'} regulatory reporting.`;
    return {
      seriousness, expectedness, system_organ_class, draft_report,
      manual_time: "4–6 hours", ai_time: "~12 minutes (human-reviewed)"
    };
  }

  /* ---------- Demo: candidate range slider ---------- */
  const candidateRange = document.getElementById('candidateRange');
  const candidateValue = document.getElementById('candidateValue');
  candidateRange.addEventListener('input', () => {
    candidateValue.textContent = Number(candidateRange.value).toLocaleString();
  });

  /* ---------- Demo: research screening (Python backend) ---------- */
  const runScreenBtn = document.getElementById('runScreen');
  const screenOutput = document.getElementById('screenOutput');
  runScreenBtn.addEventListener('click', async () => {
    runScreenBtn.textContent = 'Screening…';
    runScreenBtn.disabled = true;
    screenOutput.classList.remove('show');
    const candidates = Number(candidateRange.value);
    try{
      const res = await fetch(API_BASE + '/api/screen', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ candidates })
      });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      renderScreenResult(data);
    } catch(err){
      renderScreenResult(screenCandidatesLocal(candidates));
    } finally {
      runScreenBtn.textContent = 'Run simulation';
      runScreenBtn.disabled = false;
    }
  });

  function renderScreenResult(data){
    const rows = data.top_candidates.map(c => `
      <div class="candidate-bar">
        <span class="cb-label">${c.id}</span>
        <div class="cb-track"><div class="cb-fill" data-score="${c.score}"></div></div>
        <span class="cb-score">${c.score}%</span>
      </div>`).join('');
    screenOutput.innerHTML = `
      <p class="out-title">Simulation result</p>
      <p class="out-line"><span class="chip">${data.screened.toLocaleString()} screened</span>
      <span class="chip">${data.shortlisted} shortlisted</span></p>
      <div style="margin-top:14px;">${rows}</div>
      <p class="out-line" style="margin-top:14px;color:var(--gray-500);font-size:13px;">
        Estimated lab time saved vs. exhaustive testing: <strong>${data.time_saved}</strong>
      </p>`;
    screenOutput.classList.add('show');
    requestAnimationFrame(() => {
      screenOutput.querySelectorAll('.cb-fill').forEach(el => {
        el.style.width = el.dataset.score + '%';
      });
    });
  }

  /* ---------- Demo: AE triage (Python backend) ---------- */
  const runTriageBtn = document.getElementById('runTriage');
  const triageOutput = document.getElementById('triageOutput');
  runTriageBtn.addEventListener('click', async () => {
    runTriageBtn.textContent = 'Analyzing…';
    runTriageBtn.disabled = true;
    triageOutput.classList.remove('show');
    const text = document.getElementById('caseText').value;
    const flags = Array.from(document.querySelectorAll('.serious-flag:checked')).map(cb => cb.value);
    try{
      const res = await fetch(API_BASE + '/api/triage', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ text, flags })
      });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      renderTriageResult(data);
    } catch(err){
      renderTriageResult(triageCaseLocal(text, flags));
    } finally {
      runTriageBtn.textContent = 'Analyze case';
      runTriageBtn.disabled = false;
    }
  });

  function renderTriageResult(data){
    triageOutput.innerHTML = `
      <p class="out-title">Simulated triage draft</p>
      <p class="out-line">
        <span class="chip">${data.seriousness}</span>
        <span class="chip">${data.expectedness}</span>
        <span class="chip">${data.system_organ_class}</span>
      </p>
      <p class="out-line" style="margin-top:12px;"><strong>Draft summary:</strong> ${data.draft_report}</p>
      <p class="out-line" style="margin-top:10px;color:var(--gray-500);font-size:13px;">
        Manual review baseline: ${data.manual_time} · Moleculon draft: ${data.ai_time}
      </p>`;
    triageOutput.classList.add('show');
  }

  /* ---------- Contact form (Python backend) ---------- */
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(contactForm);
    const payload = Object.fromEntries(fd.entries());
    formStatus.textContent = 'Sending…';
    try{
      const res = await fetch(API_BASE + '/api/contact', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('bad response');
      formStatus.textContent = 'Thanks — we\'ll be in touch shortly.';
      contactForm.reset();
    } catch(err){
      formStatus.textContent = 'Thanks — we\'ll be in touch shortly. (Demo site: message wasn\'t sent anywhere.)';
      contactForm.reset();
    }
  });

});
