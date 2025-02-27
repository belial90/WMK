document.addEventListener("DOMContentLoaded", () => {
    const images = [],
        elements = {
            dropArea: document.getElementById("drop-area"),
            gallery: document.getElementById("gallery"),
            clearButton: document.getElementById("clear-all"),
            watermarkSelect: document.getElementById("watermark-select"),
            processButton: document.getElementById("process-images"),
            progressBar: document.getElementById("progress-bar"),
            // Get the container and text elements for the progress UI
            progressContainer: document.getElementById("progress-container"),
            processingText: document.getElementById("processing-text"),
            fileInput: document.getElementById("file-input"),
            uploadLink: document.getElementById("upload-link"),
            imageCounter: document.getElementById("image-counter"),
            wmIconSelection: document.getElementById("wm-icon-selection")
        };

    // Initially hide the progress container
    elements.progressContainer.style.display = "none";

    // Load watermarks from JSON
    fetch('watermarks.json')
        .then(response => response.json())
        .then(data => {
            for (const [category, items] of Object.entries(data)) {
                const wrapper = document.createElement("div");
                wrapper.classList.add("wm-icon-category-wrapper");

                const categoryLabel = document.createElement("div");
                categoryLabel.classList.add("wm-icon-category");
                categoryLabel.textContent = category;
                wrapper.appendChild(categoryLabel);

                items.forEach(item => {
                    const span = document.createElement("span");
                    span.classList.add("wm-icon");
                    span.dataset.value = item.path;
                    span.innerHTML = `
            <img src="${item.icon}">
            <div class="wm-icon-name">${item.name}</div>
          `;
                    span.addEventListener("click", () => {
                        document.querySelectorAll(".wm-icon").forEach(e => e.classList.remove("selected"));
                        span.classList.add("selected");
                        elements.watermarkSelect.value = item.path;
                    });
                    wrapper.appendChild(span);
                });

                elements.wmIconSelection.appendChild(wrapper);
            }
        })
        .catch(console.error);

    const updateImageCounter = () => {
        elements.imageCounter.textContent = images.length ?
            `${images.length} image${images.length > 1 ? 's' : ''} selected` :
            "";
    };

    const handleFiles = files => {
        elements.processingText.style.display = "none"; // Hide "Fatto!" when new images are added
        elements.gallery.innerHTML = "";
        images.length = 0;
        elements.processButton.style.display = 'inline-block';
        elements.progressBar.value = 0;
        updateImageCounter();

    [...files].forEach(file => {
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = e => {
                    const imgElement = document.createElement("img");
                    imgElement.src = e.target.result;
                    imgElement.style.opacity = "0"; // Start fully transparent
                    imgElement.style.transition = "opacity 0.5s ease-in-out"; // Smooth transition
                    elements.gallery.appendChild(imgElement);

                    // Delay fade-in to ensure it happens after the image is added to the DOM
                    setTimeout(() => imgElement.style.opacity = "1", 10);

                    images.push({
                        name: file.name,
                        dataURL: e.target.result
                    });
                    updateImageCounter();
                };
                reader.readAsDataURL(file);
            }
        });
    };

    // Drag and drop event listeners
    elements.dropArea.addEventListener("dragover", e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy"; // set the drop effect to copy
        elements.dropArea.classList.add("drag-over");
    });

    elements.dropArea.addEventListener("dragleave", () => {
        elements.dropArea.classList.remove("drag-over");
    });

    elements.dropArea.addEventListener("drop", e => {
        e.preventDefault();
        elements.dropArea.classList.remove("drag-over");
        handleFiles(e.dataTransfer.files);
    });

    elements.uploadLink.addEventListener("click", () => elements.fileInput.click());

    elements.fileInput.addEventListener("change", e => handleFiles(e.target.files));

    elements.clearButton.addEventListener("click", () => {
        elements.gallery.innerHTML = "";
        images.length = 0;
        elements.progressBar.value = 0;
        elements.processingText.style.display = "none"; // Hide "Fatto!" when clearing all
        updateImageCounter();
    });

    elements.processButton.addEventListener("click", async () => {
        if (!images.length || !elements.watermarkSelect.value)
            return alert("Carica foto e seleziona un watermark");

        // Show the progress container when processing begins
        elements.progressContainer.style.display = "block";
        // Reset progress bar and display text
        elements.progressBar.value = 0;
        elements.progressBar.style.display = "block";
        elements.processingText.style.display = "block";
        elements.processingText.textContent = "In corso...";

        elements.processButton.disabled = true;
        const zip = new JSZip(),
            watermark = new Image();
        watermark.src = elements.watermarkSelect.value;
        await new Promise(resolve => watermark.onload = resolve);

        for (let i = 0; i < images.length; i++) {
            const img = new Image();
            img.src = images[i].dataURL;
            await new Promise(resolve => img.onload = resolve);

            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            // Position watermark at the bottom:
            ctx.drawImage(
                watermark,
                0,
                img.height - watermark.height * (img.width / watermark.width),
                img.width,
                watermark.height * (img.width / watermark.width)
            );

            zip.file(
                images[i].name.replace(/\.[^.]+$/, ".jpg"),
                canvas.toDataURL("image/jpeg", 0.9).split(",")[1], {
                    base64: true
                }
            );
            // Update progress bar value
            elements.progressBar.value = ((i + 1) / images.length) * 100;
        }

        const blob = await zip.generateAsync({
            type: "blob"
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "watermarked_images.zip";
        link.click();

        // Replace the progress bar with "Fatto!"
        elements.progressBar.style.display = "none";
        elements.processingText.textContent = "✅ Fatto!";

        elements.processButton.disabled = false;
    });
});
