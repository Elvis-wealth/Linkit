(function () {
  "use strict";

  const STORAGE_KEY = "linkit_links";

  const $ = (sel) => document.querySelector(sel);

  const grid = $("#grid");
  const emptyState = $("#empty-state");
  const countEl = $("#count");
  const searchInput = $("#search");
  const linkForm = $("#link-form");
  const editOverlay = $("#edit-overlay");
  const editForm = $("#edit-form");
  const deleteOverlay = $("#delete-overlay");

  let links = loadLinks();
  let deleteTargetId = null;

  function loadLinks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveLinks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }

  function normalizeUrl(value) {
    value = (value || "").trim();
    if (!value) return value;
    if (!/^https?:\/\//i.test(value)) {
      value = "https://" + value;
    }
    return value;
  }

  function faviconFor(url) {
    try {
      const host = new URL(url).hostname;
      return "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(host) + "&sz=128";
    } catch (e) {
      return "";
    }
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function updateCount() {
    const n = links.length;
    countEl.textContent = n + (n === 1 ? " link" : " links");
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = links.filter((link) => {
      const haystack =
        (link.title || "") + " " + (link.url || "") + " " + (link.description || "");
      return haystack.toLowerCase().includes(query);
    });

    grid.innerHTML = "";

    if (links.length === 0) {
      emptyState.hidden = false;
      grid.hidden = true;
    } else if (filtered.length === 0) {
      emptyState.hidden = false;
      emptyState.querySelector("h2").textContent = "No matches";
      emptyState.querySelector("p").textContent =
        "No links match your search. Try a different term.";
      grid.hidden = true;
    } else {
      emptyState.hidden = true;
      grid.hidden = false;
      filtered.forEach((link) => grid.appendChild(buildCard(link)));
    }

    updateCount();
  }

  function buildCard(link) {
    const card = document.createElement("article");
    card.className = "card";

    const top = document.createElement("div");
    top.className = "card-top";

    if (link.image) {
      const img = document.createElement("img");
      img.className = "card-img";
      img.src = link.image;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = function () {
        img.replaceWith(buildFallback(link));
      };
      top.appendChild(img);
    } else {
      top.appendChild(buildFallback(link));
    }

    const heading = document.createElement("div");
    heading.className = "card-heading";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = link.title || "Untitled";

    const url = document.createElement("a");
    url.className = "card-url";
    url.href = link.url;
    url.target = "_blank";
    url.rel = "noopener noreferrer";
    url.textContent = link.url;

    heading.appendChild(title);
    heading.appendChild(url);
    top.appendChild(heading);
    card.appendChild(top);

    if (link.description) {
      const desc = document.createElement("p");
      desc.className = "card-desc";
      desc.textContent = link.description;
      card.appendChild(desc);
    } else {
      const spacer = document.createElement("p");
      spacer.className = "card-desc";
      spacer.textContent = "No description.";
      card.appendChild(spacer);
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-ghost";
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEdit(link.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => openDelete(link.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);

    return card;
  }

  function buildFallback(link) {
    const div = document.createElement("div");
    div.className = "card-img-fallback";
    const letter = (link.title || "?").trim().charAt(0).toUpperCase() || "?";
    div.textContent = letter;
    return div;
  }

  function addLink(e) {
    e.preventDefault();
    const title = $("#title").value.trim();
    const rawUrl = $("#url").value.trim();
    const description = $("#description").value.trim();

    if (!title || !rawUrl) return;

    const url = normalizeUrl(rawUrl);

    links.push({
      id: makeId(),
      title: title,
      url: url,
      description: description,
      image: faviconFor(url),
      createdAt: Date.now(),
    });

    saveLinks();
    linkForm.reset();
    render();
    $("#title").focus();
  }

  function openEdit(id) {
    const link = links.find((l) => l.id === id);
    if (!link) return;

    $("#edit-name").value = link.title;
    $("#edit-url").value = link.url;
    $("#edit-description").value = link.description;
    editOverlay.dataset.id = id;
    editOverlay.hidden = false;
    $("#edit-name").focus();
  }

  function saveEdit(e) {
    e.preventDefault();
    const id = editOverlay.dataset.id;
    const link = links.find((l) => l.id === id);
    if (!link) return;

    const title = $("#edit-name").value.trim();
    const rawUrl = $("#edit-url").value.trim();
    const description = $("#edit-description").value.trim();

    if (!title || !rawUrl) return;

    const url = normalizeUrl(rawUrl);

    link.title = title;
    link.url = url;
    link.description = description;
    link.image = faviconFor(url);

    saveLinks();
    closeEdit();
    render();
  }

  function closeEdit() {
    editOverlay.hidden = true;
    editOverlay.dataset.id = "";
  }

  function openDelete(id) {
    deleteTargetId = id;
    const link = links.find((l) => l.id === id);
    if (!link) return;
    $("#delete-name").textContent = link.title || "this link";
    deleteOverlay.hidden = false;
    $("#delete-confirm").focus();
  }

  function confirmDelete() {
    if (deleteTargetId == null) return;
    links = links.filter((l) => l.id !== deleteTargetId);
    deleteTargetId = null;
    saveLinks();
    closeDelete();
    render();
  }

  function closeDelete() {
    deleteOverlay.hidden = true;
    deleteTargetId = null;
  }

  linkForm.addEventListener("submit", addLink);
  editForm.addEventListener("submit", saveEdit);
  searchInput.addEventListener("input", render);

  $("#edit-cancel").addEventListener("click", closeEdit);
  $("#delete-cancel").addEventListener("click", closeDelete);
  $("#delete-confirm").addEventListener("click", confirmDelete);

  editOverlay.addEventListener("click", (e) => {
    if (e.target === editOverlay) closeEdit();
  });
  deleteOverlay.addEventListener("click", (e) => {
    if (e.target === deleteOverlay) closeDelete();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!deleteOverlay.hidden) closeDelete();
      else if (!editOverlay.hidden) closeEdit();
    }
  });

  render();
})();
