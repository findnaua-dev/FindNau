import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { EquirectangularViewerHandle } from '../app/components/EquirectangularViewer';

interface Hotspot {
  id?: string;
  longitude: number;
  latitude: number;
  position?: THREE.Vector3 | { x: number; y: number; z: number };
  [key: string]: any;
}

interface VRGazeOptions {
  viewerRef: React.RefObject<EquirectangularViewerHandle | null>;
  vrMode: boolean;
  hotspots: Hotspot[];
  onReticleHit: (hotspot: Hotspot | null) => void;
  onHotspotGaze: (hotspot: Hotspot) => void;
  gazeTimeout?: number;
  processingDelay?: number;
  sceneId?: string | number;
  reticleSize?: number;
  sceneChangeScale?: number;
  scaleAnimDuration?: number;
  gazeAngleThreshold?: number;
  defaultGazeDistance?: number;
  dwellTolerance?: number;
}

// ===== IMPORTANT: This formula must match the one in EquirectangularViewer =====
// The sphere is flipped with scale.x = -1, so we use the exact same mapping.
const latLonToPosition = (lat: number, lon: number, radius = 9.8): THREE.Vector3 => {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    radius * Math.sin(theta) * Math.sin(phi), // x
    radius * Math.cos(phi),                  // y
    -radius * Math.cos(theta) * Math.sin(phi) // z
  );
};

const DESIRED_ANGULAR_SIZE = 0.035;
const RETICLE_OFFSET = 0.15;

export function useVRGaze({
  viewerRef,
  vrMode,
  hotspots,
  onReticleHit,
  onHotspotGaze,
  gazeTimeout = 3000,
  processingDelay = 1000,
  sceneId,
  reticleSize = 0.06,
  sceneChangeScale = 1.5,
  scaleAnimDuration = 400,
  gazeAngleThreshold = 8,
  defaultGazeDistance = 2.0,
  dwellTolerance = 5,
}: VRGazeOptions) {
  const frameIdRef = useRef<number>(0);
  const dwellStartRef = useRef<number>(0);
  const currentHotspotRef = useRef<Hotspot | null>(null);
  const reticleRef = useRef<THREE.Sprite | null>(null);
  const ringRef = useRef<THREE.Sprite | null>(null);
  const processingRef = useRef<boolean>(false);
  const processingStartRef = useRef<number>(0);
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialHitAngleRef = useRef<number>(0);

  const [processing, setProcessing] = useState(false);

  const hotspotsRef = useRef<Hotspot[]>(hotspots);
  const onReticleHitRef = useRef(onReticleHit);
  const onHotspotGazeRef = useRef(onHotspotGaze);
  const gazeTimeoutRef = useRef(gazeTimeout);
  const processingDelayRef = useRef(processingDelay);
  const gazeThresholdRadRef = useRef(gazeAngleThreshold * Math.PI / 180);
  const dwellToleranceRadRef = useRef(dwellTolerance * Math.PI / 180);
  const defaultGazeDistanceRef = useRef(defaultGazeDistance);

  useEffect(() => {
    hotspotsRef.current = hotspots;
  }, [hotspots]);

  useEffect(() => {
    onReticleHitRef.current = onReticleHit;
  }, [onReticleHit]);

  useEffect(() => {
    onHotspotGazeRef.current = onHotspotGaze;
  }, [onHotspotGaze]);

  useEffect(() => {
    gazeTimeoutRef.current = gazeTimeout;
    processingDelayRef.current = processingDelay;
    gazeThresholdRadRef.current = gazeAngleThreshold * Math.PI / 180;
    dwellToleranceRadRef.current = dwellTolerance * Math.PI / 180;
    defaultGazeDistanceRef.current = defaultGazeDistance;
  }, [gazeTimeout, processingDelay, gazeAngleThreshold, dwellTolerance, defaultGazeDistance]);

  const createDotTexture = useCallback((size = 14) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, size + 10);
    gradient.addColorStop(0, 'rgba(255, 60, 60, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 40, 40, 0.95)');
    gradient.addColorStop(0.7, 'rgba(255, 20, 20, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.beginPath();
    ctx.arc(32, 32, size + 10, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(32, 32, size * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 50, 50, 0.95)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(32, 32, size * 0.2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // ✅ FIX: Removed the always-on green radial-gradient halo that was
  //    bleeding into the stereo seam as a white line.
  const createRingTexture = useCallback((progress = 0, color = '#4ade80', isProcessing = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);

    const centerX = 32, centerY = 32, radius = 22;
    const startAngle = -Math.PI / 2;

    if (isProcessing) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(245,158,11,0.8)';
      ctx.shadowBlur = 20;
      ctx.stroke();
    } else if (progress > 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + Math.min(progress, 1) * Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(74,222,128,0.6)';
      ctx.shadowBlur = 12;
      ctx.stroke();

      if (progress < 1) {
        const tipAngle = startAngle + progress * Math.PI * 2;
        const tipX = centerX + radius * Math.cos(tipAngle);
        const tipY = centerY + radius * Math.sin(tipAngle);
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(74,222,128,0.9)';
        ctx.fill();
      }
    }
    // progress === 0 && !isProcessing → canvas stays fully transparent

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // ✅ FIX: Hide ring when nothing is being dwelt on
  const updateRing = useCallback((progress: number, isProcessing = false) => {
    if (!ringRef.current) return;

    if (progress === 0 && !isProcessing) {
      ringRef.current.visible = false;
      return;
    }

    ringRef.current.visible = true;

    const oldTex = ringRef.current.material.map;
    const color = isProcessing ? '#f59e0b' : '#4ade80';
    const tex = createRingTexture(progress, color, isProcessing);
    ringRef.current.material.map = tex;
    ringRef.current.material.needsUpdate = true;
    if (oldTex && oldTex !== tex) oldTex.dispose();
  }, [createRingTexture]);

  const getHotspotPosition = useCallback((hotspot: Hotspot): THREE.Vector3 | null => {
    if (hotspot.position) {
      if (hotspot.position instanceof THREE.Vector3) return hotspot.position.clone();
      return new THREE.Vector3(hotspot.position.x, hotspot.position.y, hotspot.position.z);
    }
    if (hotspot.latitude !== undefined && hotspot.longitude !== undefined) {
      return latLonToPosition(hotspot.latitude, hotspot.longitude);
    }
    return null;
  }, []);

  const completeProcessing = useCallback(() => {
    processingRef.current = false;
    setProcessing(false);
    currentHotspotRef.current = null;
    dwellStartRef.current = 0;
    initialHitAngleRef.current = 0;
    updateRing(0, false);
    onReticleHitRef.current?.(null);
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
  }, [updateRing]);

  const scaleByDistance = useCallback((position: THREE.Vector3, camera: THREE.Camera) => {
    const dist = camera.position.distanceTo(position);
    return Math.max(0.01, dist * Math.tan(DESIRED_ANGULAR_SIZE));
  }, []);

  useEffect(() => {
    if (!vrMode) {
      // Reset state when leaving VR
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      processingRef.current = false;
      setProcessing(false);
      currentHotspotRef.current = null;
      dwellStartRef.current = 0;
      initialHitAngleRef.current = 0;
      return;
    }

    const camera = viewerRef.current?.getCamera?.();
    const scene = viewerRef.current?.getScene?.();
    const controls = viewerRef.current?.getControls?.();

    if (!camera || !scene) return;

    // Disable OrbitControls while in VR
    if (controls) controls.enabled = false;

    // Create reticle dot
    const dotTex = createDotTexture(14);
    const dotMat = new THREE.SpriteMaterial({
      map: dotTex,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.NormalBlending, // ✅ changed from Additive — reduces seam bleed
    });
    const reticle = new THREE.Sprite(dotMat);
    reticle.renderOrder = 999;
    scene.add(reticle);
    reticleRef.current = reticle;

    // Create progress ring
    const ringTex = createRingTexture(0);
    const ringMat = new THREE.SpriteMaterial({
      map: ringTex,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.NormalBlending, // ✅ changed from Additive — reduces seam bleed
    });
    const ring = new THREE.Sprite(ringMat);
    ring.renderOrder = 998;
    ring.visible = false; // ✅ starts hidden — no white line until dwelling
    scene.add(ring);
    ringRef.current = ring;

    const raycaster = new THREE.Raycaster();

    const checkGaze = () => {
      const now = performance.now();

      if (processingRef.current) {
        if (ringRef.current) {
          ringRef.current.visible = true;
          ringRef.current.material.rotation += 0.08;
          updateRing(1, true);
        }
        frameIdRef.current = requestAnimationFrame(checkGaze);
        return;
      }

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const camPos = camera.position;

      const currentHotspots = hotspotsRef.current;
      let hitHotspot: Hotspot | null = null;
      let hitAngle = Infinity;

      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const targets: THREE.Object3D[] = [];
      scene.traverse((obj: THREE.Object3D) => {
        if (obj.userData?.hotspot && (obj instanceof THREE.Sprite || obj instanceof THREE.Mesh)) {
          targets.push(obj);
        }
      });

      if (targets.length > 0) {
        const hits = raycaster.intersectObjects(targets, false);
        if (hits.length > 0) {
          hitHotspot = hits[0].object.userData.hotspot;
          if (hitHotspot) {
            const pos = getHotspotPosition(hitHotspot);
            if (pos) {
              const dir = new THREE.Vector3().copy(pos).sub(camPos).normalize();
              hitAngle = forward.angleTo(dir);
            }
          }
        }
      }

      // Fallback: angle-based detection for sprites that may not be raycasted correctly
      if (!hitHotspot && currentHotspots.length > 0) {
        const dirToHotspot = new THREE.Vector3();
        let closestAngle = Infinity;
        let closestHotspot: Hotspot | null = null;

        for (const h of currentHotspots) {
          const pos = getHotspotPosition(h);
          if (!pos) continue;
          dirToHotspot.copy(pos).sub(camPos).normalize();
          const angle = forward.angleTo(dirToHotspot);
          const threshold = currentHotspotRef.current?.id === h.id
            ? gazeThresholdRadRef.current + dwellToleranceRadRef.current
            : gazeThresholdRadRef.current;
          if (angle < threshold && angle < closestAngle) {
            closestAngle = angle;
            closestHotspot = h;
          }
        }
        if (closestHotspot) {
          hitHotspot = closestHotspot;
          hitAngle = closestAngle;
        }
      }

      // Determine reticle position
      let reticlePos: THREE.Vector3;
      if (hitHotspot) {
        const pos = getHotspotPosition(hitHotspot);
        if (pos) {
          reticlePos = pos.clone().sub(camPos).normalize().multiplyScalar(-RETICLE_OFFSET).add(pos);
        } else {
          reticlePos = camPos.clone().add(forward.clone().multiplyScalar(defaultGazeDistanceRef.current));
        }
      } else {
        const allObjects: THREE.Object3D[] = [];
        scene.traverse((obj: THREE.Object3D) => {
          if (obj instanceof THREE.Mesh && obj.visible) allObjects.push(obj);
        });
        const sceneHits = raycaster.intersectObjects(allObjects, false);
        reticlePos = sceneHits.length > 0
          ? sceneHits[0].point.clone()
          : camPos.clone().add(forward.clone().multiplyScalar(defaultGazeDistanceRef.current));
      }

      if (reticleRef.current) {
        reticleRef.current.position.copy(reticlePos);
        const s = scaleByDistance(reticlePos, camera);
        reticleRef.current.scale.set(s, s, 1);
      }
      if (ringRef.current) {
        ringRef.current.position.copy(reticlePos);
        const s = scaleByDistance(reticlePos, camera) * 2.4;
        ringRef.current.scale.set(s, s, 1);
        ringRef.current.material.rotation = 0;
      }

      if (hitHotspot) {
        const hot = hitHotspot;
        if (currentHotspotRef.current?.id !== hot.id) {
          currentHotspotRef.current = hot;
          dwellStartRef.current = now;
          initialHitAngleRef.current = hitAngle;
          onReticleHitRef.current?.(hot);
          updateRing(0, false);
        } else {
          const angleDiff = Math.abs(hitAngle - initialHitAngleRef.current);
          if (angleDiff <= dwellToleranceRadRef.current) {
            const elapsed = now - dwellStartRef.current;
            const progress = Math.min(elapsed / gazeTimeoutRef.current, 1);
            updateRing(progress, false);
            onReticleHitRef.current?.(hot);

            if (progress >= 1) {
              processingRef.current = true;
              setProcessing(true);
              processingStartRef.current = now;
              updateRing(1, true);
              const targetHotspot = hot;
              currentHotspotRef.current = null;
              dwellStartRef.current = 0;
              initialHitAngleRef.current = 0;
              onReticleHitRef.current?.(null);

              processingTimerRef.current = setTimeout(() => {
                onHotspotGazeRef.current?.(targetHotspot);
                completeProcessing();
              }, processingDelayRef.current);
            }
          } else {
            currentHotspotRef.current = null;
            dwellStartRef.current = 0;
            initialHitAngleRef.current = 0;
            onReticleHitRef.current?.(null);
            updateRing(0, false);
          }
        }
      } else {
        if (currentHotspotRef.current) {
          currentHotspotRef.current = null;
          dwellStartRef.current = 0;
          initialHitAngleRef.current = 0;
          onReticleHitRef.current?.(null);
        }
        updateRing(0, false);
      }

      frameIdRef.current = requestAnimationFrame(checkGaze);
    };

    frameIdRef.current = requestAnimationFrame(checkGaze);

    // ===== PROPER CLEANUP =====
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      if (reticleRef.current && scene) scene.remove(reticleRef.current);
      if (ringRef.current && scene) scene.remove(ringRef.current);
      reticleRef.current?.material?.dispose();
      ringRef.current?.material?.dispose();
      reticleRef.current = null;
      ringRef.current = null;
      if (controls) controls.enabled = true;
      processingRef.current = false;
      setProcessing(false);
      currentHotspotRef.current = null;
      dwellStartRef.current = 0;
      initialHitAngleRef.current = 0;
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
        processingTimerRef.current = null;
      }
    };
  }, [vrMode, viewerRef, createDotTexture, createRingTexture, updateRing, getHotspotPosition, completeProcessing, scaleByDistance]);

  return {
    completeProcessing,
    isProcessing: processing,
  };
}