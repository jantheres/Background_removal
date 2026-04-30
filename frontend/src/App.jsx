import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Download, Sun, Moon, RefreshCw, Loader2, Sparkles, X, CheckCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function App() {
  const [theme, setTheme] = useState('dark');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [results, setResults] = useState(null); // Array of results
  const [isLoading, setIsLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      previews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleDragOver = (e) => { e.preventDefault(); setIsDragActive(true); };
  const handleDragLeave = () => setIsDragActive(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files?.length > 0) handleFileSelection(Array.from(e.dataTransfer.files));
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) handleFileSelection(Array.from(e.target.files));
  };

  const handleFileSelection = (files) => {
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      alert('Please upload valid image files');
      return;
    }
    
    // Add to existing files
    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Generate previews
    const newPreviews = validFiles.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file)
    }));
    setPreviews(prev => [...prev, ...newPreviews]);
    setResults(null);
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    setPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[indexToRemove].url);
      newPreviews.splice(indexToRemove, 1);
      return newPreviews;
    });
  };

  const removeBackground = async () => {
    if (selectedFiles.length === 0) return;
    setIsLoading(true);
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('images', file); // Use 'images' for the batch endpoint
    });

    try {
      // Point to their new batch endpoint
      const response = await fetch(`${API_BASE_URL}/remove-bg-batch`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to process images');

      const data = await response.json();
      if (data.results) {
        setResults(data.results);
      } else {
        throw new Error("Invalid response format.");
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while processing the vehicles.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAll = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadImage = (base64Data, filename, label) => {
    const a = document.createElement('a');
    a.href = base64Data; // Already includes data prefix from python to_b64()
    a.download = `${filename.split('.')[0]}_${label.toLowerCase()}.png`;
    a.click();
  };

  return (
    <div className="app-wrapper">
      <div className="ambient-blob blob-1"></div>
      <div className="ambient-blob blob-2"></div>
      
      <div className="glass-container">
        <header className="app-header">
          <div className="brand">
            <Sparkles className="brand-icon" />
            <div>
              <h1>Auto Studio AI</h1>
              <p>Professional Batch Automotive Background Removal</p>
            </div>
          </div>
          <button onClick={toggleTheme} className="theme-btn" aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </header>

        <main className="app-main">
          {previews.length === 0 ? (
            <div 
              className={`upload-area ${isDragActive ? 'active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple hidden />
              <div className="upload-icon-wrapper">
                <Upload size={32} />
              </div>
              <h2>Upload Car Images</h2>
              <p>Drag and drop multiple images or click to browse</p>
              <span className="file-hint">Supports JPG, PNG</span>
            </div>
          ) : (
            <div className="workspace">
              {!results ? (
                <>
                  <div className="preview-section">
                    <div className="section-header" style={{marginBottom: '1rem'}}>
                      <h3>Selected Images ({previews.length})</h3>
                      <button className="add-more-btn" onClick={() => fileInputRef.current?.click()}>
                        + Add More
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple hidden />
                    </div>
                    
                    <div className="previews-grid">
                      {previews.map((preview, idx) => (
                        <div key={idx} className="preview-thumbnail">
                          <img src={preview.url} alt={preview.name} />
                          <button className="remove-file-btn" onClick={() => removeFile(idx)} aria-label="Remove">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="action-section">
                    <button className="primary-action-btn" onClick={removeBackground} disabled={isLoading || selectedFiles.length === 0}>
                      {isLoading ? (
                        <><Loader2 className="spin" size={20} /> Processing {selectedFiles.length} Vehicles...</>
                      ) : (
                        <><ImageIcon size={20} /> Extract All Vehicles</>
                      )}
                    </button>
                    <button className="text-btn" onClick={resetAll} disabled={isLoading}>Clear All</button>
                  </div>
                </>
              ) : (
                <div className="results-container">
                  <div className="success-banner">
                    <CheckCircle size={24} color="currentColor" />
                    <h3>Successfully Processed {results.length} Vehicles!</h3>
                  </div>

                  {results.map((res, idx) => (
                    <div key={idx} className="batch-result-group">
                      <h4 className="batch-filename">{res.filename}</h4>
                      <div className="results-grid">
                        {res.images.map((imgData, imgIdx) => (
                          <div key={imgIdx} className="result-card">
                            <div className="card-header">{imgData.label}</div>
                            <div className="checkerboard-bg">
                              <img src={imgData.data} alt={imgData.label} className="result-image" />
                            </div>
                            <button className="download-btn" onClick={() => downloadImage(imgData.data, res.filename, imgData.label)}>
                              <Download size={16} /> Download {imgData.label}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <div className="reset-section">
                    <button className="outline-btn" onClick={resetAll}>
                      <RefreshCw size={18} /> Start New Batch
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
