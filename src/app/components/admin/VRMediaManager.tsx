import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { VRTour, VRScene } from '../../../services/vrTourService';
import { useMapSettingsRealtime, MapFloor } from '../../../services/mapService';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface VRMediaManagerProps {
  tour: VRTour | null;
  onTourUpdate: (updatedTour: VRTour) => void;
  onEnterEditor: () => void;
}

const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET;

interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  url?: string;
  error?: string;
  sceneId?: string;
}

export default function VRMediaManager({ tour, onTourUpdate, onEnterEditor }: VRMediaManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [scenes, setScenes] = useState<VRScene[]>(tour?.scenes || []);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmSingle, setDeleteConfirmSingle] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [labelEdits, setLabelEdits] = useState<Record<string, string>>({});

  // Floors for assignment
  const [floors, setFloors] = useState<MapFloor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');

  const scenesRef = useRef<VRScene[]>(tour?.scenes || []);
  const tourRef = useRef<VRTour | null>(tour);

  useEffect(() => {
    const unsub = useMapSettingsRealtime((settings) => {
      if (settings.floors?.length) {
        setFloors(settings.floors);
        if (!selectedFloorId) {
          setSelectedFloorId(settings.floors[0].id);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (tour) {
      setScenes(tour.scenes);
      scenesRef.current = tour.scenes;
      tourRef.current = tour;
    }
  }, [tour]);

  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);

  useEffect(() => {
    const initialEdits: Record<string, string> = {};
    scenes.forEach((s) => {
      initialEdits[s.id] = s.label;
    });
    setLabelEdits(initialEdits);
    setSelectedIds([]);
  }, [scenes]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!cloudName || !uploadPreset) {
      setError('Cloudinary environment variables are missing.');
      return;
    }

    setUploading(true);
    setError('');

    const tasks: UploadTask[] = Array.from(files).map((file) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      file,
      progress: 0,
      status: 'pending',
    }));
    setUploadTasks((prev) => [...prev, ...tasks]);

    const uploadSingle = async (task: UploadTask) => {
      try {
        setUploadTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'uploading' } : t))
        );

        let processedFile = task.file;
        if (task.file.size > 10 * 1024 * 1024) {
          try {
            processedFile = await imageCompression(task.file, {
              maxSizeMB: 10,
              maxWidthOrHeight: 4096,
              useWebWorker: true,
            });
          } catch (err) {
            throw new Error(`Compression failed: ${task.file.name}`);
          }
        }

        const formData = new FormData();
        formData.append('file', processedFile);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'findnau/vr-building-tour');

        const xhr = new XMLHttpRequest();
        const uploadPromise = new Promise<{ secure_url: string }>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setUploadTasks((prev) =>
                prev.map((t) => (t.id === task.id ? { ...t, progress } : t))
              );
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              const data = JSON.parse(xhr.responseText);
              if (data.secure_url) {
                resolve(data);
              } else {
                reject(new Error(data.error?.message || 'Unknown error'));
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });
          xhr.addEventListener('error', () => reject(new Error('Network error')));
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
          xhr.send(formData);
        });

        const result = await uploadPromise;

        const newScene: VRScene = {
          id: Date.now().toString() + task.id,
          url: result.secure_url,
          label: task.file.name.replace(/\.[^/.]+$/, ''),
          description: '',
          floorId: selectedFloorId,
          hotspots: [],
          officePaths: {}, // <-- Initialize empty
        };

        const updatedScenes = [...scenesRef.current, newScene];
        scenesRef.current = updatedScenes;
        setScenes(updatedScenes);

        const updatedTour: VRTour = {
          ...(tourRef.current || {
            id: 'buildingTour',
            name: 'Building Tour',
            description: 'Virtual tour of the building',
            scenes: [],
          }),
          id: tourRef.current?.id || 'buildingTour',
          name: tourRef.current?.name || 'Building Tour',
          description: tourRef.current?.description || '',
          scenes: updatedScenes,
        };
        tourRef.current = updatedTour;
        onTourUpdate(updatedTour);

        setUploadTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: 'done', url: result.secure_url, sceneId: newScene.id, progress: 100 }
              : t
          )
        );
      } catch (err: any) {
        setUploadTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: 'error', error: err.message || 'Upload failed' }
              : t
          )
        );
      }
    };

    const concurrency = 3;
    for (let i = 0; i < tasks.length; i += concurrency) {
      await Promise.all(tasks.slice(i, i + concurrency).map((task) => uploadSingle(task)));
    }

    const hasErrors = uploadTasks.some((t) => t.status === 'error');
    if (hasErrors) {
      setError('Some images failed to upload. Check the list below for details.');
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRenameCommit = (sceneId: string) => {
    const newLabel = labelEdits[sceneId]?.trim();
    if (!newLabel) return;
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene && scene.label !== newLabel) {
      const updated = scenes.map((s) => (s.id === sceneId ? { ...s, label: newLabel } : s));
      setScenes(updated);
      scenesRef.current = updated;
      onTourUpdate({
        ...(tourRef.current || { id: 'buildingTour', name: 'Building Tour', description: '', scenes: [] }),
        id: tourRef.current?.id || 'buildingTour',
        scenes: updated,
      });
    }
  };

  const handleDeleteSingle = (sceneId: string) => {
    setDeleteConfirmSingle(sceneId);
  };

  const confirmDeleteSingle = () => {
    if (!deleteConfirmSingle) return;
    const updated = scenes.filter((s) => s.id !== deleteConfirmSingle);
    setScenes(updated);
    scenesRef.current = updated;
    onTourUpdate({
      ...(tourRef.current || { id: 'buildingTour', name: 'Building Tour', description: '', scenes: [] }),
      id: tourRef.current?.id || 'buildingTour',
      scenes: updated,
    });
    setDeleteConfirmSingle(null);
  };

  const toggleSelection = (sceneId: string) => {
    setSelectedIds((prev) =>
      prev.includes(sceneId) ? prev.filter((id) => id !== sceneId) : [...prev, sceneId]
    );
  };

  const confirmDeleteMultiple = () => {
    const updated = scenes.filter((s) => !selectedIds.includes(s.id));
    setScenes(updated);
    scenesRef.current = updated;
    onTourUpdate({
      ...(tourRef.current || { id: 'buildingTour', name: 'Building Tour', description: '', scenes: [] }),
      id: tourRef.current?.id || 'buildingTour',
      scenes: updated,
    });
    setSelectedIds([]);
    setDeleteConfirmOpen(false);
  };

  const isSelected = (sceneId: string) => selectedIds.includes(sceneId);

  const clearCompletedTasks = () => {
    setUploadTasks((prev) => prev.filter((t) => t.status !== 'done'));
  };

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-1">📸 Virtual Tour Media Manager</h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload your 360° panoramic images (JPG, PNG – up to 50MB, auto‑compressed).
          <br />
          <span className="text-xs text-green-600">✓ Images are auto‑saved as soon as each upload finishes.</span>
        </p>

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
            Assign Floor for New Scenes
          </label>
          <select
            value={selectedFloorId}
            onChange={(e) => setSelectedFloorId(e.target.value)}
            className="w-full md:w-64 border rounded-lg px-3 py-2 text-sm bg-white"
            disabled={floors.length === 0}
          >
            {floors.length === 0 ? (
              <option value="">Loading floors...</option>
            ) : (
              floors.map((floor) => (
                <option key={floor.id} value={floor.id}>
                  {floor.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
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

        {uploadTasks.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Upload Progress</span>
              <button
                onClick={clearCompletedTasks}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear completed
              </button>
            </div>
            {uploadTasks.map((task) => (
              <div key={task.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{task.file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{task.progress}%</span>
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    {task.status === 'pending' && <span className="text-xs text-gray-400">Queued</span>}
                    {task.status === 'uploading' && <Loader2 size={14} className="animate-spin text-orange-500" />}
                    {task.status === 'done' && <CheckCircle size={14} className="text-green-500" />}
                    {task.status === 'error' && <X size={14} className="text-red-500" />}
                  </div>
                </div>
                {task.status === 'error' && task.error && (
                  <p className="text-[10px] text-red-500 mt-1">{task.error}</p>
                )}
                {task.status === 'done' && task.sceneId && (
                  <p className="text-[10px] text-green-600 mt-1">✓ Saved to tour</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gallery / Scene list */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">
            Uploaded Images ({scenes.length})
          </h4>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-600 transition-colors flex items-center gap-1"
            >
              <X size={14} /> Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
        {scenes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No images yet. Upload some above.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {scenes.map((scene, idx) => (
              <div
                key={scene.id}
                className={`group relative bg-gray-50 rounded-lg border-2 p-2 transition-all ${
                  isSelected(scene.id) ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                }`}
              >
                <label className="absolute top-2 left-2 z-10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected(scene.id)}
                    onChange={() => toggleSelection(scene.id)}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                </label>

                <img
                  src={scene.url}
                  alt={scene.label}
                  className="w-full h-24 object-cover rounded-md mb-1"
                />

                <input
                  value={labelEdits[scene.id] ?? scene.label}
                  onChange={(e) => setLabelEdits((prev) => ({ ...prev, [scene.id]: e.target.value }))}
                  onBlur={() => handleRenameCommit(scene.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  className="w-full text-center text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-orange-400 focus:outline-none px-1"
                  placeholder="Enter name"
                />

                <button
                  onClick={() => handleDeleteSingle(scene.id)}
                  className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete scene"
                >
                  <X size={10} />
                </button>

                <div className="absolute top-0 left-8 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-br">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom actions – STICKY */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 p-4 mt-6 flex justify-end z-10">
        <button
          onClick={onEnterEditor}
          disabled={scenes.length === 0}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          Go to Editor <ArrowRight size={16} />
        </button>
      </div>

      <ConfirmDialog
        open={!!deleteConfirmSingle}
        onConfirm={confirmDeleteSingle}
        onCancel={() => setDeleteConfirmSingle(null)}
        title="Delete Scene"
        message="This scene will be permanently removed. All associated hotspots will be lost."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onConfirm={confirmDeleteMultiple}
        onCancel={() => setDeleteConfirmOpen(false)}
        title={`Delete ${selectedIds.length} Scene(s)`}
        message={`This will permanently remove ${selectedIds.length} scene(s) and all their hotspots.`}
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}