import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Download, Sun, Moon, RefreshCw, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';

function App() {
  const [theme, setTheme] = useState('light');
  const [images, setImages] = useState([]);
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
    if (e.dataTransfer.files) {
      handleFileSelection(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      handleFileSelection(Array.from(e.target.files));
    }
  };

  const handleFileSelection = (newFiles) => {
    const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length < newFiles.length) {
      alert('Some files were skipped because they are not images.');
    }

    const newImageObjects = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      result: null,
      status: 'pending' // pending, processing, completed, error
    }));

    setImages(prev => [...prev, ...newImageObjects]);
  };

  const removeBackgroundSingle = async (id) => {
    const imgIndex = images.findIndex(img => img.id === id);
    if (imgIndex === -1) return;

    setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'processing' } : img));

    const formData = new FormData();
    formData.append('image', images[imgIndex].file);

    try {
      const response = await fetch('http://127.0.0.1:8000/remove-bg', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to process image');

      const blob = await response.blob();
      const resultUrl = URL.createObjectURL(blob);

      setImages(prev => prev.map(img => img.id === id ? { 
        ...img, 
        result: resultUrl, 
        status: 'completed' 
      } : img));
    } catch (error) {
      console.error(error);
      setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'error' } : img));
    }
  };

  const processAll = async () => {
    setIsLoading(true);
    for (const img of images) {
      if (img.status !== 'completed') {
        await removeBackgroundSingle(img.id);
      }
    }
    setIsLoading(false);
  };

  const downloadAllFiles = () => {
    images.forEach((img, index) => {
      if (img.result) {
        // Delay each download slightly to prevent browser blocking
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = img.result;
          a.download = `no_bg_${img.file.name}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, index * 200);
      }
    });
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const resetAll = () => {
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="app-container" style={{ maxWidth: images.length > 0 ? '1000px' : '800px' }}>
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

        {images.length === 0 ? (
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
              multiple
            />
            <Upload className="upload-icon" />
            <h3>Drag & Drop images here</h3>
            <p style={{ color: 'var(--text-muted)' }}>or click to browse multiple files</p>
          </div>
        ) : (
          <div className="preview-container">
            <div className="gallery-grid">
              {images.map((img) => (
                <div key={img.id} className="gallery-item">
                  <button className="remove-img-btn" onClick={() => removeImage(img.id)} style={{
                    position: 'absolute', top: '-10px', right: '-10px', background: '#ff4d4d', color: 'white',
                    border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                  }}>
                    <X size={14} />
                  </button>
                  
                  <img src={img.result || img.preview} alt="Preview" />
                  
                  <div className={`status-badge status-${img.status}`}>
                    {img.status === 'processing' && <Loader2 size={12} className="loader" />}
                    {img.status === 'completed' && <CheckCircle size={12} />}
                    {img.status === 'error' && <AlertCircle size={12} />}
                    <span style={{ marginLeft: '4px' }}>{img.status}</span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {img.file.name}
                  </div>

                  {img.status === 'completed' && (
                    <a href={img.result} download={`no_bg_${img.file.name}`} className="btn-secondary" style={{ padding: '0.4rem', fontSize: '0.8rem', textAlign: 'center', textDecoration: 'none' }}>
                      Download PNG
                    </a>
                  )}
                </div>
              ))}
              
              <div 
                className="gallery-item add-more" 
                onClick={() => fileInputRef.current?.click()}
                style={{ borderStyle: 'dashed', cursor: 'pointer', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}
              >
                <input 
                  type="file" 
                  className="file-input" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                />
                <Upload size={32} color="var(--accent)" />
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Add More</span>
              </div>
            </div>

            <div className="batch-actions">
              <button className="btn-secondary" onClick={resetAll} disabled={isLoading}>
                <RefreshCw size={18} style={{ marginRight: '8px' }}/>
                Clear All
              </button>
              
              {images.some(img => img.status !== 'completed') ? (
                <button className="btn-primary" onClick={processAll} disabled={isLoading}>
                  {isLoading ? <Loader2 className="loader" /> : <ImageIcon size={18} />}
                  Process All
                </button>
              ) : (
                <button className="btn-primary" onClick={downloadAllFiles} disabled={isLoading}>
                  <Download size={18} />
                  Download All
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
