document.addEventListener("DOMContentLoaded", () => {
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  const dropdownSection = document.querySelector(".dropdown-section");
  const savePdfBtn = document.getElementById("savePdfBtn");
  const captureBtn = document.getElementById("captureBtn");

  // ========================
  // Dropdown Functionality
  // ========================
  if (dropdownToggle && dropdownSection) {
    dropdownToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownSection.classList.toggle("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (event) => {
      if (!dropdownSection.contains(event.target) && !dropdownToggle.contains(event.target)) {
        dropdownSection.classList.remove("active");
      }
    });
  }

  // ========================
  // Save as PDF
  // ========================
  if (savePdfBtn) {
    savePdfBtn.addEventListener("click", async () => {
      await handleAction(savePdfBtn, generatePDF);
    });
  }

  // ========================
  // Capture Screenshot
  // ========================
  if (captureBtn) {
    captureBtn.addEventListener("click", async () => {
      await handleAction(captureBtn, captureScreenshot);
    });
  }
});

// =====================================================================================
// Core Action Handler (manages button state, tab validation, and error handling)
// =====================================================================================
async function handleAction(button, actionFn) {
  try {
    button.classList.add("loading");
    button.disabled = true;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("No active tab found");

    // Block internal pages
    const blockedSchemes = ["chrome:", "chrome-extension:", "edge:", "about:", "devtools:"];
    if (blockedSchemes.some((scheme) => tab.url.startsWith(scheme))) {
      alert("Cannot access internal browser pages (like chrome:// or extensions).");
      return;
    }

    await actionFn(tab);
  } catch (err) {
    console.error(err);
    alert(`Error: ${err.message}`);
  } finally {
    resetButton(button);
  }
}

// =====================================================================================
// Screenshot Functionality
// =====================================================================================
async function captureScreenshot(tab) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      try {
        const blobData = dataURItoBlob(dataUrl);
        const blobUrl = URL.createObjectURL(blobData);

        const filename = generateFilename(tab.url, "webview.png");

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(blobUrl);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  return new Blob([ab], { type: mimeString });
}

// =====================================================================================
// PDF Functionality
// =====================================================================================
async function generatePDF(tab) {
  try {
    const filename = generateFilename(tab.url, "webview.pdf");

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: triggerPrint,
      args: [filename],
    });
  } catch (error) {
    throw new Error("Failed to generate PDF: " + error.message);
  }
}

// Injected into page to trigger print dialog
function triggerPrint(filename) {
  const originalTitle = document.title;
  document.title = filename.replace(".pdf", "");

  const style = document.createElement("style");
  style.textContent = `
    @media print {
      body { margin: 0 !important; padding: 0 !important; }
      * { -webkit-print-color-adjust: exact !important; }
    }
  `;
  document.head.appendChild(style);

  window.print();

  setTimeout(() => {
    document.title = originalTitle;
    style.remove();
  }, 1000);
}

// =====================================================================================
// Helpers
// =====================================================================================
function resetButton(btn) {
  if (!btn) return;
  btn.classList.remove("loading");
  btn.disabled = false;
}

// Generate filename with local date/time and sanitized URL
function generateFilename(urlString, suffix) {
  const now = new Date();
  
  // Get local time components
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const dateStr = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

  let hostPart = "unknown";
  try {
    const url = new URL(urlString);
    // Example: https://www.openai.com/blog → openai_com_blog
    hostPart = `${url.hostname.replace(/^www\./, "")}${url.pathname}`
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  } catch {
    hostPart = "webpage";
  }

  return `${dateStr}_${hostPart}_${suffix}`;
}
