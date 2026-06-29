/* Smart Madrasa — shared frame utilities
   Provides: phone stage, top app bar, bottom nav, replay.
*/
(function () {
  // bottom nav used on most teacher pages
  window.bottomNav = function (active) {
    const items = [
      { k: "home",     icon: "menu",          label: "Home" },
      { k: "att",      icon: "clipboard-list",label: "Attend" },
      { k: "hw",       icon: "book-open",     label: "HW" },
      { k: "exams",    icon: "graduation-cap",label: "Exams" },
      { k: "more",     icon: "more-vertical", label: "More" },
    ];
    return `
      <nav class="bottom-nav">
        ${items.map(i => `
          <div class="item ${i.k === active ? "active" : ""}">
            <svg data-icon="${i.icon}"></svg>
            <span>${i.label}</span>
          </div>`).join("")}
      </nav>`;
  };

  // top app bar (mirrors DashboardLayout header)
  window.appbar = function (title, sub) {
    return `
      <header class="appbar">
        <div class="brand">
          <div class="brand-mark">SM</div>
          <div>
            <div style="font-size:14px;">${title}</div>
            ${sub ? `<div style="font-size:11px; color: var(--gray-500); font-weight:500;">${sub}</div>` : ""}
          </div>
        </div>
        <div class="actions">
          <span class="pill" style="background: var(--emerald-50); color: var(--emerald-700);">
            <svg data-icon="languages" data-size="12"></svg> EN
          </span>
          <div class="icon-box sm" style="background: var(--emerald-600); color:#fff;">
            <svg data-icon="bell" data-size="16"></svg>
          </div>
        </div>
      </header>`;
  };

  // phone stage wrapper
  window.phoneStage = function (inner, opts = {}) {
    const bg = opts.bg || "";
    return `
      <div class="stage" ${bg ? `style="background:${bg}"` : ""}>
        <div class="phone">
          <div class="phone-inner">${inner}</div>
        </div>
      </div>`;
  };

  // desktop stage
  window.desktopStage = function (inner, url) {
    return `
      <div class="stage">
        <div class="desktop">
          <div class="desktop-bar">
            <div class="dot" style="background:#ef4444;"></div>
            <div class="dot" style="background:#f59e0b;"></div>
            <div class="dot" style="background:#10b981;"></div>
            <div class="url">madrasa.app${url || "/teacher"}</div>
          </div>
          <div style="flex:1; overflow:hidden; position:relative;">${inner}</div>
        </div>
      </div>`;
  };

  // replay button: forces a re-render so CSS animations re-fire
  window.addEventListener("DOMContentLoaded", () => {
    document.body.insertAdjacentHTML("beforeend",
      `<button class="replay-btn" onclick="location.reload()">
        <svg data-icon="rotate-ccw" data-size="14"></svg> Replay
      </button>`);
    hydrateIcons();
  });
})();
