let protocols = [];
let currentProtocol = null;

const LAST_PROTOCOL_KEY = "rewireNerves_lastProtocolId";
const COMPLETION_PREFIX = "rewireNerves_completed_";

async function loadProtocols() {
  try {
    const response = await fetch("protocols.json");
    if (!response.ok) throw new Error("Failed to load protocols.json");
    protocols = await response.json();

    const lastProtocolId = safeGetLocalStorage(LAST_PROTOCOL_KEY);
    const lastProtocol = protocols.find((p) => p.id === lastProtocolId) || null;

    const categories = getUniqueCategories(protocols);
    populateCategorySelect(categories, lastProtocol?.category);

    const initialCategory = lastProtocol?.category || "All";
    filterAndPopulateProtocols(initialCategory, lastProtocol?.id);
  } catch (error) {
    console.error(error);
    const bodyEl = document.getElementById("protocolBody");
    if (bodyEl) {
      bodyEl.textContent = "Error loading protocols. Please check protocols.json.";
    }
  }
}

function getUniqueCategories(list) {
  const set = new Set();
  list.forEach((p) => {
    set.add(p.category || "Other");
  });
  return Array.from(set).sort();
}

function populateCategorySelect(categories, selectedCategory) {
  const catSelect = document.getElementById("categorySelect");
  if (!catSelect) return;

  catSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "All";
  allOption.textContent = "All";
  catSelect.appendChild(allOption);

  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    catSelect.appendChild(option);
  });

  catSelect.value = selectedCategory || "All";

  catSelect.onchange = (e) => {
    const category = e.target.value;
    filterAndPopulateProtocols(category, null);
  };
}

function filterAndPopulateProtocols(category, preferredProtocolId) {
  const protocolSelect = document.getElementById("protocolSelect");
  if (!protocolSelect) return;

  let filtered = protocols;
  if (category && category !== "All") {
    filtered = protocols.filter((p) => (p.category || "Other") === category);
  }

  protocolSelect.innerHTML = "";

  filtered.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.name;
    protocolSelect.appendChild(option);
  });

  protocolSelect.onchange = (e) => {
    setProtocol(e.target.value);
  };

  let idToSelect = null;
  if (preferredProtocolId && filtered.some((p) => p.id === preferredProtocolId)) {
    idToSelect = preferredProtocolId;
  } else if (filtered.length > 0) {
    idToSelect = filtered[0].id;
  }

  if (idToSelect) {
    protocolSelect.value = idToSelect;
    setProtocol(idToSelect);
  } else {
    clearProtocolDisplay();
  }
}

function setProtocol(id) {
  const protocol = protocols.find((p) => p.id === id);
  if (!protocol) return;

  currentProtocol = protocol;

  const nameEl = document.getElementById("protocolName");
  const tagsEl = document.getElementById("protocolTags");
  const bodyEl = document.getElementById("protocolBody");

  if (nameEl) nameEl.textContent = protocol.name;

  if (tagsEl) {
    if (Array.isArray(protocol.tags)) {
      tagsEl.textContent = protocol.tags.join(" • ");
    } else if (typeof protocol.tags === "string") {
      tagsEl.textContent = protocol.tags;
    } else {
      tagsEl.textContent = "";
    }
  }

  if (bodyEl) bodyEl.textContent = protocol.body;

  safeSetLocalStorage(LAST_PROTOCOL_KEY, id);
  updateCompletionUI(id);
}

function clearProtocolDisplay() {
  const nameEl = document.getElementById("protocolName");
  const tagsEl = document.getElementById("protocolTags");
  const bodyEl = document.getElementById("protocolBody");

  if (nameEl) nameEl.textContent = "";
  if (tagsEl) tagsEl.textContent = "";
  if (bodyEl) bodyEl.textContent = "";
  updateCompletionUI(null);
}

/* Completion tracking */

function setupCompletionButton() {
  const btn = document.getElementById("completeBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!currentProtocol) return;

    const key = COMPLETION_PREFIX + currentProtocol.id;
    let data = { count: 0, lastCompleted: null };

    const existing = safeGetLocalStorage(key);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (typeof parsed.count === "number") data.count = parsed.count;
        if (parsed.lastCompleted) data.lastCompleted = parsed.lastCompleted;
      } catch {
        // ignore parse errors, overwrite with fresh object
      }
    }

    data.count += 1;
    data.lastCompleted = new Date().toISOString();
    safeSetLocalStorage(key, JSON.stringify(data));
    updateCompletionUI(currentProtocol.id);
  });
}

function updateCompletionUI(protocolId) {
  const infoEl = document.getElementById("completionInfo");
  if (!infoEl) return;

  if (!protocolId) {
    infoEl.textContent = "Steady gains come from steady nervous systems.";
    return;
  }

  const key = COMPLETION_PREFIX + protocolId;
  const raw = safeGetLocalStorage(key);
  if (!raw) {
    infoEl.textContent = "Steady gains come from steady nervous systems.";
    return;
  }

  try {
    const data = JSON.parse(raw);
    const count = data.count || 0;
    const lastCompleted = data.lastCompleted
      ? formatLocalDateTime(data.lastCompleted)
      : "Unknown time";

    infoEl.textContent = `Last completed: ${lastCompleted} • Count: ${count}`;
  } catch {
    infoEl.textContent = "Steady gains come from steady nervous systems.";
  }
}

/* Helpers */

function formatLocalDateTime(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "Invalid date";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function safeGetLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore (e.g., private mode or blocked)
  }
}

/* Init */

document.addEventListener("DOMContentLoaded", () => {
  loadProtocols();
  setupCompletionButton();
});
