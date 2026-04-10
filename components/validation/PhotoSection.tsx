"use client";

import { useState } from "react";
import {
  useValidationStore,
  PHOTO_SURFACES,
} from "@/stores/useValidationStore";
import { Camera, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import PhotoAnnotationEditor from "@/components/ui/PhotoAnnotationEditor";

interface PhotoSectionProps {
  room: string;
}

// Editor state: what's currently being annotated
interface EditorState {
  imageSrc: string;
  surface: string;
  photoId: string | null; // null = new photo (not yet saved), string = editing existing
}

export default function PhotoSection({ room }: PhotoSectionProps) {
  const { formData, addPhoto, deletePhoto, updatePhoto } = useValidationStore();
  const [uploading, setUploading] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const roomData = formData.rooms[room];
  if (!roomData) return null;

  // ---- Capture & Compress → Open Editor ----
  const handleCapture = async (
    surface: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const options = {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      const compressed = await imageCompression(file, options);

      const reader = new FileReader();
      reader.readAsDataURL(compressed);
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Open annotation editor BEFORE saving (matching HTML PoC behavior)
        setEditor({ imageSrc: dataUrl, surface, photoId: null });
        setUploading(false);
      };
    } catch (err) {
      console.error("Compression error:", err);
      setUploading(false);
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  // ---- Click existing photo → Open Editor for re-annotation ----
  const handlePhotoClick = (surface: string, photoId: string, dataUrl: string) => {
    setEditor({ imageSrc: dataUrl, surface, photoId });
  };

  // ---- Save from Editor ----
  const handleEditorSave = (annotatedDataUrl: string) => {
    if (!editor) return;

    if (editor.photoId) {
      // Update existing photo with annotation
      updatePhoto(room, editor.surface, editor.photoId, annotatedDataUrl);
    } else {
      // Save new annotated photo
      addPhoto(room, editor.surface, {
        id: "img_" + Date.now(),
        dataUrl: annotatedDataUrl,
      });
    }

    setEditor(null);
  };

  const handleEditorClose = () => {
    // If it was a new photo, closing without saving discards it
    setEditor(null);
  };

  const totalPhotos = PHOTO_SURFACES.reduce(
    (sum, s) => sum + (roomData.photos[s]?.length || 0),
    0
  );

  return (
    <>
      {/* Annotation Editor Overlay */}
      {editor && (
        <PhotoAnnotationEditor
          imageSrc={editor.imageSrc}
          onSave={handleEditorSave}
          onClose={handleEditorClose}
        />
      )}

      <div className="space-y-4">
        <span className="text-xs text-livspace-gray-400 font-medium">
          {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""} captured
        </span>

        {PHOTO_SURFACES.map((surface) => {
          const photos = roomData.photos[surface] || [];

          return (
            <div key={surface} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-livspace-gray-600 uppercase tracking-wider">
                  {surface}
                </h4>
                <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-livspace-orange text-white hover:bg-livspace-orange-hover transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  Add Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleCapture(surface, e)}
                    disabled={uploading}
                  />
                </label>
              </div>

              {photos.length === 0 ? (
                <div className="flex items-center justify-center h-16 border-2 border-dashed border-livspace-gray-200 rounded-xl">
                  <span className="text-[10px] text-livspace-gray-300 font-medium">
                    No photos
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group w-20 h-20 rounded-xl overflow-hidden border border-livspace-gray-200 cursor-pointer"
                    >
                      {/* Click to open annotation editor */}
                      <img
                        src={photo.dataUrl}
                        className="w-full h-full object-cover"
                        alt={`${surface} photo`}
                        onClick={() =>
                          handlePhotoClick(surface, photo.id, photo.dataUrl)
                        }
                      />
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this photo?")) {
                            deletePhoto(room, surface, photo.id);
                          }
                        }}
                        className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
