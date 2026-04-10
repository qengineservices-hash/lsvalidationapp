"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Pencil, Type, Save, X, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoAnnotationEditorProps {
  imageSrc: string;
  onSave: (annotatedDataUrl: string) => void;
  onClose: () => void;
}

type DrawMode = "draw" | "text";

export default function PhotoAnnotationEditor({
  imageSrc,
  onSave,
  onClose,
}: PhotoAnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<DrawMode>("draw");
  const [drawing, setDrawing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      setLoaded(true);
      // Save initial state for undo
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };

    img.onerror = () => {
      alert("Failed to load image for annotation.");
      onClose();
    };

    // Prevent body scrolling while editor is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [imageSrc, onClose]);

  // Get canvas coordinates from pointer event
  const getCoords = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // Save snapshot for undo
  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory((prev) => [
      ...prev.slice(-10), // Keep last 10 snapshots
      ctx.getImageData(0, 0, canvas.width, canvas.height),
    ]);
  }, []);

  // ---- DRAW MODE ----
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setDrawing(true);
    canvas.setPointerCapture(e.pointerId);

    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "red";
    ctx.lineWidth = 15;

    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return;
    setDrawing(false);
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
    saveSnapshot();
  };

  // ---- TEXT MODE ----
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "text") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const txt = prompt("Enter note:");
    if (!txt) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.fillStyle = "red";
    ctx.font = "68px Arial";
    ctx.fillText(txt, x, y);
    saveSnapshot();
  };

  // ---- UNDO ----
  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // Remove current state
      const prevState = newHistory[newHistory.length - 1];
      ctx.putImageData(prevState, 0, 0);
      setHistory(newHistory);
    }
  };

  // ---- SAVE ----
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-black/80 z-10">
        <button
          onClick={() => setMode("draw")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
            mode === "draw"
              ? "bg-red-500 text-white"
              : "bg-white/20 text-white hover:bg-white/30"
          )}
        >
          <Pencil className="w-4 h-4" />
          Draw
        </button>
        <button
          onClick={() => setMode("text")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
            mode === "text"
              ? "bg-red-500 text-white"
              : "bg-white/20 text-white hover:bg-white/30"
          )}
        >
          <Type className="w-4 h-4" />
          Text
        </button>
        <button
          onClick={handleUndo}
          disabled={history.length <= 1}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/20 text-white hover:bg-white/30 transition-all disabled:opacity-30"
        >
          <Undo2 className="w-4 h-4" />
          Undo
        </button>

        <div className="flex-1" />

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-green-500 text-white hover:bg-green-600 transition-all"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/20 text-white hover:bg-white/30 transition-all"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto flex items-start justify-center bg-black">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto"
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDrawing(false)}
          onClick={handleCanvasClick}
        />
      </div>

      {/* Mode indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 text-white text-xs font-bold uppercase tracking-widest">
        {mode === "draw" ? "✏️ Draw on photo" : "📝 Tap to add text"}
      </div>
    </div>
  );
}
