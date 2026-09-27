import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { EquirectangularViewerHandle } from '../app/components/EquirectangularViewer';

interface VRInfoPanelOptions {
  viewerRef: React.RefObject<EquirectangularViewerHandle | null>;
  visible: boolean;
  title: string;
  description?: string;
  /** Heading na lalabas bago ang lines list, e.g. "List of Services" */
  listHeader?: string;
  lines?: string[];
  onClose: () => void;
  dwellTime?: number;
  distance?: number;
  panelWidth?: number;
  panelHeight?: number;
}

const ROUNDED_RADIUS = 30;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
): number {
  const words = text.split(' ');
  let line = '';
  let drawn = 0;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      drawn++;
      if (drawn >= maxLines - 1) {
        ctx.fillText(word + '…', x, y);
        y += lineHeight;
        return y;
      }
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function useVRInfoPanel({
  viewerRef,
  visible,
  title,
  description,
  listHeader,
  lines = [],
  onClose,
  dwellTime = 1500,
  distance = 2.0,
  panelWidth = 1.6,
  panelHeight = 1.0,
}: VRInfoPanelOptions) {
  const frameIdRef = useRef<number>(0);
  const groupRef = useRef<THREE.Group | null>(null);
  const closeBtnRef = useRef<THREE.Mesh | null>(null);
  const dwellStartRef = useRef<number>(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const onCloseRef = useRef(onClose);
  const currentProgressRef = useRef<number>(-1);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // ---------- texture builders ----------
  const buildPanelTexture = useCallback((): THREE.CanvasTexture => {
    const W = 1024;
    const H = 720;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, W, H);
    drawRoundedRect(ctx, 4, 4, W - 8, H - 8, ROUNDED_RADIUS);
    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // ✅ Office name as title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.textBaseline = 'top';
    const safeTitle = title.length > 38 ? title.slice(0, 38) + '…' : title;
    ctx.fillText(safeTitle, 48, 36);

    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, 104);
    ctx.lineTo(W - 48, 104);
    ctx.stroke();

    let y = 128;

    // Description (optional) — maliit na text
    if (description) {
      ctx.font = '26px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      y = wrapText(ctx, description, 48, y, W - 96, 34, 3);
      y += 16;
    }

    // ✅ "List of Services" heading
    if (listHeader && lines.length > 0) {
      ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#fbbf24'; // amber-400
      ctx.fillText(listHeader, 48, y);
      // Small underline
      const headerWidth = ctx.measureText(listHeader).width;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(48, y + 40);
      ctx.lineTo(48 + headerWidth, y + 40);
      ctx.stroke();

      y += 68;
    }

    // ✅ Services list — orange bullets
    if (lines.length > 0) {
      ctx.font = '26px system-ui, -apple-system, sans-serif';
      const lineSpacing = 40;
      const maxRows = Math.min(
        lines.length,
        Math.floor((H - y - 30) / lineSpacing)
      );
      for (let i = 0; i < maxRows; i++) {
        // Bullet dot
        ctx.fillStyle = 'rgba(249, 115, 22, 1)';
        ctx.beginPath();
        ctx.arc(58, y + 14, 6, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        const txt =
          lines[i].length > 60 ? lines[i].slice(0, 60) + '…' : lines[i];
        ctx.fillText(txt, 84, y);
        y += lineSpacing;
      }
      // Show "+N more" kung hindi kasya lahat
      if (lines.length > maxRows) {
        ctx.font = 'italic 22px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
        ctx.fillText(`+${lines.length - maxRows} more`, 84, y);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }, [title, description, listHeader, lines]);

  const buildCloseTexture = useCallback((progress: number): THREE.CanvasTexture => {
    const S = 128;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, S, S);

    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (progress > 0) {
      ctx.beginPath();
      ctx.arc(
        S / 2,
        S / 2,
        S / 2 - 8,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2
      );
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(44, 44);
    ctx.lineTo(84, 84);
    ctx.moveTo(84, 44);
    ctx.lineTo(44, 84);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const disposeGroup = useCallback((group: THREE.Group) => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          const mat = m as THREE.MeshBasicMaterial;
          if (mat.map) mat.map.dispose();
          mat.dispose();
        });
      }
    });
  }, []);

  // ---------- main effect ----------
  useEffect(() => {
    const camera = viewerRef.current?.getCamera?.();
    const scene = viewerRef.current?.getScene?.();
    if (!camera || !scene) return;

    if (groupRef.current) {
      scene.remove(groupRef.current);
      disposeGroup(groupRef.current);
      groupRef.current = null;
      closeBtnRef.current = null;
    }
    currentProgressRef.current = -1;
    dwellStartRef.current = 0;

    if (!visible) return;

    camera.updateMatrixWorld(true);

    const group = new THREE.Group();

    const panelTex = buildPanelTexture();
    const panelMat = new THREE.MeshBasicMaterial({
      map: panelTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(panelWidth, panelHeight),
      panelMat
    );
    panel.renderOrder = 1000;
    group.add(panel);

    const closeTex = buildCloseTexture(0);
    const closeMat = new THREE.MeshBasicMaterial({
      map: closeTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const closeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.18),
      closeMat
    );
    closeMesh.position.set(
      panelWidth / 2 - 0.11,
      panelHeight / 2 - 0.11,
      0.001
    );
    closeMesh.renderOrder = 1001;
    group.add(closeMesh);
    closeBtnRef.current = closeMesh;

    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    camera.getWorldDirection(camDir);

    group.position.copy(camPos).addScaledVector(camDir, distance);
    group.position.y -= 0.05;
    group.lookAt(camPos);

    scene.add(group);
    groupRef.current = group;

    const raycaster = raycasterRef.current;
    const screenCenter = new THREE.Vector2(0, 0);

    const updateCloseTex = (progress: number) => {
      if (!closeBtnRef.current) return;
      if (
        Math.abs(progress - currentProgressRef.current) < 0.02 &&
        progress > 0 &&
        progress < 1
      ) {
        return;
      }
      currentProgressRef.current = progress;
      const mat = closeBtnRef.current.material as THREE.MeshBasicMaterial;
      const oldTex = mat.map;
      mat.map = buildCloseTexture(progress);
      mat.needsUpdate = true;
      if (oldTex && oldTex !== mat.map) oldTex.dispose();
    };

    const tick = (now: number) => {
      if (!groupRef.current || !closeBtnRef.current) return;

      raycaster.setFromCamera(screenCenter, camera);
      const hits = raycaster.intersectObject(closeBtnRef.current, false);

      if (hits.length > 0) {
        if (dwellStartRef.current === 0) {
          dwellStartRef.current = now;
        }
        const elapsed = now - dwellStartRef.current;
        const progress = Math.min(elapsed / dwellTime, 1);
        updateCloseTex(progress);

        if (progress >= 1) {
          dwellStartRef.current = 0;
          onCloseRef.current?.();
          return;
        }
      } else {
        if (dwellStartRef.current !== 0) {
          dwellStartRef.current = 0;
          updateCloseTex(0);
        }
      }

      frameIdRef.current = requestAnimationFrame(tick);
    };

    frameIdRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      if (groupRef.current) {
        scene.remove(groupRef.current);
        disposeGroup(groupRef.current);
      }
      groupRef.current = null;
      closeBtnRef.current = null;
      dwellStartRef.current = 0;
      currentProgressRef.current = -1;
    };
  }, [
    visible,
    viewerRef,
    buildPanelTexture,
    buildCloseTexture,
    disposeGroup,
    panelWidth,
    panelHeight,
    distance,
    dwellTime,
  ]);

  return { isVisible: visible && !!groupRef.current };
}