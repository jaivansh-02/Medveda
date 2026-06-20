/**
 * MediPulse — particles.js
 * Medical heartbeat ECG monitor line + sparse floating particles.
 * Clean, non-cluttered, continuously running.
 */

const MedCanvas = {
  canvas: null,
  ctx: null,
  w: 0,
  h: 0,
  running: true,

  // ECG lines — multiple horizontal heartbeat traces
  ecgLines: [],

  // Sparse floating particles (few, spread out)
  particles: [],

  init() {
    this.canvas = document.getElementById('med-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.spawn();
    this.loop();
  },

  resize() {
    this.w = this.canvas.width = window.innerWidth;
    this.h = this.canvas.height = window.innerHeight;
    // Respawn on resize to adjust line positions
    this.spawn();
  },

  spawn() {
    // ── ECG heartbeat lines ──
    // Multiple horizontal lines at different vertical positions
    this.ecgLines = [];
    const lineCount = Math.max(2, Math.floor(this.h / 300));
    for (let i = 0; i < lineCount; i++) {
      this.ecgLines.push({
        y: 120 + (i * (this.h - 200) / lineCount) + Math.random() * 40,
        x: Math.random() * this.w,           // current draw position
        speed: 1.8 + Math.random() * 1.2,     // pixels per frame
        color: ['rgba(0,210,190,','rgba(180,140,255,','rgba(120,200,255,'][i % 3],
        opacity: 0.18 + Math.random() * 0.12,
        lineWidth: 1.2 + Math.random() * 0.6,
        // Store the trail of points for smooth rendering
        trail: [],
        trailMax: Math.floor(this.w * 0.85),  // trail covers ~85% of screen width
        phase: 0,                              // phase for ECG waveform
      });
    }

    // ── Sparse floating particles (very few, spread out) ──
    this.particles = [];
    const pCount = Math.min(Math.floor(this.w / 120), 12);
    for (let i = 0; i < pCount; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 1 + Math.random() * 1.5,
        color: ['rgba(0,210,190,','rgba(180,140,255,','rgba(120,200,255,','rgba(255,120,180,'][Math.floor(Math.random() * 4)],
        pulse: Math.random() * Math.PI * 2,
      });
    }
  },

  // ── Generate ECG heartbeat waveform Y offset ──
  // Mimics a real ECG: flat → small P wave → flat → sharp QRS spike → flat → small T wave → flat
  ecgWaveform(phase) {
    // Normalize phase to 0-1 cycle
    const t = phase % 1;

    // Flat baseline most of the time
    if (t < 0.10) return 0;                                      // flat
    if (t < 0.15) return Math.sin((t - 0.10) / 0.05 * Math.PI) * 6;   // P wave (small bump up)
    if (t < 0.20) return 0;                                      // flat (PR segment)
    if (t < 0.22) return -((t - 0.20) / 0.02) * 8;              // Q dip (small down)
    if (t < 0.26) return -8 + ((t - 0.22) / 0.04) * 48;         // R spike (sharp UP)
    if (t < 0.30) return 40 - ((t - 0.26) / 0.04) * 52;         // S dip (sharp DOWN)
    if (t < 0.33) return -12 + ((t - 0.30) / 0.03) * 12;        // back to baseline
    if (t < 0.42) return 0;                                      // flat (ST segment)
    if (t < 0.52) return Math.sin((t - 0.42) / 0.10 * Math.PI) * 8;   // T wave (medium bump)
    return 0;                                                     // flat until next cycle
  },

  drawECG() {
    const ctx = this.ctx;

    for (const line of this.ecgLines) {
      // Advance the position
      line.x += line.speed;
      line.phase += line.speed / 200; // phase advances with position

      // Calculate current Y offset from the waveform
      const yOff = this.ecgWaveform(line.phase);

      // Add new point to trail
      line.trail.push({ x: line.x, y: line.y + yOff });

      // Trim trail to max length (scrolling effect)
      if (line.trail.length > line.trailMax) {
        line.trail.shift();
      }

      // When the line goes off-screen right, wrap back to left
      if (line.x > this.w + 50) {
        line.x = -50;
        line.trail = [];
        line.y = line.y + (Math.random() - 0.5) * 20; // slight vertical drift
      }

      // Draw the trail
      if (line.trail.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(line.trail[0].x, line.trail[0].y);

      for (let i = 1; i < line.trail.length; i++) {
        ctx.lineTo(line.trail[i].x, line.trail[i].y);
      }

      ctx.strokeStyle = line.color + line.opacity + ')';
      ctx.lineWidth = line.lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Draw a bright dot at the leading edge (the "monitor cursor")
      const head = line.trail[line.trail.length - 1];
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = line.color + (line.opacity * 2.5) + ')';
      ctx.fill();

      // Glow around the head
      ctx.beginPath();
      ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = line.color + (line.opacity * 0.5) + ')';
      ctx.fill();

      // Fade the oldest portion of the trail (draw a gradient overlay)
      if (line.trail.length > 20) {
        const fadeLen = Math.min(80, Math.floor(line.trail.length * 0.3));
        for (let i = 0; i < fadeLen && i < line.trail.length - 1; i++) {
          const alpha = (i / fadeLen) * 0.15;
          ctx.beginPath();
          ctx.moveTo(line.trail[i].x, line.trail[i].y);
          ctx.lineTo(line.trail[i + 1].x, line.trail[i + 1].y);
          ctx.strokeStyle = `rgba(2,8,16,${1 - alpha})`;
          ctx.lineWidth = line.lineWidth + 2;
          ctx.stroke();
        }
      }
    }
  },

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      p.pulse += 0.012;
      const alpha = 0.15 + Math.sin(p.pulse) * 0.08;

      // Soft outer glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = p.color + (alpha * 0.2).toFixed(3) + ')';
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + alpha.toFixed(3) + ')';
      ctx.fill();

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Wrap edges
      if (p.x < -20) p.x = this.w + 20;
      if (p.x > this.w + 20) p.x = -20;
      if (p.y < -20) p.y = this.h + 20;
      if (p.y > this.h + 20) p.y = -20;
    }
  },

  loop() {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, this.w, this.h);

    this.drawECG();
    this.drawParticles();

    requestAnimationFrame(() => this.loop());
  }
};

window.addEventListener('DOMContentLoaded', () => MedCanvas.init());
