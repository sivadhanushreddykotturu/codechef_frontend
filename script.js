document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const clearFileBtn = document.getElementById('clearFile');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');
    const statusMessage = document.getElementById('statusMessage');
    const backendUrl = "https://codechef-rating-backend.onrender.com";

    let currentFile = null;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('dragover');
    }

    function unhighlight() {
        dropArea.classList.remove('dragover');
    }

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            handleFiles(files[0]);
        }
    }

    // Handle selected files
    fileInput.addEventListener('change', function () {
        if (this.files.length) {
            handleFiles(this.files[0]);
        }
    });

    function handleFiles(file) {
        // Allow only Excel .xlsx files explicitly
        const validExtensions = ['.xlsx'];
        const fileExt = fileNameGetExtension(file.name).toLowerCase();

        let isValid = false;
        for (let ext of validExtensions) {
            if (fileExt === ext) {
                isValid = true;
                break;
            }
        }

        if (isValid) {
            currentFile = file;
            fileName.textContent = file.name;

            // Hide the entire drop area boundary when a file is selected
            dropArea.style.display = 'none';

            fileInfo.classList.remove('hidden');
            submitBtn.disabled = false;

            hideStatus();
        } else {
            showStatus('Error: Please upload a valid Excel file (.xlsx).', 'error');
            resetFile();
        }
    }

    function fileNameGetExtension(filename) {
        const parts = filename.split('.');
        return parts.length > 1 ? '.' + parts.pop() : '';
    }

    // Clear file selection
    clearFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetFile();
    });

    function resetFile() {
        currentFile = null;
        fileInput.value = '';

        dropArea.style.display = 'block';

        fileInfo.classList.add('hidden');
        submitBtn.disabled = true;
    }

    // Handle Form Submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentFile) {
            showStatus('Please select a file to process.', 'error');
            return;
        }

        setLoading(true);
        hideStatus();

        try {
            const formData = new FormData();
            formData.append('file', currentFile);

            const endpoint = `${backendUrl}/process-excel`;

            showStatus('Uploading file... The backend is processing data in batches (this may take a few minutes).', 'success');

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server responded with status ${response.status}`);
            }

            // Get the blob containing the Excel file
            const blob = await response.blob();

            // Create a download link and trigger it
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;

            // Read filename from Content-Disposition header if available
            const contentDisposition = response.headers.get('Content-Disposition');
            let downloadedFileName = 'students_with_contests.xlsx';
            if (contentDisposition && contentDisposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(contentDisposition);
                if (matches != null && matches[1]) {
                    downloadedFileName = matches[1].replace(/['"]/g, '');
                }
            }

            a.download = downloadedFileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();

            showStatus('Processing complete! The result file has been downloaded successfully.', 'success');

            // Allow them to click it again without having to re-upload.
            // "and while they get result they should able to click on get results button again"

        } catch (error) {
            console.error('Upload Error:', error);
            showStatus(`Error processing file: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            submitBtn.disabled = true;
            clearFileBtn.style.pointerEvents = 'none';
            dropArea.style.pointerEvents = 'none';
        } else {
            btnText.style.display = 'inline-block';
            btnLoader.style.display = 'none';
            submitBtn.disabled = !currentFile; // Enable if file is still present
            clearFileBtn.style.pointerEvents = 'auto';
            dropArea.style.pointerEvents = 'auto';
        }
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');
    }

    function hideStatus() {
        statusMessage.classList.add('hidden');
    }
});
