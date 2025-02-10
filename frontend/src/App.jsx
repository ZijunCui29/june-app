import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [dicomData, setDicomData] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [isError, setIsError] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [dicomFiles, setDicomFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);

  // Fetch previously uploaded files
  useEffect(() => {
    fetchDicomFiles();
  }, []);

  const fetchDicomFiles = async () => {
    try {
      const response = await fetch("http://localhost:5000/files");
      if (!response.ok) throw new Error("Failed to fetch DICOM files");

      const data = await response.json();
      setDicomFiles(data);
    } catch (error) {
      console.error("Error fetching DICOM files:", error);
    }
  };

  // Handle file drop
  const handleDrop = async (event) => {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files[0];
    if (!file) {
      setMessage("No file selected");
      setIsError(true);
      return;
    }

    await uploadFile(file);
  };

  // Upload file & receive data from the server
  const uploadFile = async (file) => {
    setIsError(false);
    setMessage("Uploading file...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Error uploading file");

      const data = await response.json();
      setMessage(data.message);
      setDicomData(data.metadata);
      setImageSrc(data.imageSrc);
      setFileUrl(data.fileUrl);

      // Refresh file list
      fetchDicomFiles();
    } catch (error) {
      setMessage("Error: " + error.message);
      setIsError(true);
    }
  };

  // Handle selection of previously uploaded file
  const handleFileSelection = (file) => {
    setMessage("");
    setDicomData(file.metadata);
    setImageSrc(file.imageSrc);
    setFileUrl(file.fileUrl);
    setShowImage(false);
    setSelectedFileId(file.id);
  };

  return (
    <div className="container">
      <div className="leftColumn">
        <h2 className="header">File Uploader</h2>

        <div
          className={dragging ? "dropZoneActive" : "dropZone"}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <p>Drag & Drop DICOM File Here</p>
        </div>

        {message && (
          <p className={`message ${isError ? "error" : "success"}`}>
            {message}
          </p>
        )}

        <div className="fileList">
          <h3>Uploaded Files</h3>
          <ul>
            {dicomFiles.map((file) => (
              <li
                key={file.id}
                onClick={() => handleFileSelection(file)}
                className={selectedFileId === file.id ? "selected" : ""}
              >
                {file.filename}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rightColumn">
        <h2>Patient Data</h2>
        {!isError && dicomData && (
          <div className="card">
            <table className="table">
              <tbody>
                <tr>
                  <td className="tableCell">
                    <strong>Patient Name</strong>
                  </td>
                  <td className="tableCell">{dicomData["Patient's Name"]}</td>
                </tr>
                <tr>
                  <td className="tableCell">
                    <strong>Patient Birthdate</strong>
                  </td>
                  <td className="tableCell">
                    {dicomData["Patient's Birth Date"] || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td className="tableCell">
                    <strong>Series Description</strong>
                  </td>
                  <td className="tableCell">
                    {dicomData["Series Description"] || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td className="tableCell">
                    <strong>Actions</strong>
                  </td>
                  <td className="tableCell">
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        download={fileUrl.split("/").pop()}
                        className="button"
                      >
                        Download
                      </a>
                    )}
                    {imageSrc && (
                      <button
                        onClick={() => setShowImage(!showImage)}
                        className="button"
                      >
                        {showImage ? "Hide Image" : "View Image"}
                      </button>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {!isError && showImage && imageSrc && (
          <div className="card">
            <h2>DICOM Image Preview</h2>
            <div className="zoom-controls">
              <label htmlFor="zoomSlider">Zoom: </label>
              <input
                id="zoomSlider"
                type="range"
                min="50"
                max="100"
                value={zoom}
                onChange={(e) => setZoom(e.target.value)}
              />
              <span>{zoom}%</span>
            </div>
            <img
              src={`data:image/png;base64,${imageSrc}`}
              alt="DICOM Preview"
              className="image"
              style={{
                transform: `scale(${zoom / 100})`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
