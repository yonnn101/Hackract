import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SignaturePad({ onSignatureChange, onClear, initialSignature }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set proper resolution for retina displays
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Only resize if width is 0 to prevent clearing on re-renders
    if (canvas.width === 0 || canvas.width === 300) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#00c477'; // Neon green
        ctx.lineWidth = 3;

        // Save initial blank state
        const blankData = canvas.toDataURL('image/png');
        setHistory([blankData]);
        setHistoryIndex(0);
    }

    if (initialSignature && !initialized && canvas.width !== 0 && canvas.width !== 300) {
      const img = new Image();
      img.src = initialSignature;
      img.onload = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);
        const newData = canvas.toDataURL('image/png');
        setHistory(prev => [...prev, newData]);
        setHistoryIndex(1);
        setHasSignature(true);
      };
      setInitialized(true);
    }
  }, [initialSignature, initialized]);

  const saveState = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    onSignatureChange(dataUrl);
  };

  const restoreState = (index) => {
    const dataUrl = history[index];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      // reset transform before clear and draw
      ctx.setTransform(1, 0, 0, 1, 0, 0); 
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // restore scale
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);
    };
    
    const isBlank = index === 0;
    setHasSignature(!isBlank);
    onSignatureChange(isBlank ? null : dataUrl);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreState(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreState(newIndex);
    }
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    
    setHasSignature(false);
    onSignatureChange(null);
    if (onClear) onClear();

    // Reset history
    const blankData = canvas.toDataURL('image/png');
    setHistory([blankData]);
    setHistoryIndex(0);
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Tools overlay */}
      <div className="absolute top-2 right-2 flex gap-2 z-20">
        <button 
          onClick={undo}
          disabled={historyIndex <= 0}
          className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors backdrop-blur-md"
          title="Undo"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
        </button>
        <button 
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors backdrop-blur-md"
          title="Redo"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
        </button>
      </div>

      <div className="flex-1 relative">
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[#00c477]/30 font-serif italic text-3xl">Sign here</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair rounded-t-xl"
          style={{ touchAction: 'none' }}
        />
      </div>
      
      <div className="h-10 border-t border-[#00c477]/10 flex items-center justify-between px-4 bg-white/[0.02] rounded-b-xl z-10">
        <button 
          onClick={clearCanvas}
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-500 hover:text-red-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          CLEAR
        </button>
        <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">
          {hasSignature ? 'Digital Signature Active' : 'Awaiting Signature'}
        </span>
      </div>
    </div>
  );
}
