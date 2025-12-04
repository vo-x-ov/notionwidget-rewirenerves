let protocols = [];
let currentProtocol = null;

async function loadProtocols() {
  try {
    const response = await fetch("protocols.json");
    if (!response.ok) throw new Error("Failed to load protocols.json");
    protocols = await response.json();
    populateSelect();
    if (protocols.length > 0) {
      // Optionally remember last selection later with localStorage
      setProtocol(protocols[0].id);
    }
  } catch (error) {
    console.error(error);
    const bodyEl = document.getElementById("protocolBody");
    if (bodyEl) {
      bodyEl.textContent = "Error loading protocols. Please check protocols.json.";
    }
  }
}

function populateSelect() {
  const select = document.getElementById("protocolSelect");
  if (!select) return;

  select.innerHTML = "";

  protocols.forEach((protocol) => {
    const option = document.createElement("option");
    option.value = protocol.id;
    option.textContent = protocol.name;
    select.appendChild(option);
  });

  select.addEventListener("change", (e) => {
    setProtocol(e.target.value);
  });
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
}

document.addEventListener("DOMContentLoaded", loadProtocols);
