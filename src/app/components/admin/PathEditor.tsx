import React, { useState, useRef, useEffect } from 'react';
import { PenLine, Trash2, X, Check } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface PathEditorProps {
  officeId: string;
  officeName: string;
  entrance: Point | null;
  existingPath: Point[] | null;
  onSavePath: (officeId: string, points: Point[]) => void;
  onClearPath: (officeId: string) => void;
  mapImageUrl?: string;
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  mapScale?: number;
}

export default function PathEditor({
  officeId,
  officeName,
  entrance,
  existingPath,
  onSavePath,
  onClearPath,
  mapImageUrl,
  viewBoxWidth = 100,
  viewBoxHeight = 100,
  mapScale = 1,
}: PathEditorProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>(existingPath ? [...existingPath] : []);
  const [tempPoints, setTempPoints] = useState<Point[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // 🔁 Sync when existingPath changes (after save/clear)
  useEffect(() => {
    setPoints(existingPath ? [...existingPath] : []);
  }, [existingPath]);

  // Guard against invalid dimensions and scale
  const safeWidth = viewBoxWidth > 0 ? viewBoxWidth : 100;
  const safeHeight = viewBoxHeight > 0 ? viewBoxHeight : 100;
  const safeScale = mapScale > 0 ? mapScale : 1;
  const effectiveWidth = safeWidth / safeScale;
  const effectiveHeight = safeHeight / safeScale;

  const startDrawing = () => {
    if (!entrance) {
      alert('Please set an entrance marker first.');
      return;
    }
    setIsDrawing(true);
    setTempPoints([{ ...entrance }]); // copy entrance
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // guard against zero rect
    const x = ((e.clientX - rect.left) / rect.width) * effectiveWidth;
    const y = ((e.clientY - rect.top) / rect.height) * effectiveHeight;
    setTempPoints((prev) => [
      ...prev,
      { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 },
    ]);
  };

  const finishDrawing = () => {
    if (tempPoints.length < 2) {
      alert('Please add at least 2 points (entrance + waypoint).');
      return;
    }
    onSavePath(officeId, tempPoints);
    setPoints(tempPoints);
    setIsDrawing(false);
    setTempPoints([]);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setTempPoints([]);
  };

  const handleClear = () => {
    if (window.confirm(`Clear path for ${officeName}?`)) {
      onClearPath(officeId);
      setPoints([]);
    }
  };

  const hasPath = points.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2 border-b flex items-center justify-between bg-gray-50">
        <span className="text-sm font-medium text-gray-700">
          {isDrawing ? `Drawing path for ${officeName} – click on map` : `Path for ${officeName}`}
        </span>
        <div className="flex gap-2">
          {isDrawing ? (
            <>
              <button
                onClick={finishDrawing}
                className="text-xs bg-green-500 text-white px-2 py-1 rounded flex items-center gap-1"
              >
                <Check size={12} /> Finish
              </button>
              <button
                onClick={cancelDrawing}
                className="text-xs bg-red-500 text-white px-2 py-1 rounded flex items-center gap-1"
              >
                <X size={12} /> Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startDrawing}
                className="text-xs bg-orange-500 text-white px-2 py-1 rounded flex items-center gap-1"
                disabled={!entrance}
              >
                <PenLine size={12} /> Draw Path
              </button>
              {hasPath && (
                <button
                  onClick={handleClear}
                  className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div
        className="relative bg-gray-50"
        style={{ paddingBottom: `${(safeHeight / safeWidth) * 100}%` }}
        onClick={isDrawing ? handleSvgClick : undefined}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${effectiveWidth} ${effectiveHeight}`}
          className="absolute inset-0 w-full h-full"
        >
          {mapImageUrl ? (
            <image
              href={mapImageUrl}
              x="0"
              y="0"
              width={effectiveWidth}
              height={effectiveHeight}
            />
          ) : (
            <rect width={effectiveWidth} height={effectiveHeight} fill="#F1F5F9" />
          )}

          {/* Entrance */}
          {entrance && (
            <g>
              <circle cx={entrance.x} cy={entrance.y} r={3.5} fill="#10B981" stroke="white" strokeWidth="0.8" />
              <text x={entrance.x} y={entrance.y - 5} textAnchor="middle" fontSize="2.5" fill="#047857" fontWeight="bold">
                ENTRANCE
              </text>
            </g>
          )}

          {/* Saved path */}
          {points.length > 1 && (
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#F97316"
              strokeWidth="1.5"
              strokeDasharray="4,2"
            />
          )}

          {/* Temporary path */}
          {isDrawing && tempPoints.length > 1 && (
            <polyline
              points={tempPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="1.5"
              strokeDasharray="5,3"
            />
          )}

          {/* Waypoint markers */}
          {isDrawing &&
            tempPoints.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r={1.5} fill="#3B82F6" stroke="white" strokeWidth="0.5" />
            ))}
        </svg>
      </div>

      {!entrance && (
        <div className="p-2 text-xs text-red-500 bg-red-50">
          ⚠️ Please set an entrance marker before drawing a path.
        </div>
      )}
    </div>
  );
}