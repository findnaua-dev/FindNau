import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Video, Map as MapIcon, X, ZoomIn, ZoomOut, Layers,
  Save, CheckCircle, AlertCircle,
} from 'lucide-react';
import { useOffices } from '../../../hooks/useOffices';
import { updateOffice } from '../../../services/officeService';
import { addNotification } from '../../../services/notificationService';
import { useMapSettingsRealtime, saveMapSettings, MapFloor } from '../../../services/mapService';
import { useBuildingTourRealtime, saveBuildingTour, VRTour } from '../../../services/vrTourService';
import ImageUpload from '../ui/ImageUpload';
import VRMediaManager from './VRMediaManager';
import VREditorFullScreen from './VREditorFullScreen';
import PathEditor from './PathEditor';
import { SHAPES } from './mapConstants';

const renderMapMarker = (dot: any, isSelected: boolean) => {
  const { x, y, size, color, shape = 'circle' } = dot;
  const s = size;
  const fillColor = isSelected ? color : '#6B7280';
  switch (shape) {
    case 'square':
      return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} fill={fillColor} stroke="white" strokeWidth="0.8" />;
    case 'diamond':
      return <polygon points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`} fill={fillColor} stroke="white" strokeWidth="0.8" />;
    case 'hexagon': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        return `${x + s * Math.cos(angle)},${y + s * Math.sin(angle)}`;
      }).join(' ');
      return <polygon points={pts} fill={fillColor} stroke="white" strokeWidth="0.8" />;
    }
    case 'rounded':
      return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} rx={s * 0.5} fill={fillColor} stroke="white" strokeWidth="0.8" />;
    case 'arrow': {
      const path = `M${x},${y - s} L${x + s * 0.8},${y + s * 0.4} L${x + s * 0.3},${y + s * 0.4} L${x + s * 0.3},${y + s} L${x - s * 0.3},${y + s} L${x - s * 0.3},${y + s * 0.4} L${x - s * 0.8},${y + s * 0.4} Z`;
      return <path d={path} fill={fillColor} stroke="white" strokeWidth="0.8" />;
    }
    default:
      return <circle cx={x} cy={y} r={s} fill={fillColor} stroke="white" strokeWidth="0.8" />;
  }
};

export default function AdminMap() {
  const { offices, loading } = useOffices();
  const [activeTab, setActiveTab] = useState<'2d' | 'vr'>('2d');

  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const [activeFloor, setActiveFloor] = useState<string>('ground');
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [newFloorLabel, setNewFloorLabel] = useState('');
  const [mapScale, setMapScale] = useState(1);
  const [draggingDotId, setDraggingDotId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const svgRef = useRef<SVGSVGElement>(null);
  const [floorMaps, setFloorMaps] = useState<MapFloor[]>([]);
  const [localDots, setLocalDots] = useState<any[]>([]);
  const [settingEntrance, setSettingEntrance] = useState(false);

  const [vrMode, setVrMode] = useState<'upload' | 'editor'>('upload');
  const [vrTour, setVrTour] = useState<VRTour | null>(null);
  const [vrLoading, setVrLoading] = useState(true);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [vrSaveLoading, setVrSaveLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = useMapSettingsRealtime((settings) => {
      if (settings.floors?.length) {
        setFloorMaps(settings.floors);
      } else {
        const defaults = [{ id: 'ground', label: 'Ground Floor', url: '', width: 800, height: 600, entrance: undefined, paths: [] }];
        setFloorMaps(defaults);
        saveMapSettings({ floors: defaults }).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setVrLoading(true);
    const unsubscribe = useBuildingTourRealtime((data) => {
      if (data) {
        setVrTour(data);
      } else {
        setVrTour({
          id: 'buildingTour',
          name: 'Building Tour',
          description: 'Virtual tour of the building',
          scenes: [],
        });
      }
      setVrLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (vrTour && vrTour.scenes?.length && !selectedSceneId) {
      setSelectedSceneId(vrTour.scenes[0].id);
    }
  }, [vrTour, selectedSceneId]);

  const officesOnFloor = useMemo(
    () => offices.filter(office => (office.floorId || 'ground') === activeFloor),
    [offices, activeFloor]
  );

  useEffect(() => {
    if (officesOnFloor.length > 0) {
      setLocalDots(
        officesOnFloor.map(office => ({
          id: `dot-${office.id}`,
          officeId: office.id!,
          x: office.mapX ?? 50,
          y: office.mapY ?? 50,
          label: office.shortName || 'Office',
          color: office.iconBg || '#F97316',
          size: 3,
          shape: (office as any).mapShape || 'circle',
        }))
      );
    } else {
      setLocalDots([]);
    }
  }, [officesOnFloor]);

  const selectedOfficeData = offices.find(office => office.id === selectedOffice);
  const activeFloorMap = floorMaps.find(floor => floor.id === activeFloor);
  const imgWidth = activeFloorMap?.width || 800;
  const imgHeight = activeFloorMap?.height || 600;
  const VIEWBOX_WIDTH = 100;
  const VIEWBOX_HEIGHT = imgWidth > 0 && imgHeight > 0
    ? Math.round(100 / (imgWidth / imgHeight))
    : 100;
  const safeMapScale = mapScale > 0 ? mapScale : 1;
  const effectiveVBWidth = VIEWBOX_WIDTH / safeMapScale;
  const effectiveVBHeight = VIEWBOX_HEIGHT / safeMapScale;

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setSaveMessage(msg);
    setMessageType(type);
    setTimeout(() => setSaveMessage(null), 4000);
  };

  const handleFloorImageUpload = async (url: string) => {
    const img = new window.Image();
    img.onload = async () => {
      const updated = floorMaps.map(floor =>
        floor.id === activeFloor ? { ...floor, url, width: img.naturalWidth, height: img.naturalHeight } : floor
      );
      setFloorMaps(updated);
      await saveMapSettings({ floors: updated });
      showMessage('Floor plan saved.');
    };
    img.onerror = async () => {
      const updated = floorMaps.map(floor => (floor.id === activeFloor ? { ...floor, url } : floor));
      setFloorMaps(updated);
      await saveMapSettings({ floors: updated });
      showMessage('Floor plan saved.');
    };
    img.src = url;
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const dot of localDots) {
        await updateOffice(dot.officeId, { mapX: dot.x, mapY: dot.y, mapShape: dot.shape } as any);
      }
      await saveMapSettings({ floors: floorMaps });
      await addNotification({
        title: 'Map Updated',
        message: 'Office locations saved.',
        time: new Date().toLocaleString(),
        read: false,
        type: 'info',
      } as any);
      showMessage('All changes saved.');
    } catch {
      showMessage('Save failed.', 'error');
    }
    setSaving(false);
  };

  const handleAddFloor = async () => {
    if (!newFloorLabel.trim()) return;
    const floorId = newFloorLabel.toLowerCase().replace(/\s+/g, '-');
    const updatedFloors = [...floorMaps, { id: floorId, label: newFloorLabel, url: '', width: 800, height: 600, entrance: undefined, paths: [] }];
    setFloorMaps(updatedFloors);
    try {
      await saveMapSettings({ floors: updatedFloors });
      setNewFloorLabel('');
      setShowAddFloor(false);
      setActiveFloor(floorId);
      showMessage('Floor added.');
    } catch {
      showMessage('Failed to add floor.', 'error');
    }
  };

  const handleRemoveFloor = async (floorId: string) => {
    if (floorMaps.length <= 1) return;
    const updatedFloors = floorMaps.filter(floor => floor.id !== floorId);
    setFloorMaps(updatedFloors);
    try {
      await saveMapSettings({ floors: updatedFloors });
      if (activeFloor === floorId) setActiveFloor(updatedFloors[0].id);
      showMessage('Floor removed.');
    } catch (error) {
      console.error(error);
    }
  };

  const handleDotMouseDown = (dotId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDraggingDotId(dotId);
  };

  const handleSvgMouseMove = (event: React.MouseEvent) => {
    if (!draggingDotId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const newX = ((event.clientX - rect.left) / rect.width) * effectiveVBWidth;
    const newY = ((event.clientY - rect.top) / rect.height) * effectiveVBHeight;
    const roundedX = Math.round(newX * 10) / 10;
    const roundedY = Math.round(newY * 10) / 10;
    setLocalDots(prev =>
      prev.map(dot => (dot.id === draggingDotId ? { ...dot, x: roundedX, y: roundedY } : dot))
    );
  };

  const handleSvgMouseUp = () => {
    if (draggingDotId) {
      const dot = localDots.find(d => d.id === draggingDotId);
      if (dot) {
        updateOffice(dot.officeId, { mapX: dot.x, mapY: dot.y }).catch(console.error);
      }
    }
    setDraggingDotId(null);
  };

  const handleSvgBackgroundClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!settingEntrance || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * effectiveVBWidth;
    const y = ((event.clientY - rect.top) / rect.height) * effectiveVBHeight;
    const roundedX = Math.round(x * 10) / 10;
    const roundedY = Math.round(y * 10) / 10;
    const updatedFloors = floorMaps.map(floor =>
      floor.id === activeFloor ? { ...floor, entrance: { x: roundedX, y: roundedY } } : floor
    );
    setFloorMaps(updatedFloors);
    saveMapSettings({ floors: updatedFloors })
      .then(() => showMessage('Entrance saved.'))
      .catch(() => showMessage('Failed to save entrance.', 'error'));
    setSettingEntrance(false);
  };

  const updateDotProperty = (dotId: string, updates: any) => {
    setLocalDots(prev =>
      prev.map(dot => (dot.id === dotId ? { ...dot, ...updates } : dot))
    );
    const dot = localDots.find(d => d.id === dotId);
    if (dot) {
      updateOffice(dot.officeId, { ...updates } as any).catch(console.error);
    }
  };

  const handleSavePath = async (officeId: string, points: { x: number; y: number }[]) => {
    const updatedFloors = floorMaps.map(floor => {
      if (floor.id !== activeFloor) return floor;
      const existingPaths = floor.paths || [];
      const filtered = existingPaths.filter(p => p.officeId !== officeId);
      return { ...floor, paths: [...filtered, { officeId, points }] };
    });
    setFloorMaps(updatedFloors);
    try {
      await saveMapSettings({ floors: updatedFloors });
      showMessage('Path saved.');
    } catch {
      showMessage('Failed to save path.', 'error');
    }
  };

  const handleClearPath = async (officeId: string) => {
    const updatedFloors = floorMaps.map(floor => {
      if (floor.id !== activeFloor) return floor;
      return { ...floor, paths: (floor.paths || []).filter(p => p.officeId !== officeId) };
    });
    setFloorMaps(updatedFloors);
    try {
      await saveMapSettings({ floors: updatedFloors });
      showMessage('Path cleared.');
    } catch {
      showMessage('Failed to clear path.', 'error');
    }
  };

  // ✅ FIX: Hindi na auto-enter pagkatapos ng upload
  const handleTourStateUpdate = (updated: VRTour) => {
    setVrTour(updated);
  };

  const handleEnterEditor = () => {
    if (!vrTour?.scenes?.length) {
      showMessage('Add at least one image first.', 'error');
      return;
    }
    if (!selectedSceneId) {
      setSelectedSceneId(vrTour.scenes[0].id);
    }
    setVrMode('editor');
  };

  function removeUndefined(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(removeUndefined);
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, removeUndefined(value)])
      );
    }
    return obj;
  }

  const handleSaveVRTour = async (): Promise<void> => {
    if (!vrTour) return;
    setVrSaveLoading(true);
    try {
      const cleanTour = removeUndefined(JSON.parse(JSON.stringify(vrTour)));
      await saveBuildingTour(cleanTour);
      await addNotification({
        title: 'VR Tour Updated',
        message: 'Virtual tour saved.',
        time: new Date().toLocaleString(),
        read: false,
        type: 'info',
      } as any);
      showMessage('VR tour saved.');
    } catch (error) {
      console.error('❌ Save VR Tour error:', error);
      showMessage('Save failed. Check console.', 'error');
      throw error;
    } finally {
      setVrSaveLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading map data…</div>;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header & Save button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Map & Virtual Tour</h2>
          <p className="text-sm text-gray-500">
            {activeTab === '2d'
              ? 'Position offices on floor plans'
              : vrMode === 'upload'
              ? 'Upload panoramic images'
              : 'Full-screen editor'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 ${messageType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {messageType === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {saveMessage}
            </span>
          )}
          {activeTab === '2d' ? (
            <button onClick={handleSaveAll} disabled={saving} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Save size={16} /> Save & Notify Users</>
              )}
            </button>
          ) : (
            <button onClick={() => handleSaveVRTour()} disabled={vrSaveLoading} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
              {vrSaveLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Save size={16} /> Save & Notify Users</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button onClick={() => setActiveTab('2d')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md ${activeTab === '2d' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
          <MapIcon size={16} /> 2D Map
        </button>
        <button onClick={() => setActiveTab('vr')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md ${activeTab === 'vr' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
          <Video size={16} /> 360° Tour
        </button>
      </div>

      {/* ==================== 2D MAP ==================== */}
      {activeTab === '2d' && (
        <div className="space-y-4">
          {/* 🧭 STEP-BY-STEP BANNER */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
            <p className="font-bold mb-2">Steps para sa paggawa ng path:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Pumili ng <strong>Floor</strong>.</li>
              <li>Mag-upload ng <strong>Floor Plan Image</strong>.</li>
              <li>I-click ang <strong>"Set Entrance"</strong> tapos i-click ang mapa para maglagay ng berdeng entrance dot.</li>
              <li>Pumili ng <strong>Office</strong> (i-click ang dot o pumili sa listahan).</li>
              <li>I-click ang <strong>"Draw Path"</strong> sa ibaba, pagkatapos i-click ang mapa para maglagay ng daanan.</li>
              <li>I-click ang <strong>"Finish"</strong> para ma-save ang path.</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">How to set up the 2D map:</p>
            <ol className="list-decimal ml-5 space-y-1 text-xs">
              <li>Add floors (e.g., Ground Floor, 2nd Floor).</li>
              <li>Upload a floor plan image for each floor.</li>
              <li>Drag the office dots to their correct locations on the plan. Only offices assigned to this floor appear.</li>
              <li>Click an office to adjust its shape, size, and exact position, then save.</li>
            </ol>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Floors</span>
              <button onClick={() => setShowAddFloor(true)} className="text-xs text-gray-600 font-medium flex items-center gap-1 hover:text-gray-800">
                <Plus size={14} /> Add Floor
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {floorMaps.map(floor => (
                <div key={floor.id} className="relative group">
                  <button
                    onClick={() => setActiveFloor(floor.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${activeFloor === floor.id ? 'border-gray-800 bg-gray-50 text-gray-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    <Layers size={14} /> {floor.label}
                  </button>
                  {floorMaps.length > 1 && (
                    <button
                      onClick={event => { event.stopPropagation(); handleRemoveFloor(floor.id); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove floor"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {activeFloorMap?.label || 'Floor'} — Floor Plan Image
                  </label>
                  <button
                    onClick={() => setSettingEntrance(true)}
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      settingEntrance ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Set Entrance
                  </button>
                </div>
                {settingEntrance && (
                  <p className="text-xs text-green-600 mb-2">Click on the map below to place the entrance marker.</p>
                )}
                <ImageUpload
                  onUpload={handleFloorImageUpload}
                  currentImage={activeFloorMap?.url}
                  label="Upload Floor Plan"
                  folder="findnau/floor-plans"
                  maxFileSize={20}
                />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 border-b flex items-center justify-between bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">Drag office dots to position them</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setMapScale(prev => Math.max(0.5, prev - 0.1))} className="w-7 h-7 rounded bg-white border flex items-center justify-center"><ZoomOut size={14} /></button>
                    <span className="text-xs text-gray-500 w-10 text-center">{Math.round(mapScale * 100)}%</span>
                    <button onClick={() => setMapScale(prev => Math.min(2, prev + 0.1))} className="w-7 h-7 rounded bg-white border flex items-center justify-center"><ZoomIn size={14} /></button>
                  </div>
                </div>
                <div className="relative bg-gray-50" style={{ paddingBottom: `${(VIEWBOX_HEIGHT / VIEWBOX_WIDTH) * 100}%` }}>
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${effectiveVBWidth} ${effectiveVBHeight}`}
                    className="absolute inset-0 w-full h-full"
                    onMouseMove={handleSvgMouseMove}
                    onMouseUp={handleSvgMouseUp}
                    onMouseLeave={handleSvgMouseUp}
                    onClick={settingEntrance ? handleSvgBackgroundClick : undefined}
                  >
                    {activeFloorMap?.url ? (
                      <image href={activeFloorMap.url} x="0" y="0" width={effectiveVBWidth} height={effectiveVBHeight} />
                    ) : (
                      <rect width={effectiveVBWidth} height={effectiveVBHeight} fill="#F1F5F9" />
                    )}

                    {/* Entrance marker */}
                    {activeFloorMap?.entrance && (
                      <g>
                        <circle cx={activeFloorMap.entrance.x} cy={activeFloorMap.entrance.y} r={3.5} fill="#10B981" stroke="white" strokeWidth="0.8" />
                        <text x={activeFloorMap.entrance.x} y={activeFloorMap.entrance.y - 5} textAnchor="middle" fontSize="2.5" fill="#047857" fontWeight="bold">
                          ENTRANCE
                        </text>
                      </g>
                    )}

                    {localDots.map(dot => {
                      const isSelected = selectedOffice === dot.officeId;
                      return (
                        <g key={dot.id}>
                          {isSelected && renderMapMarker({ ...dot, size: dot.size + 1.5, color: dot.color }, true)}
                          <g
                            onMouseDown={(event) => handleDotMouseDown(dot.id, event)}
                            onClick={(event) => { event.stopPropagation(); setSelectedOffice(dot.officeId); }}
                            style={{ cursor: 'grab' }}
                          >
                            {renderMapMarker(dot, isSelected)}
                          </g>
                          <text
                            x={dot.x}
                            y={dot.y + dot.size + 3}
                            textAnchor="middle"
                            fontSize={Math.max(1.5, dot.size * 0.7)}
                            fill="#374151"
                            fontWeight="600"
                            style={{ pointerEvents: 'none' }}
                          >
                            {dot.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 border-b bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700">Offices on {activeFloorMap?.label || 'this floor'}</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {officesOnFloor.map(office => {
                    const dot = localDots.find(d => d.officeId === office.id);
                    return (
                      <div
                        key={office.id}
                        onClick={() => setSelectedOffice(office.id === selectedOffice ? null : office.id!)}
                        className={`px-4 py-2.5 border-b cursor-pointer flex items-center gap-2.5 ${selectedOffice === office.id ? 'bg-gray-50 border-l-2 border-l-gray-800' : 'hover:bg-gray-50'}`}
                      >
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: office.iconBg || '#6B7280' }}>
                          {office.shortName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{office.shortName}</p>
                          {dot && (
                            <p className="text-[10px] text-gray-400">Position: {dot.x.toFixed(1)}%, {dot.y.toFixed(1)}%</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {officesOnFloor.length === 0 && (
                    <p className="text-xs text-gray-400 p-4 text-center">No offices assigned to this floor.</p>
                  )}
                </div>
              </div>

              {selectedOfficeData && (() => {
                const dot = localDots.find(d => d.officeId === selectedOfficeData.id);
                if (!dot) return null;
                return (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm font-semibold mb-1">{selectedOfficeData.shortName}</p>
                    <p className="text-[10px] text-gray-500 mb-3">Adjust position, size and shape</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-0.5">Floor</label>
                        <select
                          value={selectedOfficeData.floorId || 'ground'}
                          onChange={async (event) => {
                            await updateOffice(selectedOfficeData.id!, { floorId: event.target.value || 'ground' });
                          }}
                          className="w-full border rounded px-2 py-1.5 text-xs bg-white"
                        >
                          {floorMaps.map(floor => (
                            <option key={floor.id} value={floor.id}>{floor.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* ✅ NEW: VR Scene Assignment Dropdown */}
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-0.5">360° Scene</label>
                        <select
                          value={selectedOfficeData.vrSceneId || ''}
                          onChange={async (event) => {
                            const value = event.target.value || undefined;
                            await updateOffice(selectedOfficeData.id!, { vrSceneId: value });
                          }}
                          className="w-full border rounded px-2 py-1.5 text-xs bg-white"
                        >
                          <option value="">None</option>
                          {vrTour?.scenes
                            ?.filter(scene => scene.floorId === selectedOfficeData.floorId)
                            .map(scene => (
                              <option key={scene.id} value={scene.id}>{scene.label}</option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 block mb-0.5">X: {dot.x.toFixed(1)}%</label>
                        <input
                          type="range" min="0" max="100" step="0.5"
                          value={dot.x}
                          onChange={event => updateDotProperty(dot.id, { x: parseFloat(event.target.value) })}
                          className="w-full accent-gray-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-0.5">Y: {dot.y.toFixed(1)}%</label>
                        <input
                          type="range" min="0" max="100" step="0.5"
                          value={dot.y}
                          onChange={event => updateDotProperty(dot.id, { y: parseFloat(event.target.value) })}
                          className="w-full accent-gray-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-1">Shape</label>
                        <div className="flex gap-1">
                          {SHAPES.map(shape => {
                            const IconComponent = shape.icon;
                            return (
                              <button
                                key={shape.id}
                                onClick={() => updateDotProperty(dot.id, { shape: shape.id })}
                                className={`w-6 h-6 rounded border text-[10px] ${(dot.shape || 'circle') === shape.id ? 'border-gray-800 bg-white' : 'border-gray-200'}`}
                                title={shape.label}
                              >
                                <IconComponent size={14} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-0.5">Size: {dot.size.toFixed(1)}</label>
                        <input
                          type="range" min="1" max="8" step="0.5"
                          value={dot.size}
                          onChange={event => updateDotProperty(dot.id, { size: parseFloat(event.target.value) })}
                          className="w-full accent-gray-800"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Path Editor for selected office */}
          {selectedOfficeData && selectedOfficeData.id && activeFloorMap?.entrance && VIEWBOX_WIDTH > 0 && VIEWBOX_HEIGHT > 0 ? (
            <div className="mt-4">
              <PathEditor
                officeId={selectedOfficeData.id}
                officeName={selectedOfficeData.shortName || selectedOfficeData.name}
                entrance={activeFloorMap.entrance}
                existingPath={activeFloorMap.paths?.find(p => p.officeId === selectedOfficeData.id)?.points || null}
                onSavePath={handleSavePath}
                onClearPath={handleClearPath}
                mapImageUrl={activeFloorMap.url}
                viewBoxWidth={VIEWBOX_WIDTH}
                viewBoxHeight={VIEWBOX_HEIGHT}
                mapScale={1}
              />
            </div>
          ) : selectedOfficeData && !activeFloorMap?.entrance ? (
            <div className="p-4 text-sm text-yellow-600 bg-yellow-50 rounded-xl border">
              ⚠️ Please set an entrance marker before drawing a path.
            </div>
          ) : null}

          {showAddFloor && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddFloor(false)}>
              <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl" onClick={event => event.stopPropagation()}>
                <h3 className="text-base font-semibold mb-3">Add New Floor</h3>
                <input
                  type="text" value={newFloorLabel} onChange={event => setNewFloorLabel(event.target.value)}
                  placeholder="e.g., 2nd Floor, Basement"
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-4" autoFocus
                  onKeyDown={event => event.key === 'Enter' && handleAddFloor()}
                />
                <div className="flex gap-2">
                  <button onClick={handleAddFloor} className="flex-1 bg-gray-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700">Add Floor</button>
                  <button onClick={() => setShowAddFloor(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== VR ==================== */}
      {activeTab === 'vr' && (
        <>
          {vrLoading ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading virtual tour...</p>
            </div>
          ) : (
            <>
              {vrMode === 'upload' ? (
                <VRMediaManager tour={vrTour} onTourUpdate={handleTourStateUpdate} onEnterEditor={handleEnterEditor} />
              ) : (
                <VREditorFullScreen
                  tour={vrTour}
                  selectedSceneId={selectedSceneId}
                  onSelectScene={setSelectedSceneId}
                  onTourUpdate={handleTourStateUpdate}
                  onBack={() => setVrMode('upload')}
                  onSave={handleSaveVRTour}
                  offices={offices}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}