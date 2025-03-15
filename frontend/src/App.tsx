import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import "./App.css";
import logoImage from "./assets/img/img-converter-logo.png";

function App() {
  const [file, setFile] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [downloadLinks, setDownloadLinks] = useState<
    Array<{ name: string; path: string }>
  >([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [converting, setConverting] = useState(false);
  const [targetFormat, setTargetFormat] = useState("jpeg");

  useEffect(() => {
    setDownloadLinks([]);
    setProgress(null);
    setShowProgress(false);
  }, [file]);

  // Hantera filer via drag & drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      if (acceptedFiles.length > 10) {
        setMessage("Max 10 filer åt gången");
        // Only take the first 10 files
        setFile(acceptedFiles.slice(0, 10));
      } else {
        setFile(acceptedFiles);
        setMessage("");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    // maxFiles: 1,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      if (files.length > 10) {
        setMessage("Max 10 filer åt gången");
        // Only take the first 10 files
        setFile(files.slice(0, 10));
      } else {
        setFile(files);
        setMessage("");
      }
    }
  };

  const handleFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetFormat(event.target.value);
  };

  const handleUpload = async () => {
    if (!file.length) {
      setMessage("Välj minst en fil först.");
      return;
    }

    setUploading(true);
    setConverting(false);
    setShowProgress(true);
    setMessage("");
    setDownloadLinks([]);
    setProgress(0);

    const formData = new FormData();
    file.forEach((file) => {
      formData.append("imageFiles", file);
    });

    // Add the target format to the form data
    formData.append("format", targetFormat);

    // Skapa en XMLHttpRequest för att övervaka uppladdningen
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        // Upload is complete, now conversion starts
        setUploading(false); // Set uploading to false to show "Konvertering" text
        setConverting(true);
        setProgress(0); // Reset progress for conversion phase

        const data = JSON.parse(xhr.responseText);
        setMessage(`Uppladdning lyckades: ${data.message}`);

        // Only set download link if it's available immediately
        // Otherwise, it will likely be set by the WebSocket updates
        if (data.results && data.results.length) {
          const links = data.results.map((result: any) => ({
            name: result.originalName,
            path: result.path,
          }));
          setDownloadLinks(links);
          setConverting(false);
        }
      } else {
        setMessage(`Fel vid uppladdning: ${xhr.statusText}`);
        setUploading(false);
        setConverting(false);
      }
    };

    xhr.onerror = () => {
      setMessage("Ett fel inträffade vid uppladdning.");
      setUploading(false);
      setConverting(false);
    };

    xhr.open("POST", "/api/upload/image", true);
    xhr.send(formData);
  };

  // Function to find download link for a specific file
  const getDownloadLink = (filename: string) => {
    return downloadLinks.find((link) => link.name === filename);
  };

  return (
    <div className="app">
      <div className={`logo ${converting ? "animating" : ""}`}>
        <img className="logo-img" src={logoImage} alt="Image converter logo" />
      </div>
      <div className="container-extra-border">
        <div className="container">
          <h2>Image Converter</h2>

          {/* Format selection */}
          <div className="format-selector">
            <label htmlFor="format-select">Konvertera till:</label>
            <select
              id="format-select"
              value={targetFormat}
              onChange={handleFormatChange}
              disabled={uploading || converting}
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="avif">AVIF</option>
              <option value="tiff">TIFF</option>
            </select>
          </div>

          {/* Drag & Drop Area */}
          <div {...getRootProps()} className="dropzone">
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Släpp filerna här...</p>
            ) : (
              <p>
                Dra & släpp flera filer här, eller klicka för att välja filer
              </p>
            )}
          </div>
          {/* Alternativ: Välj fil via knapp */}
          <input
            type="file"
            accept="image/jpeg, image/png, image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }} // Döljer den ursprungliga filväljaren
            id="file-upload"
            multiple // Tillåt flera filer
          />

          <label htmlFor="file-upload" className="custom-file-upload">
            {file.length > 0
              ? `${file.length} filer valda ${
                  file.length === 10 ? "(max antal)" : ""
                }`
              : "Välj filer (max 10)"}
          </label>

          {/* Visa lista på valda filer om det finns några */}
          {file.length > 0 && (
            <div className="file-list">
              <p>Valda filer:</p>
              <ul>
                {file.map((file, index) => {
                  const downloadLink = getDownloadLink(file.name);
                  return (
                    <li key={index} className="file-item">
                      <span className="file-name">{file.name}</span>
                      {downloadLink && (
                        <a
                          href={downloadLink.path}
                          download
                          className="download-button-inline"
                        >
                          ⬇ Hämta
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {downloadLinks.length === 0 && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file.length || uploading || converting}
            >
              {uploading
                ? "Laddar upp..."
                : converting
                ? "Konverterar..."
                : "Ladda upp"}
            </button>
          )}

          {/* Progress container med animation */}
          <div className={`progress-container ${showProgress ? "show" : ""}`}>
            <div
              className="progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
            <div className="progress-text">
              {progress !== null && (
                <p>
                  {uploading
                    ? "Uppladdning"
                    : converting
                    ? "Konvertering"
                    : "Klar"}
                  : {downloadLinks.length > 0 ? "100" : progress.toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          <div className="progress-message">{message && <p>{message}</p>}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
