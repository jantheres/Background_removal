import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Download, 
  Sun, 
  Moon, 
  RefreshCw, 
  Loader2, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  FlipHorizontal,
  Trash2,
  Plus
} from 'lucide-react';

function App() {
  const [theme, setTheme] = useState('dark');
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

  const processImage = async (id) => {
    const imgIndex = images.findIndex(img => img.id === id);
    if (imgIndex === -1) return;

    const currentImg = images[imgIndex];
    setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'processing' } : img));

    const formData = new FormData();
    formData.append('image', currentImg.file);

    try {
      const response = await fetch('http://127.0.0.1:8000/remove-bg', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to process image');

      const data = await response.json();
      
      const newAssets = data.images.map(imgData => ({
        id: Math.random().toString(36).substr(2, 9),
        file: currentImg.file,
        preview: imgData.data,
        result: imgData.data,
        status: 'completed',
        label: imgData.label === 'Original' ? 'Right Side View' : 'Left Side View',
        originalResult: data.images[0].data,
        mirroredResult: data.images[1].data,
        isFlipped: imgData.label !== 'Original'
      }));

      setImages(prev => {
        const index = prev.findIndex(img => img.id === id);
        const newImages = [...prev];
        newImages.splice(index, 1, ...newAssets);
        return newImages;
      });

    } catch (error) {
      console.error(error);
      setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'error' } : img));
    }
  };

  const processAll = async () => {
    const pendingImages = images.filter(img => img.status === 'pending');
    if (pendingImages.length === 0) return;
    
    setIsLoading(true);

    if (pendingImages.length === 1) {
      await processImage(pendingImages[0].id);
      setIsLoading(false);
      return;
    }

    const pendingIds = pendingImages.map(img => img.id);
    setImages(prev => prev.map(img => 
      pendingIds.includes(img.id) ? { ...img, status: 'processing' } : img
    ));

    const formData = new FormData();
    pendingImages.forEach(img => {
      formData.append('images', img.file);
    });

    try {
      const response = await fetch('http://127.0.0.1:8000/remove-bg-batch', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Batch processing failed');

      const data = await response.json();
      
      setImages(prev => {
        let newImages = [...prev];
        
        data.results.forEach(result => {
          const index = newImages.findIndex(img => 
            img.status === 'processing' && img.file.name === result.filename
          );

          if (index !== -1) {
            const currentImg = newImages[index];
            const newAssets = result.images.map(imgData => ({
              id: Math.random().toString(36).substr(2, 9),
              file: currentImg.file,
              preview: imgData.data,
              result: imgData.data,
              status: 'completed',
              label: imgData.label === 'Original' ? 'Right Side View' : 'Left Side View',
              originalResult: result.images[0].data,
              mirroredResult: result.images[1].data,
              isFlipped: imgData.label !== 'Original'
            }));

            newImages.splice(index, 1, ...newAssets);
          }
        });

        return newImages.map(img => img.status === 'processing' ? { ...img, status: 'error' } : img);
      });

    } catch (error) {
      console.error(error);
      setImages(prev => prev.map(img => 
        pendingIds.includes(img.id) ? { ...img, status: 'error' } : img
      ));
    }
    
    setIsLoading(false);
  };

  const handleFileSelection = (newFiles) => {
    const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    const newImageObjects = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      result: null,
      status: 'pending',
      label: 'Pending'
    }));

    setImages(prev => [...prev, ...newImageObjects]);
  };

  const toggleFlip = (id) => {
    setImages(prev => prev.map(img => {
      if (img.id === id && img.status === 'completed') {
        const newIsFlipped = !img.isFlipped;
        return {
          ...img,
          isFlipped: newIsFlipped,
          result: newIsFlipped ? img.mirroredResult : img.originalResult,
          label: newIsFlipped ? 'Left Side View' : 'Right Side View'
        };
      }
      return img;
    }));
  };

  const downloadAllFiles = () => {
    images.forEach((img, index) => {
      if (img.result) {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = img.result;
          a.download = `${img.label.replace(/\s+/g, '_').toLowerCase()}_${img.file.name}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, index * 300);
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
    <div className="app-container">
      <nav className="glass-nav">
        <div className="nav-content">
          <div className="logo">
            <Sparkles className="spark-icon" />
            <span>AutoCatalog Pro</span>
          </div>
          <div className="nav-actions">
            <button onClick={toggleTheme} className="icon-btn theme-btn">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="content">
        <header className="hero">
          <h1 className="gradient-text">Automotive Asset Generator</h1>
          <p className="subtitle">High-fidelity background removal with automated face-to-face views.</p>
        </header>

        {images.length === 0 ? (
          <div 
            className={`drop-zone ${isDragActive ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              hidden
            />
            <div className="upload-circle">
              <Upload size={40} />
            </div>
            <h2>Import Vehicle Assets</h2>
            <p>Select multiple images to generate dual-view studio renders.</p>
            <div className="features">
              <span>✦ PNG Export</span>
              <span>✦ High Resolution</span>
              <span>✦ Batch Workflow</span>
            </div>
          </div>
        ) : (
          <div className="workspace">
            <div className="control-bar glass-panel">
              <div className="stats">
                <span className="count">{images.length}</span>
                <span className="label">Images Ready</span>
              </div>
              <div className="actions">
                <button className="btn-ghost" onClick={resetAll} disabled={isLoading}>
                  <Trash2 size={18} />
                  Reset
                </button>
                <button className="btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                  <Plus size={18} />
                  Add
                </button>
                {images.some(img => img.status === 'pending') ? (
                  <button className="btn-primary pulse" onClick={processAll} disabled={isLoading}>
                    {isLoading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                    Generate Renders
                  </button>
                ) : (
                  <button className="btn-primary" onClick={downloadAllFiles}>
                    <Download size={18} />
                    Download All Assets
                  </button>
                )}
              </div>
            </div>

            <div className="gallery">
              {images.map((img) => (
                <div key={img.id} className={`card ${img.status}`}>
                  <div className="card-image" style={{ background: img.status === 'completed' ? '#050505' : 'transparent' }}>
                    {img.status === 'completed' && (
                      <div className="badge-overlay">{img.label}</div>
                    )}
                    <img src={img.result || img.preview} alt="Vehicle" />
                    
                    {img.status === 'completed' && (
                      <div className="hover-actions">
                        <button className="mini-btn" onClick={() => toggleFlip(img.id)} title="Flip View">
                          <FlipHorizontal size={18} />
                        </button>
                        <a href={img.result} download={`${img.label.toLowerCase()}_${img.file.name}`} className="mini-btn">
                          <Download size={18} />
                        </a>
                      </div>
                    )}
                    
                    {img.status === 'processing' && (
                      <div className="loading-overlay">
                        <Loader2 className="spin" size={32} />
                        <span>Processing...</span>
                      </div>
                    )}
                  </div>

                  <div className="card-info">
                    <div className="filename" title={img.file.name}>{img.file.name}</div>
                    <button className="remove-btn" onClick={() => removeImage(img.id)}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg: #ffffff;
          --text: #0f172a;
          --text-muted: #64748b;
          --accent: #2563eb;
          --accent-gradient: linear-gradient(135deg, #3b82f6, #2dd4bf);
          --glass: rgba(255, 255, 255, 0.7);
          --glass-border: rgba(0, 0, 0, 0.08);
          --panel-bg: #f8fafc;
          --card-bg: #ffffff;
        }

        [data-theme='dark'] {
          --bg: #020617;
          --text: #f1f5f9;
          --text-muted: #94a3b8;
          --accent: #3b82f6;
          --accent-gradient: linear-gradient(135deg, #3b82f6, #2dd4bf);
          --glass: rgba(15, 23, 42, 0.85);
          --glass-border: rgba(255, 255, 255, 0.08);
          --panel-bg: #0f172a;
          --card-bg: #0f172a;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif; }

        body {
          background: var(--bg);
          color: var(--text);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 100vh;
        }

        .app-container { min-height: 100vh; display: flex; flex-direction: column; }

        .glass-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--glass);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--glass-border);
          padding: 1.25rem 2rem;
        }

        .nav-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 800;
          font-size: 1.5rem;
          letter-spacing: -0.02em;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 4rem 2rem;
          width: 100%;
          flex-grow: 1;
        }

        .hero { text-align: center; margin-bottom: 5rem; }

        .gradient-text {
          font-size: 4rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          color: var(--text);
          margin-bottom: 1.5rem;
        }

        .subtitle { font-size: 1.25rem; color: var(--text-muted); max-width: 600px; margin: 0 auto; }

        .drop-zone {
          border: 2px dashed var(--glass-border);
          background: var(--panel-bg);
          border-radius: 3rem;
          padding: 6rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .drop-zone:hover, .drop-zone.active {
          border-color: var(--accent);
          background: rgba(59, 130, 246, 0.03);
          transform: translateY(-4px);
        }

        .upload-circle {
          width: 96px;
          height: 96px;
          background: var(--accent-gradient);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 2.5rem;
          box-shadow: 0 20px 40px rgba(59, 130, 246, 0.2);
        }

        .features {
          display: flex;
          justify-content: center;
          gap: 3rem;
          margin-top: 4rem;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .control-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 2.5rem;
          border-radius: 1.5rem;
          margin-bottom: 3.5rem;
        }

        .glass-panel { background: var(--glass); backdrop-filter: blur(12px); border: 1px solid var(--glass-border); }

        .stats { display: flex; align-items: baseline; gap: 0.75rem; }
        .count { font-size: 2rem; font-weight: 900; color: var(--accent); }

        .actions { display: flex; gap: 1.25rem; }

        .btn-primary {
          background: var(--accent-gradient);
          color: white;
          border: none;
          padding: 0.875rem 2rem;
          border-radius: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);
          transition: all 0.3s;
        }

        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(59, 130, 246, 0.3); }

        .btn-ghost {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--glass-border);
          padding: 0.875rem 1.75rem;
          border-radius: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.2s;
        }

        .btn-ghost:hover { background: var(--glass-border); }

        .gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 3rem;
        }

        .card {
          background: var(--card-bg);
          border-radius: 2rem;
          overflow: hidden;
          border: 1px solid var(--glass-border);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card:hover { transform: translateY(-12px); box-shadow: 0 30px 60px rgba(0,0,0,0.3); }

        .card-image {
          position: relative;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
        }

        .badge-overlay {
          position: absolute;
          top: 1.5rem;
          left: 1.5rem;
          background: var(--accent);
          color: white;
          padding: 0.375rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          z-index: 2;
        }

        .hover-actions {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          transition: all 0.3s;
          backdrop-filter: blur(4px);
          z-index: 10;
        }

        .card:hover .hover-actions { opacity: 1; }

        .mini-btn {
          width: 52px;
          height: 52px;
          background: white;
          color: #0f172a;
          border: none;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mini-btn:hover { transform: scale(1.1) rotate(5deg); background: var(--accent); color: white; }

        .loading-overlay {
          position: absolute;
          inset: 0;
          background: var(--glass);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          z-index: 5;
        }

        .card-info {
          padding: 1.25rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.02);
          border-top: 1px solid var(--glass-border);
        }

        .filename { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); max-width: 75%; overflow: hidden; text-overflow: ellipsis; }

        .remove-btn { color: #f43f5e; background: none; border: none; cursor: pointer; opacity: 0.5; transition: opacity 0.2s; }
        .remove-btn:hover { opacity: 1; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }

        .spark-icon { width: 24px; height: 24px; color: #3b82f6; }
      `}} />
    </div>
  );
}

export default App;
