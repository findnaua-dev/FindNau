import React, { useState, useEffect } from 'react';
import { PenLine, Trash2, Check, DoorOpen } from 'lucide-react';
import { VRTour, VRScene } from '../../../services/vrTourService';

interface ScenePathEditorProps {
  tour: VRTour | null;
  currentScene: VRScene | null;
  offices: any[];
  onTourUpdate: (updatedTour: VRTour) => void;
  // Controlled props mula sa parent
  activeOfficeId: string;
  onOfficeChange: (id: string) => void;
  activePoints: { lon: number; lat: number }[];
  onPointsChange: (points: { lon: number; lat: number }[]) => void;
  isEditing: boolean;
  onEditModeChange: (editing: boolean) => void;
}

export default function ScenePathEditor({
  tour,
  currentScene,
  offices,
  onTourUpdate,
  activeOfficeId,
  onOfficeChange,
  activePoints,
  onPointsChange,
  isEditing,
  onEditModeChange,
}: ScenePathEditorProps) {
  const [pathSaveStatus, setPathSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Load existing path when scene/office changes
  useEffect(() => {
    onEditModeChange(false);
    setPathSaveStatus('idle');
    if (currentScene && activeOfficeId) {
      const existing = currentScene.officePaths?.[activeOfficeId];
      if (existing?.points) {
        onPointsChange([...existing.points]);
      } else {
        onPointsChange([]);
      }
    } else {
      onPointsChange([]);
    }
  }, [currentScene?.id, activeOfficeId]);

  const handleSavePath = () => {
    if (!currentScene || !activeOfficeId || activePoints.length < 2) return;
    setPathSaveStatus('saving');
    const updatedScenes = (tour?.scenes || []).map((s) => {
      if (s.id !== currentScene.id) return s;
      const officePaths = { ...s.officePaths };
      officePaths[activeOfficeId] = { points: activePoints };
      return { ...s, officePaths };
    });
    onTourUpdate({
      ...tour!,
      id: tour?.id || 'buildingTour',
      scenes: updatedScenes,
    });
    setPathSaveStatus('success');
    setTimeout(() => setPathSaveStatus('idle'), 2000);
  };

  const handleClearPath = () => {
    if (!currentScene || !activeOfficeId) return;
    const updatedScenes = (tour?.scenes || []).map((s) => {
      if (s.id !== currentScene.id) return s;
      const officePaths = { ...s.officePaths };
      delete officePaths[activeOfficeId];
      return { ...s, officePaths };
    });
    onTourUpdate({
      ...tour!,
      id: tour?.id || 'buildingTour',
      scenes: updatedScenes,
    });
    onPointsChange([]);
  };

  const handleUseEntrance = () => {
    if (!currentScene || !activeOfficeId) return;
    const entranceHotspot = currentScene.hotspots.find((h) => h.type === 'entrance');
    if (entranceHotspot) {
      onPointsChange([{ lon: entranceHotspot.longitude, lat: entranceHotspot.latitude }]);
    } else {
      alert('No entrance hotspot found in this scene. Please create one first.');
    }
  };

  const officesList = offices || [];

  return (
    <div className="bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg w-64">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1">
          <PenLine size={12} /> Office Path
        </h4>
        <button
          onClick={() => onEditModeChange(!isEditing)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            isEditing ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {isEditing ? 'Editing' : 'Edit Path'}
        </button>
      </div>

      {/* Office selection */}
      <select
        value={activeOfficeId}
        onChange={(e) => onOfficeChange(e.target.value)}
        className="w-full text-xs border rounded px-2 py-1 mb-2 bg-white"
        disabled={isEditing}
      >
        <option value="">Select office</option>
        {officesList.map((o: any) => (
          <option key={o.id} value={o.id}>
            {o.shortName || o.name}
          </option>
        ))}
      </select>

      {/* Use Entrance button */}
      {activeOfficeId && !isEditing && (
        <button
          onClick={handleUseEntrance}
          className="w-full mb-2 bg-purple-100 text-purple-700 text-xs font-medium py-1 rounded hover:bg-purple-200 flex items-center justify-center gap-1"
        >
          <DoorOpen size={12} /> Use Entrance Hotspot
        </button>
      )}

      {/* Editing controls */}
      {isEditing && activeOfficeId && (
        <>
          <p className="text-[10px] text-gray-500 mb-2">
            Click on the panorama to add waypoints for this office.
          </p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500">
              {activePoints.length} waypoint(s)
            </span>
            <button
              onClick={() => onPointsChange([])}
              className="text-[10px] text-red-500 hover:text-red-700"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSavePath}
              disabled={activePoints.length < 2}
              className="flex-1 bg-orange-500 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Check size={12} /> Save Path
            </button>
            <button
              onClick={() => {
                onEditModeChange(false);
                setPathSaveStatus('idle');
              }}
              className="px-2 border text-xs py-1.5 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          {pathSaveStatus === 'success' && (
            <p className="text-[10px] text-green-600 mt-1">Path saved!</p>
          )}
          {pathSaveStatus === 'error' && (
            <p className="text-[10px] text-red-500 mt-1">Save failed</p>
          )}
        </>
      )}

      {/* Clear existing path */}
      {!isEditing && activeOfficeId && currentScene?.officePaths?.[activeOfficeId] && (
        <button
          onClick={handleClearPath}
          className="w-full mb-2 bg-red-50 text-red-600 text-xs font-medium py-1 rounded hover:bg-red-100 flex items-center justify-center gap-1"
        >
          <Trash2 size={12} /> Clear Saved Path
        </button>
      )}
    </div>
  );
}