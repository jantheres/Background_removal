import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Download, Sun, Moon, RefreshCw, Loader2 } from 'lucide-react';

function App() {
  const [theme, setTheme] = useState('light');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResultUrl(null); // Reset result when new image is uploaded
  };

  const removeBackground = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/remove-bg', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const blob = await response.blob();
      setResultUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error(error);
      alert('An error occurred while processing the image.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAll = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="app-container">
      <div className="glass-card">
        <div className="header">
          <div className="title-group">
            <h1>Magic Eraser</h1>
            <p>AI Background Removal instantly.</p>
          </div>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </button>
        </div>

        {!previewUrl ? (
          <div 
            className={`upload-zone ${isDragActive ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="file-input" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
            />
            <Upload className="upload-icon" />
            <h3>Drag & Drop your image here</h3>
            <p style={{ color: 'var(--text-muted)' }}>or click to browse from your computer</p>
          </div>
        ) : (
          <div className="preview-container">
            <div className="image-comparison">
              <div className="image-box">
                <span>Original</span>
                <img src={previewUrl} alt="Original" />
              </div>

              {resultUrl && (
                <div className="image-box">
                  <span>Result</span>
                  <img src={resultUrl} alt="Result without background" />
                </div>
              )}
            </div>

            {!resultUrl ? (
              <button 
                className="btn-primary" 
                onClick={removeBackground} 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="loader" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ImageIcon />
                    Remove Background
                  </>
                )}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <button className="btn-secondary" onClick={resetAll}>
                  <RefreshCw size={18} style={{ marginRight: '8px' }}/>
                  Start Over
                </button>
                <a 
                  href={resultUrl} 
                  download="transparent_result.png" 
                  style={{ textDecoration: 'none', flex: 1 }}
                >
                  <button className="btn-primary">
                    <Download size={18} />
                    Download PNG
                  </button>
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
