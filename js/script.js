// script.js
const initApp = () => {
  // DOM Elements
  const photoUpload = document.getElementById("photo-upload");
  const fileNameDisplay = document.getElementById("file-name");
  const userPhoto = document.getElementById("user-photo");
  const photoPlaceholder = document.getElementById("photo-placeholder");
  const activeFrame = document.getElementById("active-frame");
  const workspaceArea = document.getElementById("workspace-area");

  // Sliders & Export Controls
  const zoomSlider = document.getElementById("zoom-slider");
  const zoomValue = document.getElementById("zoom-value");
  const opacitySlider = document.getElementById("opacity-slider");
  const opacityValue = document.getElementById("opacity-value");
  const qualitySlider = document.getElementById("quality-slider");
  const qualityValue = document.getElementById("quality-value");
  const outWidth = document.getElementById("output-width");
  const outHeight = document.getElementById("output-height");
  const estimatedSize = document.querySelector(".info-value");
  const exportBtn = document.querySelector(".export-button");

  // Transform State
  let currentZoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  // Apply current transform to the user photo
  const updateTransform = () => {
    userPhoto.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
  };

  // ─── PHOTO UPLOAD ───
  photoUpload.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      fileNameDisplay.textContent = file.name;

      const reader = new FileReader();
      reader.onload = (event) => {
        userPhoto.src = event.target.result;
        userPhoto.style.display = "block";
        photoPlaceholder.style.display = "none";
        // Reset transforms on new upload
        currentZoom = 1;
        panX = 0;
        panY = 0;
        zoomSlider.value = 100;
        zoomValue.textContent = "100%";
        opacitySlider.value = 100;
        opacityValue.textContent = "100%";
        userPhoto.style.opacity = 1;
        updateTransform();
      };
      reader.readAsDataURL(file);
    } else {
      fileNameDisplay.textContent = "No file selected";
    }
  });

  // ─── DRAG TO PAN ───
  userPhoto.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    userPhoto.style.cursor = "grabbing";
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      userPhoto.style.cursor = "grab";
    }
  });

  // ─── DOUBLE CLICK TO RESET ───
  userPhoto.addEventListener("dblclick", () => {
    currentZoom = 1;
    panX = 0;
    panY = 0;
    updateTransform();
    zoomSlider.value = 100;
    zoomValue.textContent = "100%";
    opacitySlider.value = 100;
    opacityValue.textContent = "100%";
    userPhoto.style.opacity = 1;
  });

  // ─── SCROLL TO ZOOM ───
  workspaceArea.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const zoomSpeed = 0.05;
      if (e.deltaY < 0) {
        currentZoom = Math.min(currentZoom + zoomSpeed, 2.0);
      } else {
        currentZoom = Math.max(currentZoom - zoomSpeed, 0.1);
      }
      updateTransform();
      zoomSlider.value = Math.round(currentZoom * 100);
      zoomValue.textContent = `${zoomSlider.value}%`;
    },
    { passive: false },
  );

  // ─── ZOOM SLIDER ───
  zoomSlider.addEventListener("input", (e) => {
    zoomValue.textContent = `${e.target.value}%`;
    currentZoom = e.target.value / 100;
    updateTransform();
  });

  // ─── OPACITY SLIDER ───
  opacitySlider.addEventListener("input", (e) => {
    opacityValue.textContent = `${e.target.value}%`;
    userPhoto.style.opacity = e.target.value / 100;
  });

  // ─── QUALITY SLIDER ───
  qualitySlider.addEventListener("input", (e) => {
    qualityValue.textContent = `${e.target.value}%`;
    updateEstimatedSize();
  });

  // ─── ESTIMATED SIZE ───
  const updateEstimatedSize = () => {
    const w = parseInt(outWidth.value) || 1920;
    const h = parseInt(outHeight.value) || 1080;
    const q = parseInt(qualitySlider.value) || 90;
    const uncompressedBytes = w * h * 3;
    const compressionFactor = 15;
    const qualityFactor = q / 100;
    const estimatedBytes =
      (uncompressedBytes / compressionFactor) * qualityFactor;
    const estimatedMb = (estimatedBytes / (1024 * 1024)).toFixed(2);
    estimatedSize.textContent = `~${estimatedMb} MB`;
  };

  outWidth.addEventListener("input", () => syncOutputDimensions("width"));
  outHeight.addEventListener("input", () => syncOutputDimensions("height"));

  // Sync output size to frame aspect ratio
  const syncOutputDimensions = (changedDimension) => {
    if (!activeFrame.naturalWidth || !activeFrame.naturalHeight) return;
    const ratio = activeFrame.naturalHeight / activeFrame.naturalWidth;
    if (changedDimension === "width") {
      const w = parseInt(outWidth.value) || 1920;
      outHeight.value = Math.round(w * ratio);
    } else {
      const h = parseInt(outHeight.value) || 1080;
      outWidth.value = Math.round(h / ratio);
    }
    updateEstimatedSize();
  };

  activeFrame.addEventListener("load", () => {
    syncOutputDimensions("width");
  });

  updateEstimatedSize();

  // ─── FRAME SELECTION ───
  const frameOptions = document.querySelectorAll(".frame-option");
  frameOptions.forEach((option) => {
    option.addEventListener("click", () => {
      frameOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");
      const selectedFrame = option.getAttribute("data-frame");
      activeFrame.src = `assets/${selectedFrame}.png`;
    });
  });

  // ─── EXPORT ───
  exportBtn.addEventListener("click", () => {
    if (!userPhoto.src || userPhoto.style.display === "none") {
      alert("Please upload a photo first.");
      return;
    }

    exportBtn.textContent = "Processing...";
    exportBtn.style.opacity = 0.7;
    exportBtn.disabled = true;

    setTimeout(() => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const width = parseInt(outWidth.value) || 1920;
      const height = parseInt(outHeight.value) || 1080;
      canvas.width = width;
      canvas.height = height;

      // 1) Draw user photo as background (cover the full canvas)
      const imgW = userPhoto.naturalWidth;
      const imgH = userPhoto.naturalHeight;

      if (imgW > 0 && imgH > 0) {
        // Calculate cover fit
        const scaleX = width / imgW;
        const scaleY = height / imgH;
        const coverScale = Math.max(scaleX, scaleY);
        const drawW = imgW * coverScale;
        const drawH = imgH * coverScale;

        // Map the UI pixel pan to the export canvas scale
        const workspaceRect = workspaceArea.getBoundingClientRect();
        const scaleRatio = width / workspaceRect.width;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.clip();

        ctx.globalAlpha = parseFloat(userPhoto.style.opacity) || 1;

        // Center the image, then apply user pan and zoom
        const centerX = width / 2 + panX * scaleRatio;
        const centerY = height / 2 + panY * scaleRatio;
        ctx.translate(centerX, centerY);
        ctx.scale(currentZoom, currentZoom);
        ctx.drawImage(userPhoto, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }

      // 2) Draw frame overlay on top
      const frameImg = new Image();
      frameImg.onload = () => {
        // Draw Frame Overlay with screen blending to match CSS
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(frameImg, 0, 0, width, height);
        ctx.globalCompositeOperation = "source-over"; // reset

        // Trigger download
        const formatRadio = document.querySelector(
          'input[name="export-format"]:checked',
        );
        const format = formatRadio ? formatRadio.value : "jpeg";
        const mimeType = `image/${format}`;
        const quality = (parseInt(qualitySlider.value) || 90) / 100;

        const dataUrl = canvas.toDataURL(mimeType, quality);
        const link = document.createElement("a");
        link.download = `frame-it-export.${format}`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        exportBtn.textContent = "Export Frame";
        exportBtn.style.opacity = 1;
        exportBtn.disabled = false;
      };

      frameImg.onerror = () => {
        alert("Failed to load frame image for export.");
        exportBtn.textContent = "Export Frame";
        exportBtn.style.opacity = 1;
        exportBtn.disabled = false;
      };

      frameImg.src = activeFrame.src;
    }, 50);
  });
};

// Boot
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
