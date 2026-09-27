import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import type { EquirectangularViewerHandle } from '../app/components/EquirectangularViewer';

export interface HotspotLabelItem {
  id: string;
  text: string;
  latitude: number;
  longitude: number;
  size?: number;
  /** ✅ Background color ng label pill (hex) */
  labelBgColor?: string;
}

const latLonToPosition = (lat: number, lon: number, radius = 9.8): THREE.Vector3 => {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    radius * Math.sin(theta) * Math.sin(phi),
    radius * Math.cos(phi),
    -radius * Math.cos(theta) * Math.sin(phi)
  );
};

/** Convert hex (#rrggbb or #rgb) to rgba(...) */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Yellow pill canvas — text only, customizable background */
function drawPillCanvas(
  label: string,
  bgColor: string = '#fde047'
): {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSize = 64;
  const paddingX = 48;
  const paddingY = 28;

  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  const textWidth = ctx.measureText(label).width;

  const W = Math.ceil(textWidth + paddingX * 2);
  const H = Math.ceil(fontSize + paddingY * 2);
  canvas.width = W;
  canvas.height = H;

  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, W, H);

  const r = H / 2;
  c.beginPath();
  c.moveTo(r, 0);
  c.lineTo(W - r, 0);
  c.arc(W - r, r, r, -Math.PI / 2, Math.PI / 2);
  c.lineTo(r, H);
  c.arc(r, r, r, Math.PI / 2, -Math.PI / 2);
  c.closePath();
  c.fillStyle = hexToRgba(bgColor, 0.55);
  c.fill();
  c.strokeStyle = 'rgba(0, 0, 0, 0.10)';
  c.lineWidth = 3;
  c.stroke();

  c.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  c.fillStyle = 'rgba(17, 24, 39, 0.92)';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(label, W / 2, H / 2 + 2);

  return { canvas, width: W, height: H };
}

// ============================================================================
// HOOK 1 — WebXR immersive mode: 3D sprites for each info hotspot
// ============================================================================
export function useVRHotspotLabels({
  viewerRef,
  vrMode,
  visible,
  labels,
  offsetY = 0.7,
  angularSize = 0.055,
}: {
  viewerRef: React.RefObject<EquirectangularViewerHandle | null>;
  vrMode: boolean;
  visible: boolean;
  labels: HotspotLabelItem[];
  offsetY?: number;
  angularSize?: number;
}) {
  const spritesRef = useRef<Map<string, THREE.Sprite>>(new Map());

  const disposeAll = useCallback((scene: THREE.Scene) => {
    spritesRef.current.forEach((sprite) => {
      scene.remove(sprite);
      const mat = sprite.material as THREE.SpriteMaterial;
      if (mat.map) mat.map.dispose();
      mat.dispose();
    });
    spritesRef.current.clear();
  }, []);

  useEffect(() => {
    if (!vrMode) return;
    const scene = viewerRef.current?.getScene?.();
    if (!scene) return;

    disposeAll(scene);
    if (!visible || labels.length === 0) return;

    const baseWorldHeight = 9.8 * Math.tan(angularSize);

    labels.forEach((label) => {
      const bg = label.labelBgColor || '#fde047';
      const { canvas, width, height } = drawPillCanvas(label.text, bg);
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 4;
      tex.needsUpdate = true;

      const mat = new THREE.SpriteMaterial({
        map: tex,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.renderOrder = 1001;

      const sizeFactor = label.size ?? 1;
      const worldHeight = baseWorldHeight * sizeFactor;

      const aspect = width / height;
      sprite.scale.set(worldHeight * aspect, worldHeight, 1);

      const pos = latLonToPosition(label.latitude, label.longitude);
      pos.y += offsetY;
      sprite.position.copy(pos);

      scene.add(sprite);
      spritesRef.current.set(label.id, sprite);
    });

    return () => disposeAll(scene);
  }, [vrMode, visible, labels, viewerRef, disposeAll, offsetY, angularSize]);
}

// ============================================================================
// HOOK 2 — HTML 360 mode: project hotspot positions to screen coords
// ============================================================================
export function useHotspotScreenLabels({
  viewerRef,
  active,
  labels,
}: {
  viewerRef: React.RefObject<EquirectangularViewerHandle | null>;
  active: boolean;
  labels: HotspotLabelItem[];
}) {
  const [positions, setPositions] = useState<
    {
      id: string;
      text: string;
      x: number;
      y: number;
      visible: boolean;
      depth: number;
      size: number;
      /** ✅ Passthrough ng bg color */
      labelBgColor: string;
    }[]
  >([]);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active || labels.length === 0) {
      setPositions([]);
      return;
    }
    const camera = viewerRef.current?.getCamera?.();
    if (!camera) {
      setPositions([]);
      return;
    }

    const vec = new THREE.Vector3();
    const w = window.innerWidth;
    const h = window.innerHeight;

    const loop = () => {
      const result = labels.map((label) => {
        const pos = latLonToPosition(label.latitude, label.longitude);
        vec.copy(pos);
        vec.project(camera);
        const inFront = vec.z < 1 && vec.z > -1;
        const x = (vec.x * 0.5 + 0.5) * w;
        const y = (-vec.y * 0.5 + 0.5) * h;
        const onScreen = x > -300 && x < w + 300 && y > -200 && y < h + 200;
        return {
          id: label.id,
          text: label.text,
          x,
          y,
          depth: vec.z,
          size: label.size ?? 1,
          labelBgColor: label.labelBgColor || '#fde047',
          visible: inFront && onScreen,
        };
      });
      setPositions(result);
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, labels, viewerRef]);

  return positions;
}