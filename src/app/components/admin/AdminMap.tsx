import { useState, useRef, useEffect } from 'react';
import {
  Plus, Video, Map as MapIcon, X, ZoomIn, ZoomOut, Layers,
  Save, CheckCircle, AlertCircle,
} from 'lucide-react';
import { useOffices } from '../../../hooks/useOffices';
import { updateOffice } from '../../../services/officeService';
import { addNotification } from '../../../services/notificationService';
import { useMapSettingsRealtime, saveMapSettings, MapFloor } from '../../../services/mapService';
import { useBuildingTourRealtime, saveBuildingTour, VRTour, VRScene } from '../../../services/vrTourService';
import ImageUpload from '../ui/ImageUpload';
import VRMediaManager from './VRMediaManager';
import VREditorFullScreen from './VREditorFullScreen';
import { SHAPES } from './mapConstants';

const renderMapMarker = (d: any, isSelected: boolean) => {
  const { x, y, size, color, shape = 'circle' } = d;
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

  // 2D state
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const [activeFloor, setActiveFloor] = useState<string>('ground');
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [newFloorLabel, setNewFloorLabel] = useState('');
  const [mapScale, setMapScale] = useState(1);
  const [draggingDot, setDraggingDot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const svgRef = useRef<SVGSVGElement>(null);
  const [floorMaps, setFloorMaps] = useState<MapFloor[]>([]);
  const [mapDots, setMapDots] = useState<any[]>([]);

  // VR state
  const [vrMode, setVrMode] = useState<'upload' | 'editor'>('upload');
  const [vrTour, setVrTour] = useState<VRTour | null>(null);
  const [vrLoading, setVrLoading] = useState(true);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [vrSaveLoading, setVrSaveLoading] = useState(false);

  // Load 2D map settings
  useEffect(() => {
    const unsub = useMapSettingsRealtime((s) => {
      if (s.floors?.length) setFloorMaps(s.floors);
      else {
        const defaults = [{ id: 'ground', label: 'Ground Floor', url: '', width: 800, height: 600 }];
        setFloorMaps(defaults);
        saveMapSettings({ floors: defaults }).catch(console.error);
      }
    });
    return () => unsub();
  }, []);

  // Initialize map dots from offices
  useEffect(() => {
    if (offices.length > 0 && mapDots.length === 0) {
      setMapDots(
        offices.map((o) => ({
          id: `dot-${o.id}`,
          officeId: o.id || '',
          x: o.mapX ?? 50,
          y: o.mapY ?? 50,
          label: o.shortName || 'Office',
          color: o.iconBg || '#F97316',
          size: 3,
          shape: (o as any).mapShape || 'circle',
        }))
      );
    }
  }, [offices]);

  // Load VR tour when tab is VR
  useEffect(() => {
    if (activeTab === 'vr') {
      setVrLoading(true);
      const unsub = useBuildingTourRealtime((data) => {
        if (data) {
          setVrTour(data);
          if (!selectedSceneId && data.scenes?.length) setSelectedSceneId(data.scenes[0].id);
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
      return () => unsub();
    }
  }, [activeTab]);

  const selectedScene = vrTour?.scenes?.find((s) => s.id === selectedSceneId);
  const selectedOfficeData = offices.find((o) => o.id === selectedOffice);
  const activeFloorMap = floorMaps.find((f) => f.id === activeFloor);
  const imgWidth = activeFloorMap?.width || 800;
  const imgHeight = activeFloorMap?.height || 600;
  const VIEWBOX_WIDTH = 100;
  const VIEWBOX_HEIGHT = Math.round(100 / (imgWidth / imgHeight));

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setSaveMessage(msg);
    setMessageType(type);
    setTimeout(() => setSaveMessage(null), 4000);
  };

  // ---------- 2D handlers ----------
  const handleFloorImageUpload = async (url: string) => {
    const img = new window.Image();
    img.onload = async () => {
      const updated = floorMaps.map((f) =>
        f.id === activeFloor ? { ...f, url, width: img.naturalWidth, height: img.naturalHeight } : f
      );
      setFloorMaps(updated);
      await saveMapSettings({ floors: updated });
      showMessage('Floor plan saved.');
    };
    img.onerror = async () => {
      const updated = floorMaps.map((f) => (f.id === activeFloor ? { ...f, url } : f));
      setFloorMaps(updated);
      await saveMapSettings({ floors: updated });
      showMessage('Floor plan saved.');
    };
    img.src = url;
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const dot of mapDots) {
        await updateOffice(dot.officeId, {
          mapX: dot.x,
          mapY: dot.y,
          mapShape: dot.shape,
        } as any);
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
    const id = newFloorLabel.toLowerCase().replace(/\s+/g, '-');
    const updated = [...floorMaps, { id, label: newFloorLabel, url: '', width: 800, height: 600 }];
    setFloorMaps(updated);
    try {
      await saveMapSettings({ floors: updated });
      setNewFloorLabel('');
      setShowAddFloor(false);
      setActiveFloor(id);
      showMessage('Floor added.');
    } catch {
      showMessage('Failed to add floor.', 'error');
    }
  };

  const handleRemoveFloor = async (id: string) => {
    if (floorMaps.length <= 1) return;
    const updated = floorMaps.filter((f) => f.id !== id);
    setFloorMaps(updated);
    try {
      await saveMapSettings({ floors: updated });
      if (activeFloor === id) setActiveFloor(updated[0].id);
      showMessage('Floor removed.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDotMouseDown = (dotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingDot(dotId);
  };

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (!draggingDot || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    setMapDots((p) =>
      p.map((d) =>
        d.id === draggingDot
          ? {
              ...d,
              x: Math.round(((e.clientX - r.left) / r.width) * 1000) / 10,
              y: Math.round(((e.clientY - r.top) / r.height) * 1000) / 10,
            }
          : d
      )
    );
  };

  const handleSvgMouseUp = () => {
    if (draggingDot) {
      const dot = mapDots.find((d) => d.id === draggingDot);
      if (dot) updateOffice(dot.officeId, { mapX: dot.x, mapY: dot.y }).catch(console.error);
    }
    setDraggingDot(null);
  };

  // ---------- VR Tour helpers ----------
  const persistTour = async (tour: VRTour) => {
    try {
      await saveBuildingTour(tour);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScenesUploaded = (updatedTour: VRTour) => {
    setVrTour(updatedTour);
    if (updatedTour.scenes?.length) {
      setSelectedSceneId(updatedTour.scenes[0].id);
      setTimeout(() => setVrMode('editor'), 100);
    }
  };

  const handleEnterEditor = () => {
    if (!vrTour?.scenes?.length) {
      showMessage('Add at least one image first.', 'error');
      return;
    }
    setVrMode('editor');
  };

  const handleSaveVRTour = async (): Promise<void> => {
    if (!vrTour) return;
    try {
      await saveBuildingTour(vrTour);
      await addNotification({
        title: 'VR Tour Updated',
        message: 'Virtual tour saved.',
        time: new Date().toLocaleString(),
        read: false,
        type: 'info',
      } as any);
      showMessage('VR tour saved.');
    } catch (err) {
      showMessage('Save failed.', 'error');
      throw err;
    }
  };

  const handleDropSceneToCreateHotspot = (lon: number, lat: number, targetSceneId: string) => {
    if (!selectedSceneId || !vrTour) return;
    const targetScene = vrTour.scenes.find((s) => s.id === targetSceneId);
    if (!targetScene) {
      console.warn('Target scene not found:', targetSceneId);
      return;
    }
    const newHotspot = {
      id: Date.now().toString(),
      longitude: lon,
      latitude: lat,
      x: ((lon + 180) / 360) * 100,
      y: ((90 - lat) / 180) * 100,
      type: 'navigation' as const,
      label: targetScene.label || 'Navigate',
      targetSceneId: targetSceneId,
      color: '#3B82F6',
      shape: 'arrow' as const,
      size: 1.2,
    };
    const updatedScenes = vrTour.scenes.map((s) =>
      s.id === selectedSceneId ? { ...s, hotspots: [...s.hotspots, newHotspot] } : s
    );
    const updated = { ...vrTour, scenes: updatedScenes };
    setVrTour(updated);
    persistTour(updated).then(() => showMessage('Navigation hotspot added!'));
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading map data…</div>;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
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
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 ${
                messageType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {messageType === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {saveMessage}
            </span>
          )}
          {activeTab === '2d' ? (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save & Notify Users
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => handleSaveVRTour()}
              disabled={vrSaveLoading}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {vrSaveLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save & Notify Users
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('2d')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md ${
            activeTab === '2d' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
          }`}
        >
          <MapIcon size={16} /> 2D Map
        </button>
        <button
          onClick={() => setActiveTab('vr')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md ${
            activeTab === 'vr' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
          }`}
        >
          <Video size={16} /> 360° Tour
        </button>
      </div>

      {/* 2D MAP EDITOR */}
      {activeTab === '2d' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">How to set up the 2D map:</p>
            <ol className="list-decimal ml-5 space-y-1 text-xs">
              <li>Add floors (e.g., Ground Floor, 2nd Floor).</li>
              <li>Upload a floor plan image for each floor.</li>
              <li>Drag the office dots to their correct locations on the plan.</li>
              <li>Click an office to adjust its shape, size, and exact position, then save.</li>
            </ol>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Floors</span>
              <button
                onClick={() => setShowAddFloor(true)}
                className="text-xs text-gray-600 font-medium flex items-center gap-1 hover:text-gray-800"
              >
                <Plus size={14} /> Add Floor
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {floorMaps.map((f) => (
                <div key={f.id} className="relative group">
                  <button
                    onClick={() => setActiveFloor(f.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${
                      activeFloor === f.id
                        ? 'border-gray-800 bg-gray-50 text-gray-800'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Layers size={14} /> {f.label}
                  </button>
                  {floorMaps.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFloor(f.id);
                      }}
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
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
                  {activeFloorMap?.label || 'Floor'} — Floor Plan Image
                </label>
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
                    <button
                      onClick={() => setMapScale((p) => Math.max(0.5, p - 0.1))}
                      className="w-7 h-7 rounded bg-white border flex items-center justify-center"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-xs text-gray-500 w-10 text-center">{Math.round(mapScale * 100)}%</span>
                    <button
                      onClick={() => setMapScale((p) => Math.min(2, p + 0.1))}
                      className="w-7 h-7 rounded bg-white border flex items-center justify-center"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>
                </div>
                <div
                  className="relative bg-gray-50"
                  style={{ paddingBottom: `${(VIEWBOX_HEIGHT / VIEWBOX_WIDTH) * 100}%` }}
                >
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${VIEWBOX_WIDTH / mapScale} ${VIEWBOX_HEIGHT / mapScale}`}
                    className="absolute inset-0 w-full h-full"
                    onMouseMove={handleSvgMouseMove}
                    onMouseUp={handleSvgMouseUp}
                    onMouseLeave={handleSvgMouseUp}
                  >
                    {activeFloorMap?.url ? (
                      <image
                        href={activeFloorMap.url}
                        x="0"
                        y="0"
                        width={VIEWBOX_WIDTH / mapScale}
                        height={VIEWBOX_HEIGHT / mapScale}
                      />
                    ) : (
                      <rect
                        width={VIEWBOX_WIDTH / mapScale}
                        height={VIEWBOX_HEIGHT / mapScale}
                        fill="#F1F5F9"
                      />
                    )}
                    {mapDots
                      .filter((d) => offices.find((o) => o.id === d.officeId))
                      .map((d) => (
                        <g key={d.id}>
                          {selectedOffice === d.officeId &&
                            renderMapMarker({ ...d, size: d.size + 1.5, color: d.color }, true)}
                          <g
                            onMouseDown={(e) => handleDotMouseDown(d.id, e)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOffice(d.officeId);
                            }}
                            style={{ cursor: 'grab' }}
                          >
                            {renderMapMarker(d, selectedOffice === d.officeId)}
                          </g>
                          <text
                            x={d.x}
                            y={d.y + d.size + 3}
                            textAnchor="middle"
                            fontSize={Math.max(1.5, d.size * 0.7)}
                            fill="#374151"
                            fontWeight="600"
                            style={{ pointerEvents: 'none' }}
                          >
                            {d.label}
                          </text>
                        </g>
                      ))}
                  </svg>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {/* Office list and property editor (unchanged) */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 border-b bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700">Offices</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {offices.map((o) => {
                    const d = mapDots.find((dd) => dd.officeId === o.id);
                    return (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOffice(o.id === selectedOffice ? null : o.id ?? null)}
                        className={`px-4 py-2.5 border-b cursor-pointer flex items-center gap-2.5 ${
                          selectedOffice === o.id
                            ? 'bg-gray-50 border-l-2 border-l-gray-800'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: o.iconBg || '#6B7280' }}
                        >
                          {o.shortName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{o.shortName}</p>
                          {d && (
                            <p className="text-[10px] text-gray-400">
                              Position: {d.x.toFixed(1)}%, {d.y.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {selectedOfficeData &&
                (() => {
                  const d = mapDots.find((dd) => dd.officeId === selectedOffice);
                  if (!d) return null;
                  return (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold mb-1">{selectedOfficeData.shortName}</p>
                      <p className="text-[10px] text-gray-500 mb-3">Adjust position, size and shape</p>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-0.5" htmlFor="office-floor">
                            Floor
                          </label>
                          <select
                            id="office-floor"
                            value={selectedOfficeData.floorId || 'ground'}
                            onChange={async (e) => {
                              await updateOffice(selectedOfficeData.id!, {
                                floorId: e.target.value || 'ground',
                              });
                            }}
                            className="w-full border rounded px-2 py-1.5 text-xs bg-white"
                          >
                            {floorMaps.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-0.5">X: {d.x.toFixed(1)}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={d.x}
                            onChange={(e) => {
                              const nx = parseFloat(e.target.value);
                              setMapDots((p) =>
                                p.map((dd) => (dd.id === d.id ? { ...dd, x: nx } : dd))
                              );
                              updateOffice(d.officeId, { mapX: nx }).catch(console.error);
                            }}
                            className="w-full accent-gray-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-0.5">Y: {d.y.toFixed(1)}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={d.y}
                            onChange={(e) => {
                              const ny = parseFloat(e.target.value);
                              setMapDots((p) =>
                                p.map((dd) => (dd.id === d.id ? { ...dd, y: ny } : dd))
                              );
                              updateOffice(d.officeId, { mapY: ny }).catch(console.error);
                            }}
                            className="w-full accent-gray-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Shape</label>
                          <div className="flex gap-1">
                            {SHAPES.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setMapDots((p) =>
                                    p.map((dd) =>
                                      dd.id === d.id ? { ...dd, shape: s.id } : dd
                                    )
                                  );
                                  updateOffice(d.officeId, { mapShape: s.id } as any).catch(console.error);
                                }}
                                className={`w-6 h-6 rounded border text-[10px] ${
                                  (d.shape || 'circle') === s.id
                                    ? 'border-gray-800 bg-white'
                                    : 'border-gray-200'
                                }`}
                                title={s.label}
                              >
                                {s.icon}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-0.5">
                            Size: {d.size.toFixed(1)}
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="8"
                            step="0.5"
                            value={d.size}
                            onChange={(e) =>
                              setMapDots((p) =>
                                p.map((dd) =>
                                  dd.id === d.id
                                    ? { ...dd, size: parseFloat(e.target.value) }
                                    : dd
                                )
                              )
                            }
                            className="w-full accent-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
          {showAddFloor && (
            <div
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
              onClick={() => setShowAddFloor(false)}
            >
              <div
                className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-base font-semibold mb-3">Add New Floor</h3>
                <input
                  type="text"
                  value={newFloorLabel}
                  onChange={(e) => setNewFloorLabel(e.target.value)}
                  placeholder="e.g., 2nd Floor, Basement"
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFloor()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddFloor}
                    className="flex-1 bg-gray-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
                  >
                    Add Floor
                  </button>
                  <button
                    onClick={() => setShowAddFloor(false)}
                    className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VR TOUR (Upload / Editor) */}
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
                <VRMediaManager
                  tour={vrTour}
                  onTourUpdate={handleScenesUploaded}
                  onEnterEditor={handleEnterEditor}
                />
              ) : (
                <VREditorFullScreen
                  tour={vrTour}
                  selectedSceneId={selectedSceneId}
                  onSelectScene={setSelectedSceneId}
                  onTourUpdate={(updated) => {
                    setVrTour(updated);
                    persistTour(updated);
                  }}
                  onBack={() => setVrMode('upload')}
                  onSave={handleSaveVRTour}
                  offices={offices}
                  onDropScene={handleDropSceneToCreateHotspot}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}