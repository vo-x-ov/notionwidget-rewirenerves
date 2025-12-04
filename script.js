let baseProtocols = [];
let customProtocols = [];
let protocols = []; // base + custom, excluding deleted
let currentProtocol = null;

let archivedIds = [];
let deletedIds = [];

const LAST_PROTOCOL_KEY = "rewireNerves_lastProtocolId";
const COMPLETION_PREFIX = "rewireNerves_completed_";
const CUSTOM_PROTOCOLS_KEY = "rewireNerves_customProtocols";
const ARCHIVED_IDS_KEY = "rewireNerves_archivedIds";
const DELETED_IDS_KEY = "rewireNerves_deletedIds";

/* ---------- Main load ---------- */

async function loadProtocols() {
  try {
    const response = await fetch("protocols.json");
    if (!response.ok) throw new Error("Failed to load protocols.json");
    baseProtocols = await response.json();

    customProtocols = loadCustomProtocols();
    archivedIds = loadIdList(ARCHIVED_IDS_KEY);
    deletedIds = loadIdList(DELETED_IDS_KEY);

    protocols = baseProtocols
      .concat(customProtocols)
      .filter((p) => deletedIds.indexOf(p.id) === -1);

    const lastProtocolId = safeGetLocalStorage(LAST_PROTOCOL_KEY);
    const lastProtocol = lastProtocolId
      ? protocols.find((p) => p.id === lastProtocolId) || null
      : null;

    const categories = getUniqueCategories(protocols);
    populateCategorySelect(categories, lastProtocol ? lastProtocol.category : null);

    const initialCategory = lastProtocol && lastProtocol.category ? lastProtocol.category : "All";
    filterAndPopulateProtocols(initialCategory, lastProtocol ? lastProtocol.id : null);
  } catch (error) {
    console.error(error);
    const bodyEl = document.getElementById("protocolBody");
    if (bodyEl) {
      bodyEl.textContent = "Error loading protocols. Please check protocols.json.";
    }
  }
}

/* ---------- Helpers: local data ---------- */

function loadCustomProtocols() {
  const raw = safeGetLocalStorage(CUSTOM_PROTOCOLS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.error("Error parsing custom protocols:", e);
  }
  return [];
}

function saveCustomProtocols() {
  safeSetLocalStorage(CUSTOM_PROTOCOLS_KEY, JSON.stringify(customProtocols));
}

function loadIdList(key) {
  const raw = safeGetLocalStorage(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.error("Error parsing id list for", key, e);
  }
  return [];
}

function saveIdList(key, arr) {
  safeSetLocalStorage(key, JSON.stringify(arr));
}

/* ---------- Categories & dropdowns ---------- */

function getUniqueCategories(list) {
  const set = {};
  list.forEach((p) => {
    const c = p.category || "Other";
    set[c] = true;
  });
  return Object.keys(set).sort();
}

function populateCategorySelect(categories, selectedCategory) {
  const catSelect = document.getElementById("categorySelect");
  if (!catSelect) return;

  catSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "All";
  allOption.textContent = "All";
  catSelect.appendChild(allOption);

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    catSelect.appendChild(option);
  }

  catSelect.value = selectedCategory || "All";

  catSelect.onchange = function (e) {
    const category = e.target.value;
    filterAndPopulateProtocols(category, null);
  };
}

function filterAndPopulateProtocols(category, preferredProtocolId) {
  const protocolSelect = document.getElementById("protocolSelect");
  if (!protocolSelect) return;

  let filtered = protocols.filter(function (p) {
    return archivedIds.indexOf(p.id) === -1;
  });

  if (category && category !== "All") {
    filtered = filtered.filter(function (p) {
      return (p.category || "Other") === category;
    });
  }

  protocolSelect.innerHTML = "";

  for (let i = 0; i < filtered.length; i++) {
    const p = filtered[i];
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.name;
    protocolSelect.appendChild(option);
  }

  protocolSelect.onchange = function (e) {
    setProtocol(e.target.value);
  };

  let idToSelect = null;
  if (
    preferredProtocolId &&
    filtered.some(function (p) {
      return p.id === preferredProtocolId;
    })
  ) {
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

/* ---------- Protocol selection & display ---------- */

function setProtocol(id) {
  const protocol = protocols.find(function (p) {
    return p.id === id;
  });
  if (!protocol) return;
  if (archivedIds.indexOf(id) !== -1 || deletedIds.indexOf(id) !== -1) return;

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
  updateMicroMantra(protocol);
}

function clearProtocolDisplay() {
  const nameEl = document.getElementById("protocolName");
  const tagsEl = document.getElementById("protocolTags");
  const bodyEl = document.getElementById("protocolBody");

  if (nameEl) nameEl.textContent = "";
  if (tagsEl) tagsEl.textContent = "";
  if (bodyEl) bodyEl.textContent = "";

  updateCompletionUI(null);
  updateMicroMantra(null);
}

/* ---------- Micro Mantra ---------- */

function updateMicroMantra(protocol) {
  const el = document.getElementById("microMantra");
  if (!el) return;

  if (!protocol) {
    el.textContent = "Today's micro mantra will appear here.";
    return;
  }

  const mantra = extractMicroMantra(protocol.body);
  el.textContent = "Today's micro mantra: " + mantra;
}

function extractMicroMantra(text) {
  if (!text) return "I can shift my state, one breath at a time.";

  const rawLines = text.split(/\r?\n/);
  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (trimmed.length > 0) lines.push(trimmed);
  }

  if (lines.length === 0) {
    return "I can shift my state, one breath at a time.";
  }

  function stripBullet(s) {
    return s.replace(/^[-•\d.)\s]+/, "").trim();
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("“") !== -1 || lines[i].indexOf('"') !== -1) {
      return stripBullet(lines[i]);
    }
  }

  for (let j = 0; j < lines.length; j++) {
    if (/^(I|This|We|My|It)\b/i.test(lines[j])) {
      return stripBullet(lines[j]);
    }
  }

  return stripBullet(lines[0]);
}

/* ---------- Completion tracking ---------- */

function setupCompletionButton() {
  const btn = document.getElementById("completeBtn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    if (!currentProtocol) return;

    const key = COMPLETION_PREFIX + currentProtocol.id;
    let data = { count: 0, lastCompleted: null };

    const existing = safeGetLocalStorage(key);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (typeof parsed.count === "number") data.count = parsed.count;
        if (parsed.lastCompleted) data.lastCompleted = parsed.lastCompleted;
      } catch (e) {
        console.error("Error parsing completion data:", e);
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

    infoEl.textContent =
      "Last completed: " + lastCompleted + " • Count: " + count;
  } catch (e) {
    console.error("Error parsing completion UI data:", e);
    infoEl.textContent = "Steady gains come from steady nervous systems.";
  }
}

/* ---------- Random protocol ---------- */

function setupRandomButton() {
  const btn = document.getElementById("randomBtn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    const select = document.getElementById("protocolSelect");
    if (!select || select.options.length === 0) return;

    const total = select.options.length;
    if (total === 1) {
      const onlyId = select.options[0].value;
      select.value = onlyId;
      setProtocol(onlyId);
      return;
    }

    let idx = Math.floor(Math.random() * total);
    let safety = 0;
    if (currentProtocol) {
      while (
        select.options[idx].value === currentProtocol.id &&
        safety < 10
      ) {
        idx = Math.floor(Math.random() * total);
        safety++;
      }
    }
    const id = select.options[idx].value;
    select.value = id;
    setProtocol(id);
  });
}

/* ---------- Add / Archive / Manage Archive ---------- */

function setupAddButton() {
  const btn = document.getElementById("addBtn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    const name = window.prompt("New protocol name:");
    if (!name) return;

    let category = window.prompt(
      "Category (e.g., Trading, Parenting, Relationship, Self):",
      "Self"
    );
    if (!category) category = "Self";

    const tagsInput = window.prompt(
      "Tags (comma-separated, optional):",
      ""
    );

    const body = window.prompt(
      "Protocol steps / body (you can paste multi-line text and press OK):"
    );
    if (!body) return;

    let tags = [];
    if (tagsInput && tagsInput.trim().length > 0) {
      tags = tagsInput
        .split(",")
        .map(function (t) {
          return t.trim();
        })
        .filter(function (t) {
          return t.length > 0;
        });
    }

    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
    const uniqueId = "custom_" + baseSlug + "_" + Date.now();

    const newProtocol = {
      id: uniqueId,
      name: name,
      category: category,
      tags: tags,
      body: body
    };

    customProtocols.push(newProtocol);
    saveCustomProtocols();
    loadProtocols();
  });
}

function setupArchiveButton() {
  const btn = document.getElementById("archiveBtn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    if (!currentProtocol) return;
    const id = currentProtocol.id;

    if (archivedIds.indexOf(id) !== -1) {
      window.alert("This protocol is already archived.");
      return;
    }

    archivedIds.push(id);
    saveIdList(ARCHIVED_IDS_KEY, archivedIds);

    const catSelect = document.getElementById("categorySelect");
    const category = catSelect ? catSelect.value : "All";
    filterAndPopulateProtocols(category, null);
  });
}

function setupManageArchiveButton() {
  const btn = document.getElementById("manageArchiveBtn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    const allProtocols = baseProtocols.concat(customProtocols);
    const archivedProtocols = allProtocols.filter(function (p) {
      return archivedIds.indexOf(p.id) !== -1 && deletedIds.indexOf(p.id) === -1;
    });

    if (archivedProtocols.length === 0) {
      window.alert("No archived protocols.");
      return;
    }

    let listStr = "";
    for (let i = 0; i < archivedProtocols.length; i++) {
      const p = archivedProtocols[i];
      listStr +=
        (i + 1) +
        ". " +
        p.name +
        " [" +
        (p.category || "Other") +
        "]\n";
    }

    const actionRaw = window.prompt(
      "Archive manager:\n\n" +
        listStr +
        "\nType 'r' to restore, 'd' to delete permanently, or press Cancel to exit."
    );
    if (!actionRaw) return;
    const action = actionRaw.trim().toLowerCase();
    if (action !== "r" && action !== "d") return;

    const indexRaw = window.prompt(
      "Enter the number of the protocol to act on:"
    );
    if (!indexRaw) return;
    const index = parseInt(indexRaw, 10);
    if (isNaN(index) || index < 1 || index > archivedProtocols.length) {
      window.alert("Invalid selection.");
      return;
    }

    const target = archivedProtocols[index - 1];
    if (!target) return;

    if (action === "r") {
      archivedIds = archivedIds.filter(function (id) {
        return id !== target.id;
      });
      saveIdList(ARCHIVED_IDS_KEY, archivedIds);
      loadProtocols();
    } else if (action === "d") {
      const isCustom = customProtocols.some(function (p) {
        return p.id === target.id;
      });

      if (isCustom) {
        customProtocols = customProtocols.filter(function (p) {
          return p.id !== target.id;
        });
        saveCustomProtocols();
      } else {
        if (deletedIds.indexOf(target.id) === -1) {
          deletedIds.push(target.id);
          saveIdList(DELETED_IDS_KEY, deletedIds);
        }
      }

      archivedIds = archivedIds.filter(function (id) {
        return id !== target.id;
      });
      saveIdList(ARCHIVED_IDS_KEY, archivedIds);

      loadProtocols();
    }
  });
}

/* ---------- Utilities ---------- */

function formatLocalDateTime(isoString) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "Invalid date";

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
  } catch (e) {
    console.error("localStorage get error:", e);
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    console.error("localStorage set error:", e);
  }
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", function () {
  loadProtocols();
  setupCompletionButton();
  setupRandomButton();
  setupAddButton();
  setupArchiveButton();
  setupManageArchiveButton();
});
