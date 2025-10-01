(() => {
  // ===== Simple CC capture for Video.js players =====
  // Adds a small on-screen button: Start -> Stop & Download.
  // Captures visible captions from the DOM and de-duplicates them.

  const UI_ID = "cc-capture-button";
  const FILE_NAME = "captions.txt";

  // Guard: remove old button if it exists
  document.getElementById(UI_ID)?.remove();

  // Storage
  let lines = [];
  let last = "";
  let running = false;
  let target = null;
  let trackObserver = null;
  let finderObserver = null;

  // Try to locate a caption container commonly used by Video.js
  function findCaptionNode() {
    // Most common
    let el =
      document.querySelector(".vjs-text-track-display") ||
      document.querySelector(".vjs-text-track") ||
      // Fallbacks: anything with "text-track" in class that has changing innerText
      [...document.querySelectorAll('[class*="text-track"], [class*="caption"], [class*="subtit"]')]
        .find(n => n.innerText && n.innerText.trim().length > 0);
    return el || null;
  }

  function normalize(s) {
    return s
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "");
  }

  function append(text) {
    const t = normalize(text);
    if (!t) return;
    // Avoid flooding with repeats
    if (t !== last) {
      lines.push(t);
      last = t;
      // Optionally, also log as you go:
      // console.log("[CC]", t);
    }
  }

  function startObservingTarget(el) {
    stopObservingTarget();
    target = el;
    trackObserver = new MutationObserver(() => {
      // Pull current visible caption text
      const txt = target.innerText || "";
      append(txt);
    });
    trackObserver.observe(target, { childList: true, subtree: true, characterData: true });
  }

  function stopObservingTarget() {
    try { trackObserver?.disconnect(); } catch {}
    trackObserver = null;
  }

  function startFinder() {
    stopFinder();
    // Observe DOM to catch late creation of the caption node
    finderObserver = new MutationObserver(() => {
      if (target) return;
      const el = findCaptionNode();
      if (el) startObservingTarget(el);
    });
    finderObserver.observe(document.documentElement, { childList: true, subtree: true });
    // Also try immediately
    const elNow = findCaptionNode();
    if (elNow) startObservingTarget(elNow);
  }

  function stopFinder() {
    try { finderObserver?.disconnect(); } catch {}
    finderObserver = null;
  }

  function start() {
    lines = [];
    last = "";
    running = true;
    startFinder();
  }

  function stop() {
    running = false;
    stopObservingTarget();
    stopFinder();
  }

  function downloadTxt() {
    // Join and lightly post-process to merge rapid duplicates
    const out = lines
      .filter((line, i) => i === 0 || line !== lines[i - 1])
      .join("\n");
    const blob = new Blob([out + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = FILE_NAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Floating UI
  const btn = document.createElement("button");
  btn.id = UI_ID;
  btn.textContent = "CC Capture: Start";
  Object.assign(btn.style, {
    position: "fixed",
    zIndex: 999999,
    right: "16px",
    bottom: "16px",
    padding: "8px 12px",
    fontSize: "12px",
    borderRadius: "10px",
    border: "1px solid #888",
    background: "#fff",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
  });

  btn.addEventListener("click", () => {
    if (!running) {
      start();
      btn.textContent = "CC Capture: Stop & Download";
    } else {
      stop();
      downloadTxt();
      btn.textContent = "CC Capture: Start";
    }
  });

  document.body.appendChild(btn);

  console.log("CC capture loaded. Click the on-screen button to Start, then Stop & Download when finished.");
})();
