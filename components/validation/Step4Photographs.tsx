"use client";

import { useValidationStore } from "@/stores/useValidationStore";
import { 
  Camera, 
  Trash2, 
  ChevronLeft, 
  CheckCircle,
  Plus,
  Image as ImageIcon
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { useState } from "react";

export default function PhotographsStep() {
  const { formData, addPhoto, deletePhoto, setStep, reset } = useValidationStore();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Compress Image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      
      // 2. Convert to Base64 (for local preview + zustand storage)
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        addPhoto(roomId, {
          id: Date.now().toString(),
          url: base64data,
          category: "general"
        });
        setIsUploading(false);
      };
    } catch (error) {
      console.error("Compression error:", error);
      setIsUploading(false);
    }
  };

  const handleFinish = () => {
    alert("Validation Complete! In a real app, this would now sync to Supabase.");
    // In actual app: trigger sync worker
    // reset();
    // router.push("/dashboard");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-livspace-dark">Site Photographs</h2>
        <p className="text-livspace-gray-600">Capture and organize site photos for each room.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {formData.rooms.map((room) => (
          <div key={room.id} className="bg-white border border-livspace-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-livspace-gray-100 flex items-center justify-between bg-livspace-gray-50">
              <h3 className="font-bold text-livspace-blue">{room.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-livspace-gray-400 uppercase tracking-widest leading-none">
                  {room.photos.length} Photos
                </span>
                <label className="cursor-pointer p-2 bg-livspace-orange text-white rounded-lg hover:bg-livspace-orange-hover transition-colors">
                  <Camera className="w-4 h-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(room.id, e)}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3 min-h-[120px]">
              {room.photos.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center text-livspace-gray-300 py-6">
                  <ImageIcon className="w-8 h-8 opacity-20" />
                  <p className="text-xs font-medium">No photos yet</p>
                </div>
              ) : (
                room.photos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-video bg-livspace-gray-100 rounded-xl overflow-hidden border border-livspace-gray-200">
                    <img src={photo.url} className="w-full h-full object-cover" alt="Site" />
                    <button 
                      onClick={() => deletePhoto(room.id, photo.id)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 pt-6">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex-1 h-14 rounded-xl border border-livspace-gray-200 font-bold text-livspace-gray-600 flex items-center justify-center gap-2 hover:bg-livspace-gray-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleFinish}
          className="flex-[2] bg-livspace-success h-14 text-lg font-bold text-white rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-green-200 hover:bg-green-600 transition-all"
        >
          Finish & Submit
          <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
}
