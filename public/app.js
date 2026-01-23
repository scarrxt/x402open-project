const listEl = document.getElementById("file-list");
const statusEl = document.getElementById("status");

const setStatus = (message) => {
  statusEl.textContent = message;
};

const fetchFiles = async () => {
  const res = await fetch("/files");
  if (!res.ok) {
    throw new Error(`Failed to load files: ${res.status}`);
  }
  return res.json();
};

const downloadFile = async (id, url) => {
  setStatus(`Processing payment for ${id}...`);
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const details = await res.text();
    setStatus(`Purchase failed (${res.status}). Details:\n${details}`);
    return;
  }

  setStatus("Payment complete. Downloading file...");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  setStatus(`Downloaded ${id}.pdf`);
};

const renderFiles = (files) => {
  if (!files.length) {
    listEl.textContent = "No files available.";
    return;
  }

  listEl.innerHTML = "";
  files.forEach((file) => {
    const row = document.createElement("div");
    row.className = "file-row";

    const meta = document.createElement("div");
    meta.className = "file-meta";
    meta.innerHTML = `
      <div class="file-name">${file.filename}</div>
      <div class="file-price">${file.price} • ${file.network}</div>
    `;

    const button = document.createElement("button");
    button.className = "btn";
    button.textContent = "Download";
    button.addEventListener("click", () => downloadFile(file.id, file.purchaseUrl ?? file.downloadUrl));

    row.appendChild(meta);
    row.appendChild(button);
    listEl.appendChild(row);
  });
};

const init = async () => {
  try {
    const data = await fetchFiles();
    renderFiles(data.files ?? []);
    setStatus("Ready. Click Download to begin.");
  } catch (err) {
    setStatus(err.message);
  }
};

init();
