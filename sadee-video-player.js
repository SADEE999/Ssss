/* SADEE PRO STORE video player: audible autoplay attempt + browser-safe fallback */
(() => {
  'use strict';
  const SPEEDS = [1, 1.5, 2];

  function attach(video) {
    if (!(video instanceof HTMLVideoElement) || video.dataset.sadeeControls === '3') return;
    video.dataset.sadeeControls = '3';
    video.removeAttribute('muted');
    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;
    video.controls = false;

    const panel = document.createElement('div');
    panel.className = 'sadee-video-controls';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Video controls');
    panel.innerHTML = `
      <button type="button" data-sv="play" aria-label="Play video">▶</button>
      <button type="button" data-sv="sound" class="sv-sound" aria-label="Enable sound">SOUND ON</button>
      <button type="button" data-sv="speed" aria-label="Playback speed">1x</button>
      <input data-sv="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek video">
      <button type="button" data-sv="replay" aria-label="Replay video">↻</button>
      <button type="button" data-sv="fullscreen" aria-label="Fullscreen">⛶</button>`;
    video.insertAdjacentElement('afterend', panel);
    const $ = s => panel.querySelector(s);
    const playBtn = $('[data-sv="play"]'), soundBtn = $('[data-sv="sound"]');
    const speedBtn = $('[data-sv="speed"]'), seek = $('[data-sv="seek"]');
    let speedIndex = 0, blocked = false;

    function update() {
      playBtn.textContent = video.paused ? '▶' : 'Ⅱ';
      playBtn.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
      const isMuted = video.muted || video.volume === 0;
      const needsStart = !isMuted && video.paused;
      soundBtn.textContent = isMuted ? 'SOUND OFF' : (needsStart ? 'TAP FOR SOUND' : 'SOUND ON');
      soundBtn.setAttribute('aria-label', isMuted || needsStart ? 'Tap to start video with sound' : 'Sound is on; tap to mute');
      soundBtn.setAttribute('aria-pressed', String(!isMuted && !needsStart));
      if (Number.isFinite(video.duration) && video.duration > 0 && !seek.matches(':active')) {
        seek.value = String(Math.round(video.currentTime / video.duration * 1000));
      }
    }

    async function playAudiblyFromGesture() {
      video.defaultMuted = false;
      video.removeAttribute('muted');
      video.muted = false;
      video.volume = 1;
      try {
        await video.play();
        blocked = false;
      } catch (_) {
        soundBtn.textContent = 'TAP VIDEO TO START';
      }
      update();
    }

    panel.querySelectorAll('button[data-sv]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault(); e.stopPropagation();
        switch (btn.dataset.sv) {
          case 'play':
            if (video.paused) await playAudiblyFromGesture();
            else video.pause();
            break;
          case 'sound':
            if (video.muted || video.volume === 0) await playAudiblyFromGesture();
            else { video.muted = true; update(); }
            break;
          case 'speed':
            speedIndex = (speedIndex + 1) % SPEEDS.length;
            video.playbackRate = SPEEDS[speedIndex];
            speedBtn.textContent = SPEEDS[speedIndex] + 'x';
            break;
          case 'replay':
            video.currentTime = 0;
            await playAudiblyFromGesture();
            break;
          case 'fullscreen':
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else if (video.requestFullscreen) await video.requestFullscreen();
              else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
            } catch (_) {}
            break;
        }
        update();
      });
    });

    seek.addEventListener('input', () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Number(seek.value) / 1000 * video.duration;
      }
    });
    ['play','pause','volumechange','timeupdate','loadedmetadata','durationchange','ended'].forEach(ev => video.addEventListener(ev, update));
    new MutationObserver(() => { panel.hidden = video.hidden; }).observe(video, {attributes:true, attributeFilter:['hidden']});
    panel.hidden = video.hidden;

    // Wait until the dynamically supplied video has metadata before trying audible autoplay.
    // Mobile browsers may reject this until the visitor taps a control.
    async function attemptAudibleAutoplay() {
      video.defaultMuted = false;
      video.removeAttribute('muted');
      video.muted = false;
      video.volume = 1;
      try {
        await video.play();
        blocked = false;
      } catch (_) {
        blocked = true;
        video.pause();
        video.muted = false;
        video.volume = 1;
      }
      update();
    }
    video.addEventListener('loadedmetadata', attemptAudibleAutoplay, { once: true });
    if (video.readyState >= 1) attemptAudibleAutoplay();
    update();
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches('video')) attach(node);
    node.querySelectorAll?.('video').forEach(attach);
  }
  function init() {
    scan(document.body);
    new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(scan)))
      .observe(document.body, {childList:true, subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
