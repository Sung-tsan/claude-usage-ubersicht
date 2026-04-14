/**
 * Claude Usage Widget for Ubersicht
 * https://github.com/anthropics/claude-usage-ubersicht
 *
 * Displays real-time Claude AI usage on your macOS desktop.
 * Config: ~/.claude/claude-usage-widget.json
 */

import { React, run } from "uebersicht";
const { useRef, useState, useEffect } = React;

// ── Config ──
export const refreshFrequency = 5 * 60 * 1000; // 5 minutes
export const command = '/bin/bash "$HOME/.claude/claude-usage-fetch.sh"';

// ── Styles ──
export const className = `
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 999;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
  font-size: 12px;
  color: #e0e0e0;
  -webkit-font-smoothing: antialiased;

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .widget-container {
    position: absolute;
    background: rgba(20, 20, 24, 0.82);
    backdrop-filter: blur(24px) saturate(1.4);
    -webkit-backdrop-filter: blur(24px) saturate(1.4);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px 18px;
    min-width: 240px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
    pointer-events: auto;
    cursor: grab;
    user-select: none;
  }

  .widget-container.dragging {
    cursor: grabbing;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }

  .logo {
    width: 18px; height: 18px;
    border-radius: 4px;
    background: linear-gradient(135deg, #d97706, #c2410c);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; color: white; font-weight: 700;
  }

  .title {
    font-size: 13px;
    font-weight: 600;
    color: #f0f0f0;
    letter-spacing: -0.2px;
  }

  .section { margin-bottom: 12px; }
  .section:last-child { margin-bottom: 0; }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
  }

  .label {
    font-size: 11px;
    color: #999;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .value {
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .bar-bg {
    height: 6px;
    background: rgba(255,255,255,0.08);
    border-radius: 3px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s ease;
  }

  .reset {
    font-size: 10px;
    color: #666;
    margin-top: 4px;
    text-align: right;
  }

  .error-msg {
    color: #999;
    font-size: 11px;
    text-align: center;
    padding: 8px 0;
    line-height: 1.5;
  }

  .status-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 4px;
    letter-spacing: 0.2px;
  }

  .cache-banner {
    font-size: 10px;
    color: #886;
    text-align: center;
    padding: 4px 0 2px;
    border-top: 1px solid rgba(255,255,255,0.05);
    margin-top: 8px;
  }

  .header-actions {
    margin-left: auto;
    display: flex;
    gap: 4px;
  }

  .header-btn {
    width: 20px; height: 20px;
    border: none;
    background: rgba(255,255,255,0.06);
    border-radius: 5px;
    color: #888;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
    line-height: 1;
  }

  .header-btn:hover {
    background: rgba(255,255,255,0.12);
    color: #ccc;
  }

  .close-btn:hover {
    background: rgba(255,60,50,0.25);
    color: #ff6b6b;
  }

  .header-btn.spinning {
    animation: spin 0.8s linear infinite;
  }

  .toggle-icon {
    font-size: 11px;
    transition: transform 0.2s;
  }

  .toggle-icon.collapsed {
    transform: rotate(-90deg);
  }

  .widget-body {
    overflow: hidden;
    transition: max-height 0.25s ease, opacity 0.2s ease;
    max-height: 500px;
    opacity: 1;
  }

  .widget-body.collapsed {
    max-height: 0;
    opacity: 0;
  }

  .header.collapsed {
    margin-bottom: 0;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

// ── Helpers ──
function getColor(util) {
  if (util < 30) return "#33cc66";
  if (util < 50) return "#66cc4d";
  if (util < 65) return "#e6cc1a";
  if (util < 80) return "#ff9933";
  if (util < 90) return "#ff4d33";
  return "#e61a1a";
}

function getStatusLabel(util) {
  if (util < 30) return "Low";
  if (util < 60) return "Normal";
  if (util < 80) return "High";
  if (util < 95) return "Heavy";
  return "Limit!";
}

function formatTimeLeft(isoStr) {
  if (!isoStr) return "";
  const diff = new Date(isoStr).getTime() - Date.now();
  if (diff <= 0) return "resets now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `resets in ${d}d ${rh}h`;
  }
  return h > 0 ? `resets in ${h}h ${m}m` : `resets in ${m}m`;
}

function UsageSection({ label, data }) {
  if (!data) return null;
  const util = data.utilization ?? 0;
  const color = getColor(util);
  const status = getStatusLabel(util);

  return (
    <div className="section">
      <div className="section-header">
        <span className="label">{label}</span>
        <span>
          <span
            className="status-badge"
            style={{ background: color + "22", color: color }}
          >
            {status}
          </span>
          <span className="value" style={{ color, marginLeft: 8 }}>
            {util}%
          </span>
        </span>
      </div>
      <div className="bar-bg">
        <div
          className="bar-fill"
          style={{
            width: `${Math.min(util, 100)}%`,
            background: `linear-gradient(90deg, ${color}bb, ${color})`,
          }}
        />
      </div>
      {data.resets_at && (
        <div className="reset">{formatTimeLeft(data.resets_at)}</div>
      )}
    </div>
  );
}

// ── Drag logic ──
const STORAGE_KEY = "claude-usage-widget-pos";

function loadPos() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { x: window.innerWidth - 280, y: window.innerHeight - 300 };
}

function savePos(pos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
}

function DraggableWidget({ children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(loadPos);
  const drag = useRef(null);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    drag.current = { startX: e.clientX - pos.x, startY: e.clientY - pos.y };
    ref.current?.classList.add("dragging");
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!drag.current) return;
      setPos({ x: e.clientX - drag.current.startX, y: e.clientY - drag.current.startY });
    };
    const onMouseUp = () => {
      if (!drag.current) return;
      drag.current = null;
      ref.current?.classList.remove("dragging");
      setPos((p) => { savePos(p); return p; });
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="widget-container"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}

// ── Header buttons ──
const COLLAPSED_KEY = "claude-usage-widget-collapsed";

function RefreshButton() {
  const [spinning, setSpinning] = useState(false);
  const handleClick = (e) => {
    e.stopPropagation();
    setSpinning(true);
    run('/bin/bash "$HOME/.claude/claude-usage-fetch.sh"');
    setTimeout(() => setSpinning(false), 1000);
  };
  return (
    <button
      className={"header-btn" + (spinning ? " spinning" : "")}
      onClick={handleClick}
      title="Refresh"
    >
      &#x21bb;
    </button>
  );
}

function ToggleButton({ collapsed, onToggle }) {
  const handleClick = (e) => {
    e.stopPropagation();
    onToggle();
  };
  return (
    <button className="header-btn" onClick={handleClick} title={collapsed ? "Expand" : "Collapse"}>
      <span className={"toggle-icon" + (collapsed ? " collapsed" : "")}>&#x25BE;</span>
    </button>
  );
}

function CloseButton() {
  const handleClick = (e) => {
    e.stopPropagation();
    // Rename .jsx → .jsx.off to disable widget, then refresh Übersicht
    run('/bin/bash -c \'WD="$HOME/Library/Application Support/Übersicht/widgets"; mv "$WD/claude-usage.jsx" "$WD/claude-usage.jsx.off" 2>/dev/null; osascript -e "tell application \\"Übersicht\\" to refresh" 2>/dev/null\'');
  };
  return (
    <button className="header-btn close-btn" onClick={handleClick} title="Close widget">
      &#x2715;
    </button>
  );
}

// ── Widget component ──
function Widget({ output, error }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  let content;

  if (error) {
    content = <div className="error-msg">Error: {String(error)}</div>;
  } else {
    let data;
    try { data = JSON.parse(output); } catch { data = null; }

    if (!data) {
      content = <div className="error-msg">Failed to parse response</div>;
    } else if (data.error === "no_config") {
      content = (
        <div className="error-msg">
          No config found.<br />
          Create ~/.claude/claude-usage-widget.json<br />
          with your OAuth token.
        </div>
      );
    } else if (data.error === "fetch_failed") {
      content = (
        <div className="error-msg">
          Failed to fetch usage data.<br />
          Check your token in ~/.claude/claude-usage-widget.json
        </div>
      );
    } else {
      const ageSec = data._cache_age_sec || 0;
      const ageMin = Math.floor(ageSec / 60);
      const cacheLabel = data._cached
        ? (ageMin < 1 ? "cached < 1m ago" : `cached ${ageMin}m ago`)
        : null;
      content = (
        <>
          <UsageSection label="5-Hour Session" data={data.five_hour} />
          <UsageSection label="Weekly" data={data.seven_day} />
          {data.seven_day_sonnet && (
            <UsageSection label="Sonnet (Weekly)" data={data.seven_day_sonnet} />
          )}
          {data.seven_day_opus && (
            <UsageSection label="Opus (Weekly)" data={data.seven_day_opus} />
          )}
          {cacheLabel && <div className="cache-banner">{cacheLabel}</div>}
        </>
      );
    }
  }

  return (
    <DraggableWidget>
      <div className={"header" + (collapsed ? " collapsed" : "")}>
        <div className="logo">C</div>
        <span className="title">Claude Usage</span>
        <div className="header-actions">
          {!collapsed && <RefreshButton />}
          <ToggleButton collapsed={collapsed} onToggle={toggleCollapsed} />
          <CloseButton />
        </div>
      </div>
      <div className={"widget-body" + (collapsed ? " collapsed" : "")}>
        {content}
      </div>
    </DraggableWidget>
  );
}

export const render = (props) => <Widget {...props} />;
