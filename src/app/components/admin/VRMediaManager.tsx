import { useState, useRef, useEffect } from 'react';
import { Upload, X, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { VRTour, VRScene } from '../../../services/vrTourService';

interface VRMediaManagerProps {
  tour: VRTour | null;
  onTourUpdate: (updatedTour: VRTour) => void;
  onEnterEditor: () => void;
}

const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET;

const ConfirmDialog = ({ open, onConfirm, onCancel, message }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-center gap-2 text-red-600 mb-3">
          <AlertTriangle size={20} />
          <h3 className="text-lg font-semibold">Confirm Delete</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default function VRMediaManager({ tour, onTourUpdate, onEnterEditor }: VRMediaManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [scenes, setScenes] = useState<VRScene[]>(tour?.scenes || []);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (tour) {
      setScenes(tour.scenes);
    }
  }, [tour]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!cloudName || !uploadPreset) {
      setError('Cloudinary environment variables are missing.');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    const newScenes: VRScene[] = [];
    let completed = 0;
    const total = files.length;

    const uploadSingle = async (file: File, index: number) => {
      let processedFile = file;
      if (file.size > 10 * 1024 * 1024) {
        try {
          processedFile = await imageCompression(file, {
            maxSizeMB: 10,
            maxWidthOrHeight: 4096,
            useWebWorker: true,
          });
        } catch {
          setError(`Compression failed for ${file.name}`);
          completed++;
          setUploadProgress(Math.round((completed / total) * 100));
          return;
        }
      }

      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'findnau/vr-building-tour');

      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (data.secure_url) {
              newScenes.push({
                id: Date.now().toString() + index,
                url: data.secure_url,
                label: file.name.replace(/\.[^/.]+$/, ''),
                description: '',
                hotspots: [],
              });
            } else {
              setError(`Failed for ${file.name}: ${data.error?.message || 'Unknown error'}`);
            }
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
        xhr.send(formData);
      }).finally(() => {
        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      });
    };

    const uploads = Array.from(files).map((file, i) => uploadSingle(file, i));
    await Promise.all(uploads);

    if (newScenes.length > 0) {
      const updatedScenes = [...scenes, ...newScenes];
      setScenes(updatedScenes);
      const updatedTour: VRTour = {
        ...tour,
        id: tour?.id || 'buildingTour',
        name: tour?.name || 'Building Tour',
        description: tour?.description || '',
        scenes: updatedScenes,
      };
      onTourUpdate(updatedTour);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRename = (id: string, newName: string) => {
    const updated = scenes.map((s) => (s.id === id ? { ...s, label: newName } : s));
    setScenes(updated);
    onTourUpdate({ ...tour!, id: tour?.id || 'buildingTour', scenes: updated });
  };

  const confirmDeleteScene = () => {
    if (!deleteConfirm) return;
    const updated = scenes.filter((s) => s.id !== deleteConfirm);
    setScenes(updated);
    onTourUpdate({ ...tour!, id: tour?.id || 'buildingTour', scenes: updated });
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-1">📸 Virtual Tour Media Manager</h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload your 360° panoramic images (JPG, PNG – up to 50MB, auto‑compressed)
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Drag & drop images here</p>
          <p className="text-xs text-gray-400 mt-1">or click to browse</p>
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        {uploading && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Uploaded Images ({scenes.length})
        </h4>
        {scenes.length === 0 ? (
          <p className="text-xs text-gray-400">No images yet. Upload some above.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {scenes.map((scene, idx) => (
              <div key={scene.id} className="group relative bg-gray-50 rounded-lg border border-gray-200 p-2">
                <img
                  src={scene.url}
                  alt={scene.label}
                  className="w-full h-24 object-cover rounded-md mb-1"
                />
                <input
                  value={scene.label}
                  onChange={(e) => handleRename(scene.id, e.target.value)}
                  className="w-full text-center text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-orange-400 focus:outline-none px-1"
                  placeholder="Enter name"
                />
                <button
                  onClick={() => setDeleteConfirm(scene.id)}
                  className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete scene"
                >
                  <X size={10} />
                </button>
                <div className="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-br">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button onClick={() => window.history.back()} className="text-sm text-gray-500 hover:text-gray-800">
          {/* back button intentionally left blank */}
        </button>
        <button
          onClick={onEnterEditor}
          disabled={scenes.length === 0}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Go to Editor <ArrowRight size={16} />
        </button>
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onConfirm={confirmDeleteScene}
        onCancel={() => setDeleteConfirm(null)}
        message="Delete this scene? It will also remove all associated hotspots."
      />
    </div>
  );
}