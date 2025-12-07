// LocalStorage keys (all prefixed to keep widget self-contained)
const RN_TYPES_KEY      = "rewireNerves_types";
const RN_PROTOCOLS_KEY  = "rewireNerves_protocols";
const RN_STATE_KEY      = "rewireNerves_state";
const RN_STATS_KEY      = "rewireNerves_stats";
const RN_LAST_BACKUP_KEY = "rewireNerves_lastBackup";

let rnTypes = [];        // [{id, name, archived}]
let rnProtocols = [];    // [{id, typeId, title, summary, body, archived}]
let rnState = {};        // {selectedTypeId, selectedProtocolId, wideMode, bodyCollapsed}
let rnStats = {};        // { [protocolId]: {count, lastCompletedIso} }

let rnToastTimeout = null;

/* ---------- Helpers: storage ---------- */
function rnSafeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error("localStorage get error:", e);
    return null;
  }
}

function rnSafeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error("localStorage set error:", e);
  }
}

/* ---------- Toast ---------- */
function rnShowToast(message) {
  const el = document.getElementById("rnToast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("visible");
  if (rnToastTimeout) clearTimeout(rnToastTimeout);
  rnToastTimeout = setTimeout(() => el.classList.remove("visible"), 2200);
}

/* ---------- Default data ---------- */
function rnDefaultTypes() {
  return [
    { id: "type_trading",  name: "Trading",   archived: false },
    { id: "type_parent",   name: "Parenting", archived: false },
    { id: "type_partner",  name: "Partner",   archived: false },
    { id: "type_self",     name: "Self",      archived: false }
  ];
}

function rnDefaultProtocols() {
  return [
    {
      id: "prot_trading_loss_reset",
      typeId: "type_trading",
      title: "Post-Loss Reset",
      summary: "Move from sting → neutral → empowered after a loss.",
      body:
`1. Name the loss
   • Say out loud: “I took a loss of X%. That is data, not a verdict.”
   • Place a hand gently on your chest or forearm.

2. Nervous system reset breath (3 rounds)
   • Inhale for 4 counts.
   • Hold for 2 counts.
   • Exhale slowly for 6 counts.
   • Pause for 2 counts.

3. Extract the signal
   • Ask: “What did this trade teach me about my process?”
   • Write 1–2 bullet lessons (no self-attack).

4. Recommit to the system
   • Say: “My job is to execute my plan. This loss is the cost of staying in the game.”
   • Visualize your next A+ setup being executed calmly.

5. Close the ritual
   • Stand, shake out your hands, roll your shoulders.
   • Mark this protocol as complete.`,
      archived: false
    },
    {
      id: "prot_trading_win_ground",
      typeId: "type_trading",
      title: "Post-Win Grounding",
      summary: "Anchor a win without chasing or inflating risk.",
      body:
`1. Acknowledge the win
   • Say: “I executed my plan. The market rewarded my discipline.”

2. Slow victory breath (3 rounds)
   • Inhale for 4 counts.
   • Exhale for 6 counts.
   • On each exhale, imagine excess hype draining off.

3. Capture the pattern
   • Note: entry, context, risk, exit.
   • Write 1 line: “I want more trades that feel like THIS.”

4. Protect tomorrow
   • Confirm your daily max trades / max gain rules.
   • If hit, close the platform after logging.

5. Close
   • Stretch, hydrate, and mark this protocol as complete.`,
      archived: false
    },
    {
      id: "prot_parent_overwhelm_reset",
      typeId: "type_parent",
      title: "Parent Overwhelm Reset",
      summary: "Shift from tight/triggered → present and grounded.",
      body:
`1. Physically pause
   • Put the phone down. Step out of the room if needed.

2. Name your state (no judgment)
   • “I feel tight / angry / flooded / brittle.”

3. 4–7–8 breathing (3 rounds)
   • Inhale for 4, hold for 7, exhale for 8.

4. Choose your anchor question
   • “What does Future Me wish I did right now?”
   • “What keeps the relationship intact?”

5. Return with one simple ask
   • Pick ONE clear boundary or request.
   • Use a calm, low tone. Stop after you’ve said it once.

6. Mark complete
   • Recognize: “I chose regulation over reaction.”`,
      archived: false
    }
  ];
}

/* ---------- Micro mantras ---------- */
const RN_MICRO_MANTRAS = [
  "I respond with intention, not reflex.",
  "Each breath is a reset button.",
  "Data, not drama. Lesson, not verdict.",
  "My nervous system learns safety through repetition.",
  "Slow is smooth. Smooth is fast.",
  "I can pause without losing momentum.",
  "My discipline compounds more than any single trade.",
];

/* ---------- Load / save ---------- */

function rnLoadAll() {
  // Types
  const tRaw = rnSafeGet(RN_TYPES_KEY);
  if (tRaw) {
    try {
      rnTypes = JSON.parse(tRaw);
      if (!Array.isArray(rnTypes)) rnTypes = rnDefaultTypes();
    } catch {
      rnTypes = rnDefaultTypes();
    }
  } else {
    rnTypes = rnDefaultTypes();
  }

  // Protocols
  const pRaw = rnSafeGet(RN_PROTOCOLS_KEY);
  if (pRaw) {
    try {
      rnProtocols = JSON.parse(pRaw);
      if (!Array.isArray(rnProtocols)) rnProtocols = rnDefaultProtocols();
    } catch {
      rnProtocols = rnDefaultProtocols();
    }
  } else {
    rnProtocols = rnDefaultProtocols();
  }

  // State
  const sRaw = rnSafeGet(RN_STATE_KEY);
  if (sRaw) {
    try {
      rnState = JSON.parse(sRaw) || {};
    } catch {
      rnState = {};
    }
  } else {
    rnState = {};
  }

  // Stats
  const stRaw = rnSafeGet(RN_STATS_KEY);
  if (stRaw) {
    try {
      rnStats = JSON.parse(stRaw) || {};
    } catch {
      rnStats = {};
    }
  } else {
    rnStats = {};
  }

  // Ensure selected type / protocol exist
  const activeTypes = rnTypes.filter(t => !t.archived);
  if (!rnState.selectedTypeId || !activeTypes.some(t => t.id === rnState.selectedTypeId)) {
    rnState.selectedTypeId = activeTypes.length ? activeTypes[0].id : null;
  }

  const activeProtocols = rnProtocols.filter(p => !p.archived);
  if (!rnState.selectedProtocolId || !activeProtocols.some(p => p.id === rnState.selectedProtocolId)) {
    rnState.selectedProtocolId = activeProtocols.length ? activeProtocols[0].id : null;
  }

  if (typeof rnState.wideMode !== "boolean") rnState.wideMode = false;
  if (typeof rnState.bodyCollapsed !== "boolean") rnState.bodyCollapsed = false;

  rnSaveState();
}

function rnSaveTypes() {
  rnSafeSet(RN_TYPES_KEY, JSON.stringify(rnTypes));
}

function rnSaveProtocols() {
  rnSafeSet(RN_PROTOCOLS_KEY, JSON.stringify(rnProtocols));
}

function rnSaveState() {
  rnSafeSet(RN_STATE_KEY, JSON.stringify(rnState));
}

function rnSaveStats() {
  rnSafeSet(RN_STATS_KEY, JSON.stringify(rnStats));
}

/* ---------- Backup / reminder ---------- */

function rnRecordBackupTime() {
  const nowIso = new Date().toISOString();
  rnSafeSet(RN_LAST_BACKUP_KEY, nowIso);
}

function rnGetLastBackupTime() {
  const raw = rnSafeGet(RN_LAST_BACKUP_KEY);
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d;
}

function rnFormatLocalDateTime(isoString) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function rnUpdateBackupReminder() {
  const el = document.getElementById("rnBackupReminder");
  if (!el) return;

  const lastBackup = rnGetLastBackupTime();
  const now = new Date();

  if (!lastBackup) {
    el.innerHTML =
      'No backup yet. <button id="rnBackupNowBtn" class="btn small secondary">Backup now</button>';
  } else {
    const diffMs = now - lastBackup;
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (diffMs > oneDayMs) {
      el.innerHTML =
        'It’s been more than a day since your last backup (' +
        rnFormatLocalDateTime(lastBackup.toISOString()) +
        '). <button id="rnBackupNowBtn" class="btn small secondary">Backup now</button>';
    } else {
      el.textContent =
        "Last backup: " + rnFormatLocalDateTime(lastBackup.toISOString());
    }
  }

  const btn = document.getElementById("rnBackupNowBtn");
  if (btn) btn.addEventListener("click", rnExportData);
}

/* ---------- Magical backup modal ---------- */

function rnOpenBackupModal(json) {
  const backdrop = document.getElementById("rnBackupModal");
  const textarea = document.getElementById("rnBackupModalTextarea");
  if (!backdrop || !textarea) return;

  textarea.value = json;
  backdrop.classList.add("visible");

  setTimeout(() => {
    textarea.focus();
    textarea.select();
  }, 20);
}

function rnCloseBackupModal() {
  const backdrop = document.getElementById("rnBackupModal");
  if (backdrop) backdrop.classList.remove("visible");
}

/* ---------- Micro mantra ---------- */

function rnPickMicroMantra() {
  const el = document.getElementById("rnMicroMantra");
  if (!el || RN_MICRO_MANTRAS.length === 0) return;
  const idx = Math.floor(Math.random() * RN_MICRO_MANTRAS.length);
  el.textContent = RN_MICRO_MANTRAS[idx];
}

/* ---------- Rendering: types, protocols, content ---------- */

function rnGetActiveTypes() {
  return rnTypes.filter(t => !t.archived);
}

function rnGetActiveProtocolsForType(typeId) {
  return rnProtocols.filter(p => !p.archived && p.typeId === typeId);
}

function rnRenderTypes() {
  const select = document.getElementById("rnTypeSelect");
  const manageList = document.getElementById("rnTypeManageList");
  if (!select) return;

  const activeTypes = rnGetActiveTypes();

  // Type select
  select.innerHTML = "";
  if (activeTypes.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No domains yet";
    select.appendChild(opt);
    select.disabled = true;
  } else {
    select.disabled = false;
    activeTypes.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      select.appendChild(opt);
    });
  }

  if (!rnState.selectedTypeId || !activeTypes.some(t => t.id === rnState.selectedTypeId)) {
    rnState.selectedTypeId = activeTypes.length ? activeTypes[0].id : null;
  }
  if (rnState.selectedTypeId) select.value = rnState.selectedTypeId;

  rnSaveState();

  // Manage list
  if (manageList) {
    if (rnTypes.length === 0) {
      manageList.innerHTML = '<p class="rn-settings-helper">No domains yet.</p>';
    } else {
      let html = "";
      rnTypes.forEach(t => {
        html += `
          <div class="rn-manage-row">
            <div class="rn-manage-main">
              <span class="rn-manage-name">${escapeHtml(t.name)}</span>
              <span class="rn-manage-status">${t.archived ? "Archived" : "Active"}</span>
            </div>
            <div class="rn-manage-actions">
              ${
                t.archived
                  ? `<button class="btn xsmall" data-type-action="restore" data-id="${t.id}">Restore</button>`
                  : `<button class="btn xsmall secondary" data-type-action="archive" data-id="${t.id}">Archive</button>`
              }
              <button class="btn xsmall secondary" data-type-action="delete" data-id="${t.id}">Delete</button>
            </div>
          </div>
        `;
      });
      manageList.innerHTML = html;
      manageList.querySelectorAll("button[data-type-action]").forEach(btn => {
        const action = btn.getAttribute("data-type-action");
        const id = btn.getAttribute("data-id");
        btn.addEventListener("click", () => rnHandleTypeManageAction(action, id));
      });
    }
  }

  rnRenderProtocolSelect();
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function rnRenderProtocolSelect() {
  const select = document.getElementById("rnProtocolSelect");
  const manageList = document.getElementById("rnProtocolManageList");
  if (!select) return;

  select.innerHTML = "";

  const typeId = rnState.selectedTypeId;
  if (!typeId) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No domain selected";
    select.appendChild(opt);
    select.disabled = true;
    if (manageList) manageList.innerHTML = '<p class="rn-settings-helper">Select a domain above.</p>';
    rnRenderProtocolContent();
    return;
  }

  const activeProtocols = rnGetActiveProtocolsForType(typeId);
  if (activeProtocols.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No protocols yet";
    select.appendChild(opt);
    select.disabled = true;
  } else {
    select.disabled = false;
    activeProtocols.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.title;
      select.appendChild(opt);
    });
  }

  if (!rnState.selectedProtocolId ||
      !activeProtocols.some(p => p.id === rnState.selectedProtocolId)) {
    rnState.selectedProtocolId = activeProtocols.length ? activeProtocols[0].id : null;
  }
  if (rnState.selectedProtocolId) select.value = rnState.selectedProtocolId;

  rnSaveState();

  // Manage list
  if (manageList) {
    const allForType = rnProtocols.filter(p => p.typeId === typeId);
    if (allForType.length === 0) {
      manageList.innerHTML = '<p class="rn-settings-helper">No protocols yet for this domain.</p>';
    } else {
      let html = "";
      allForType.forEach(p => {
        html += `
          <div class="rn-manage-row">
            <div class="rn-manage-main">
              <span class="rn-manage-name">${escapeHtml(p.title)}</span>
              <span class="rn-manage-status">${p.archived ? "Archived" : "Active"}</span>
            </div>
            <div class="rn-manage-actions">
              ${
                p.archived
                  ? `<button class="btn xsmall" data-prot-action="restore" data-id="${p.id}">Restore</button>`
                  : `<button class="btn xsmall secondary" data-prot-action="archive" data-id="${p.id}">Archive</button>`
              }
              <button class="btn xsmall secondary" data-prot-action="delete" data-id="${p.id}">Delete</button>
            </div>
          </div>
        `;
      });
      manageList.innerHTML = html;
      manageList.querySelectorAll("button[data-prot-action]").forEach(btn => {
        const action = btn.getAttribute("data-prot-action");
        const id = btn.getAttribute("data-id");
        btn.addEventListener("click", () => rnHandleProtocolManageAction(action, id));
      });
    }
  }

  rnRenderProtocolContent();
}

function rnRenderProtocolContent() {
  const titleEl = document.getElementById("rnProtocolTitle");
  const summaryEl = document.getElementById("rnProtocolSummary");
  const bodyEl = document.getElementById("rnProtocolBody");
  const countEl = document.getElementById("rnCompletionCount");
  const lastEl = document.getElementById("rnLastCompleted");
  const toggleBtn = document.getElementById("rnToggleBodyBtn");

  const prot = rnProtocols.find(p => !p.archived && p.id === rnState.selectedProtocolId);
  if (!prot) {
    if (titleEl) titleEl.textContent = "No protocol selected";
    if (summaryEl) summaryEl.textContent = "";
    if (bodyEl) {
      bodyEl.textContent = "";
      bodyEl.classList.remove("collapsed");
    }
    if (countEl) countEl.textContent = "Completed 0 times";
    if (lastEl) lastEl.textContent = "Not completed yet";
    if (toggleBtn) toggleBtn.textContent = "Collapse body";
    rnState.bodyCollapsed = false;
    rnSaveState();
    return;
  }

  if (titleEl) titleEl.textContent = prot.title;
  if (summaryEl) summaryEl.textContent = prot.summary || "";
  if (bodyEl) {
    bodyEl.textContent = prot.body || "";
    if (rnState.bodyCollapsed) {
      bodyEl.classList.add("collapsed");
      if (toggleBtn) toggleBtn.textContent = "Expand body";
    } else {
      bodyEl.classList.remove("collapsed");
      if (toggleBtn) toggleBtn.textContent = "Collapse body";
    }
  }

  const stat = rnStats[prot.id] || { count: 0, lastCompletedIso: null };
  if (countEl) {
    countEl.textContent =
      "Completed " + (stat.count || 0) + (stat.count === 1 ? " time" : " times");
  }
  if (lastEl) {
    if (!stat.lastCompletedIso) {
      lastEl.textContent = "Not completed yet";
    } else {
      lastEl.textContent = "Last: " + rnFormatLocalDateTime(stat.lastCompletedIso);
    }
  }
}

/* ---------- Manage: types ---------- */

function rnHandleTypeManageAction(action, id) {
  const idx = rnTypes.findIndex(t => t.id === id);
  if (idx === -1) return;
  const t = rnTypes[idx];

  if (action === "archive") {
    t.archived = true;
    rnShowToast(`Archived domain: ${t.name}`);
  } else if (action === "restore") {
    t.archived = false;
    rnShowToast(`Restored domain: ${t.name}`);
  } else if (action === "delete") {
    rnShowToast(`Deleted domain: ${t.name}`);
    rnTypes.splice(idx, 1);

    // Remove protocols for this type
    rnProtocols = rnProtocols.filter(p => p.typeId !== id);

    if (rnState.selectedTypeId === id) {
      const active = rnGetActiveTypes();
      rnState.selectedTypeId = active.length ? active[0].id : null;
    }
  }

  rnSaveTypes();
  rnSaveProtocols();
  rnRenderTypes();
}

/* ---------- Manage: protocols ---------- */

function rnHandleProtocolManageAction(action, id) {
  const idx = rnProtocols.findIndex(p => p.id === id);
  if (idx === -1) return;
  const p = rnProtocols[idx];

  if (action === "archive") {
    p.archived = true;
    rnShowToast(`Archived protocol: ${p.title}`);
  } else if (action === "restore") {
    p.archived = false;
    rnShowToast(`Restored protocol: ${p.title}`);
  } else if (action === "delete") {
    rnShowToast(`Deleted protocol: ${p.title}`);
    rnProtocols.splice(idx, 1);
    if (rnState.selectedProtocolId === id) {
      const active = rnProtocols.filter(
        q => !q.archived && q.typeId === rnState.selectedTypeId
      );
      rnState.selectedProtocolId = active.length ? active[0].id : null;
    }
  }

  rnSaveProtocols();
  rnSaveState();
  rnRenderProtocolSelect();
}

/* ---------- Mark complete ---------- */

function rnMarkComplete() {
  const protId = rnState.selectedProtocolId;
  if (!protId) {
    rnShowToast("No protocol selected.");
    return;
  }
  const nowIso = new Date().toISOString();
  const stat = rnStats[protId] || { count: 0, lastCompletedIso: null };
  stat.count = (stat.count || 0) + 1;
  stat.lastCompletedIso = nowIso;
  rnStats[protId] = stat;
  rnSaveStats();
  rnRenderProtocolContent();
  rnShowToast("Protocol marked as complete.");
}

/* ---------- Random protocol ---------- */

function rnRandomProtocol() {
  const activeProtocols = rnProtocols.filter(p => !p.archived);
  if (activeProtocols.length === 0) {
    rnShowToast("No active protocols available.");
    return;
  }
  const idx = Math.floor(Math.random() * activeProtocols.length);
  const pick = activeProtocols[idx];
  rnState.selectedTypeId = pick.typeId;
  rnState.selectedProtocolId = pick.id;
  rnSaveState();
  rnRenderTypes();
  rnShowToast(`Random: ${pick.title}`);
}

/* ---------- Settings + display ---------- */

function rnHandleWideModeToggle(checked) {
  rnState.wideMode = checked;
  rnSaveState();
  const container = document.getElementById("rnWidget");
  if (!container) return;
  if (rnState.wideMode) container.classList.add("wide-mode");
  else container.classList.remove("wide-mode");
}

function rnHandleBodyToggle() {
  rnState.bodyCollapsed = !rnState.bodyCollapsed;
  rnSaveState();
  rnRenderProtocolContent();
}

/* ---------- Import / Export (JSON) ---------- */

function rnExportData() {
  // Only export keys that belong to this widget (prefix rewireNerves_)
  const backup = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("rewireNerves_")) continue;
      backup[key] = localStorage.getItem(key);
    }
  } catch (e) {
    console.error("Error reading localStorage for backup:", e);
    rnShowToast("Error reading data for backup.");
    return;
  }

  const json = JSON.stringify(backup, null, 2);

  const afterExport = (msg) => {
    rnRecordBackupTime();
    rnUpdateBackupReminder();
    if (msg) rnShowToast(msg);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json)
      .then(() => {
        afterExport("Rewire Nerves backup copied to clipboard.");
      })
      .catch(() => {
        rnOpenBackupModal(json);
        afterExport("Backup ready – copy from the panel.");
      });
  } else {
    rnOpenBackupModal(json);
    afterExport("Backup ready – copy from the panel.");
  }
}

function rnImportData() {
  const raw = window.prompt(
    "Paste your Rewire Nerves backup JSON here.\n\nThis will overwrite current Rewire Nerves data:"
  );
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      rnShowToast("Invalid backup format.");
      return;
    }

    // Remove existing rewireNerves_ keys
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("rewireNerves_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error("Error clearing existing keys before import:", e);
    }

    // Restore keys from backup
    Object.keys(parsed).forEach(key => {
      if (!key.startsWith("rewireNerves_")) return;
      try {
        localStorage.setItem(key, parsed[key]);
      } catch (e) {
        console.error("Error restoring key:", key, e);
      }
    });

    rnShowToast("Backup imported. Reloading…");
    setTimeout(() => window.location.reload(), 600);
  } catch (e) {
    console.error("Error importing backup:", e);
    rnShowToast("Error importing data. Check JSON and try again.");
  }
}

/* ---------- DOMContentLoaded ---------- */
document.addEventListener("DOMContentLoaded", () => {
  rnLoadAll();

  // Micro mantra
  rnPickMicroMantra();

  // Initial render
  rnRenderTypes();
  // wide mode
  const container = document.getElementById("rnWidget");
  if (container && rnState.wideMode) container.classList.add("wide-mode");

  const wideToggle = document.getElementById("rnWideModeToggle");
  if (wideToggle) {
    wideToggle.checked = !!rnState.wideMode;
    wideToggle.addEventListener("change", () => rnHandleWideModeToggle(wideToggle.checked));
  }

  // Type select change
  const typeSelect = document.getElementById("rnTypeSelect");
  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      rnState.selectedTypeId = typeSelect.value || null;
      rnSaveState();
      rnRenderTypes();
    });
  }

  // Protocol select change
  const protSelect = document.getElementById("rnProtocolSelect");
  if (protSelect) {
    protSelect.addEventListener("change", () => {
      rnState.selectedProtocolId = protSelect.value || null;
      rnSaveState();
      rnRenderProtocolContent();
    });
  }

  // Mark complete
  const markBtn = document.getElementById("rnMarkCompleteBtn");
  if (markBtn) markBtn.addEventListener("click", rnMarkComplete);

  // Random protocol
  const randBtn = document.getElementById("rnRandomProtocolBtn");
  if (randBtn) randBtn.addEventListener("click", rnRandomProtocol);

  // Collapse/expand body
  const toggleBodyBtn = document.getElementById("rnToggleBodyBtn");
  if (toggleBodyBtn) toggleBodyBtn.addEventListener("click", rnHandleBodyToggle);

  // Settings toggle
  const settingsToggle = document.getElementById("rnSettingsToggle");
  const settingsPanel = document.getElementById("rnSettingsPanel");
  if (settingsToggle && settingsPanel) {
    settingsToggle.addEventListener("click", () => {
      const isOpen = settingsPanel.classList.toggle("open");
      settingsToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  // Add type
  const newTypeInput = document.getElementById("rnNewTypeInput");
  const addTypeBtn = document.getElementById("rnAddTypeBtn");
  if (addTypeBtn && newTypeInput) {
    addTypeBtn.addEventListener("click", () => {
      const name = newTypeInput.value.trim();
      if (!name) {
        rnShowToast("Enter a domain name first.");
        return;
      }
      const id = "type_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
      rnTypes.push({ id, name, archived: false });
      rnSaveTypes();
      rnShowToast(`Added domain: ${name}`);
      newTypeInput.value = "";
      rnRenderTypes();
    });

    newTypeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTypeBtn.click();
      }
    });
  }

  // Add protocol
  const newProtTitle = document.getElementById("rnNewProtocolTitle");
  const newProtSummary = document.getElementById("rnNewProtocolSummary");
  const newProtBody = document.getElementById("rnNewProtocolBody");
  const addProtBtn = document.getElementById("rnAddProtocolBtn");

  if (addProtBtn && newProtTitle && newProtBody) {
    addProtBtn.addEventListener("click", () => {
      if (!rnState.selectedTypeId) {
        rnShowToast("Select a domain before adding a protocol.");
        return;
      }
      const title = newProtTitle.value.trim();
      const summary = (newProtSummary.value || "").trim();
      const body = newProtBody.value.trim();
      if (!title || !body) {
        rnShowToast("Title and body are required.");
        return;
      }
      const id = "prot_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
      rnProtocols.push({
        id,
        typeId: rnState.selectedTypeId,
        title,
        summary,
        body,
        archived: false
      });
      rnSaveProtocols();
      rnShowToast(`Added protocol: ${title}`);
      newProtTitle.value = "";
      newProtSummary.value = "";
      newProtBody.value = "";
      rnRenderProtocolSelect();
    });
  }

  // Import / Export
  const exportBtn = document.getElementById("rnExportDataBtn");
  if (exportBtn) exportBtn.addEventListener("click", rnExportData);

  const importBtn = document.getElementById("rnImportDataBtn");
  if (importBtn) importBtn.addEventListener("click", rnImportData);

  // Backup reminder
  rnUpdateBackupReminder();

  // Backup modal controls
  const backupModalCloseBtn = document.getElementById("rnBackupModalCloseBtn");
  const backupModalSelectBtn = document.getElementById("rnBackupModalSelectBtn");
  const backupBackdrop = document.getElementById("rnBackupModal");
  const backupTextarea = document.getElementById("rnBackupModalTextarea");

  if (backupModalCloseBtn) {
    backupModalCloseBtn.addEventListener("click", rnCloseBackupModal);
  }

  if (backupModalSelectBtn && backupTextarea) {
    backupModalSelectBtn.addEventListener("click", () => {
      backupTextarea.focus();
      backupTextarea.select();
    });
  }

  if (backupBackdrop) {
    backupBackdrop.addEventListener("click", (e) => {
      if (e.target === backupBackdrop) {
        rnCloseBackupModal();
      }
    });
  }
});
