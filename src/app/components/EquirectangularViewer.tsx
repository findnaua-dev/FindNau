import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface HotspotData {
  id?: string;
  longitude: number;
  latitude: number;
  type: string;
  label: string;
  color?: string;
  description?: string;
  targetSceneId?: string;
  targetOfficeId?: string;
  shape?: 'circle' | 'square' | 'diamond' | 'hexagon' | 'rounded' | 'arrow';
  size?: number;
  direction?: number;
}

interface ViewerProps {
  sceneUrl: string;
  hotspots?: HotspotData[];
  onHotspotGaze?: (hotspot: HotspotData) => void;
  onHotspotClick?: (hotspot: HotspotData) => void;
  onClickScene?: (lon: number, lat: number) => void;
  onDropScene?: (lon: number, lat: number, targetSceneId: string) => void;
  onHotspotMove?: (hotspotId: string, newLon: number, newLat: number) => void;
  onHotspotMoveEnd?: (hotspotId: string, newLon: number, newLat: number) => void;
  onReticleHit?: (hotspot: HotspotData | null) => void;
  enableClickToPlace?: boolean;
  enableReticle?: boolean;
  isAdmin?: boolean;
  onSceneChange?: (direction: number) => void;
  currentIndex?: number;
  totalScenes?: number;
  brightness?: number;
  onVRReady?: () => void;
  gazeTimeout?: number;
  showReticle?: boolean;
  preloadUrls?: string[];
  onRotate?: (degrees: number) => void;
  /** Path points in {lon, lat} format */
  pathPoints?: { lon: number; lat: number }[] | null;
}

export interface EquirectangularViewerHandle {
  enterVR: () => Promise<void>;
  exitVR: () => Promise<void>;
  isVRActive: () => boolean;
  setDirection: (degrees: number) => void;
  getCamera?: () => THREE.PerspectiveCamera | null;
  getRenderer?: () => THREE.WebGLRenderer | null;
  getScene?: () => THREE.Scene | null;
  getControls?: () => OrbitControls | null;
}

// ===== TAMANG MAPPING PARA SA FLIPPED SPHERE =====
// Nag-flip tayo ng sphere gamit ang scale.x = -1 para mawala ang mirroring.
// Ito ang katumbas na conversion mula lat/lon papuntang 3D position.
const latLonToPosition = (lat: number, lon: number, radius = 10): THREE.Vector3 => {
  const phi = THREE.MathUtils.degToRad(90 - lat); // polar angle mula sa Y axis
  const theta = THREE.MathUtils.degToRad(lon);     // azimuth angle (0 = harap)
  return new THREE.Vector3(
    radius * Math.sin(theta) * Math.sin(phi), // x
    radius * Math.cos(phi),                  // y
    -radius * Math.cos(theta) * Math.sin(phi) // z
  );
};

const textureCache = new Map<string, THREE.Texture>();
const DRAG_THRESHOLD = 5;

const EquirectangularViewer = forwardRef<EquirectangularViewerHandle, ViewerProps>(
  (
    {
      sceneUrl,
      hotspots = [],
      onHotspotGaze,
      onHotspotClick,
      onClickScene,
      onDropScene,
      onHotspotMove,
      onHotspotMoveEnd,
      onReticleHit,
      enableClickToPlace = false,
      enableReticle = false,
      isAdmin = false,
      onSceneChange,
      currentIndex,
      totalScenes,
      brightness = 1,
      onVRReady,
      gazeTimeout = 5000,
      showReticle = false,
      preloadUrls = [],
      onRotate,
      pathPoints = null,
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sphereRef = useRef<THREE.Mesh | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const hotspotsGroupRef = useRef<THREE.Group>(new THREE.Group());
    const pathLineRef = useRef<THREE.Line | null>(null);

    const vrActiveRef = useRef(false);
    const vrSessionRef = useRef<XRSession | null>(null);

    const draggedSpriteRef = useRef<THREE.Sprite | null>(null);
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
    const dragMoved = useRef(false);
    const isDraggingOverlayRef = useRef(false);
    const lastDragPos = useRef<{ lon: number; lat: number } | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [vrActive, setVrActive] = useState(false);
    const [transitionActive, setTransitionActive] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const onDropSceneRef = useRef(onDropScene);
    useEffect(() => {
      onDropSceneRef.current = onDropScene;
    }, [onDropScene]);

    const onRotateRef = useRef(onRotate);
    useEffect(() => {
      onRotateRef.current = onRotate;
    }, [onRotate]);

    const lastEmittedDegRef = useRef(0);

    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
      vrActiveRef.current = vrActive;
    }, [vrActive]);

    useImperativeHandle(ref, () => ({
      async enterVR() {
        const renderer = rendererRef.current;
        if (!renderer?.xr) return;
        try {
          const session = await (navigator as any).xr?.requestSession('immersive-vr', {
            requiredFeatures: ['local-floor'],
          });
          if (session) {
            renderer.xr.setSession(session);
            vrSessionRef.current = session;
            setVrActive(true);
            onVRReady?.();
            session.addEventListener('end', () => {
              vrSessionRef.current = null;
              setVrActive(false);
              if (controlsRef.current) controlsRef.current.enabled = true;
            });
          }
        } catch (err) {
          console.log('VR not available');
        }
      },
      async exitVR() {
        await vrSessionRef.current?.end();
      },
      isVRActive: () => vrActive,
      setDirection: (degrees: number) => {
        const controls = controlsRef.current;
        if (!controls) return;
        const rad = THREE.MathUtils.degToRad(degrees);
        controls.spherical.theta = rad;
        controls.update();
        lastEmittedDegRef.current = degrees;
      },
      getCamera: () => cameraRef.current,
      getRenderer: () => rendererRef.current,
      getScene: () => sceneRef.current,
      getControls: () => controlsRef.current,
    }));

    // Main scene setup
    useEffect(() => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(0, 0, 0.1);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.xr.enabled = true;
      mountRef.current.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.rotateSpeed = -0.3;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(0, 0, -1);
      controlsRef.current = controls;

      const geometry = new THREE.SphereGeometry(10, 64, 32);
      const sphere = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
      );
      // ===== MAHALAGA: I-flip ang sphere para mawala ang mirroring =====
      sphere.scale.x = -1;
      scene.add(sphere);
      sphereRef.current = sphere;

      scene.add(hotspotsGroupRef.current);

      // Create an empty line for the path
      const lineMaterial = new THREE.LineBasicMaterial({ color: '#F97316', linewidth: 2 });
      const lineGeometry = new THREE.BufferGeometry();
      const pathLine = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(pathLine);
      pathLineRef.current = pathLine;

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;

      const animate = () => {
        if (!vrActiveRef.current && !isDraggingOverlayRef.current) {
          controls.update();
          if (onRotateRef.current) {
            const az = controls.getAzimuthalAngle();
            let deg = THREE.MathUtils.radToDeg(az);
            deg = ((deg + 180) % 360 + 360) % 360 - 180;
            if (Math.abs(deg - lastEmittedDegRef.current) > 1) {
              lastEmittedDegRef.current = deg;
              onRotateRef.current(deg);
            }
          }
        }
        renderer.render(scene, camera);
        if (enableReticle && !vrActiveRef.current) detectReticle();
      };

      renderer.setAnimationLoop(animate);

      const handleResize = () => {
        if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(mountRef.current);

      return () => {
        resizeObserver.disconnect();
        renderer.setAnimationLoop(null);
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
        if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
      };
    }, [enableReticle]);

    // Load the 360 texture
    useEffect(() => {
      if (!sphereRef.current) return;
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');

      if (!sceneUrl) {
        const mat = sphereRef.current.material as THREE.MeshBasicMaterial;
        mat.map = null;
        mat.color.set(0x000000);
        mat.needsUpdate = true;
        setIsLoading(false);
        setLoadError(true);
        return;
      }

      const loadWithRetry = (url: string, attempt = 0): Promise<THREE.Texture> =>
        new Promise((resolve, reject) => {
          const cached = textureCache.get(url);
          if (cached) return resolve(cached);
          loader.load(
            url,
            (t) => {
              textureCache.set(url, t);
              resolve(t);
            },
            undefined,
            () => {
              if (attempt < 2)
                setTimeout(() => resolve(loadWithRetry(url, attempt + 1)), 1000 * (attempt + 1));
              else reject(new Error('Failed'));
            }
          );
        });

      setIsLoading(true);
      setLoadError(false);
      loadWithRetry(sceneUrl)
        .then((texture) => {
          const mat = sphereRef.current!.material as THREE.MeshBasicMaterial;
          mat.map = texture;
          mat.color.setScalar(brightness);
          mat.needsUpdate = true;
          setIsLoading(false);
          setTransitionActive(true);
          setTimeout(() => setTransitionActive(false), 300);
        })
        .catch(() => {
          setIsLoading(false);
          setLoadError(true);
        });
    }, [sceneUrl, brightness]);

    // Update the 3D path line when pathPoints changes
    useEffect(() => {
      const line = pathLineRef.current;
      if (!line) return;

      if (!pathPoints || pathPoints.length < 2) {
        line.visible = false;
        return;
      }

      const points: THREE.Vector3[] = pathPoints.map((p) => {
        return latLonToPosition(p.lat, p.lon, 9.8);
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      line.geometry.dispose();
      line.geometry = geometry;
      line.visible = true;
    }, [pathPoints]);

    // Hotspots update
    useEffect(() => {
      const group = hotspotsGroupRef.current;
      while (group.children.length) {
        const child = group.children[0];
        if (child instanceof THREE.Sprite) {
          (child.material as THREE.SpriteMaterial).map?.dispose();
          child.material.dispose();
        }
        group.remove(child);
      }

      hotspots.forEach((h) => {
        const pos = latLonToPosition(h.latitude, h.longitude, 9.8);
        const size = h.size || 1;
        const canvas = document.createElement('canvas');
        const baseSize = 32;
        canvas.width = baseSize * size;
        canvas.height = baseSize * size;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        const direction = h.direction || 0;
        if (h.shape === 'arrow' && direction !== 0) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(THREE.MathUtils.degToRad(direction));
          ctx.translate(-cx, -cy);
        }

        ctx.beginPath();
        ctx.arc(cx, cy, (baseSize / 2 - 2) * size, 0, 2 * Math.PI);
        ctx.fillStyle = h.color || '#F97316';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 * size;
        ctx.stroke();

        const shape = h.shape || 'circle';
        const iconSize = baseSize * 0.3 * size;
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 * size;

        switch (shape) {
          case 'square':
            ctx.fillRect(cx - iconSize, cy - iconSize, iconSize * 2, iconSize * 2);
            break;
          case 'diamond':
            ctx.beginPath();
            ctx.moveTo(cx, cy - iconSize);
            ctx.lineTo(cx + iconSize, cy);
            ctx.lineTo(cx, cy + iconSize);
            ctx.lineTo(cx - iconSize, cy);
            ctx.closePath();
            ctx.fill();
            break;
          case 'hexagon':
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (Math.PI / 3) * i - Math.PI / 6;
              const x = cx + iconSize * Math.cos(a);
              const y = cy + iconSize * Math.sin(a);
              i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            break;
          case 'rounded':
            ctx.beginPath();
            ctx.roundRect(cx - iconSize, cy - iconSize, iconSize * 2, iconSize * 2, iconSize * 0.3);
            ctx.fill();
            break;
          case 'arrow':
            ctx.beginPath();
            ctx.moveTo(cx, cy - iconSize);
            ctx.lineTo(cx + iconSize, cy);
            ctx.lineTo(cx + iconSize * 0.4, cy);
            ctx.lineTo(cx + iconSize * 0.4, cy + iconSize);
            ctx.lineTo(cx - iconSize * 0.4, cy + iconSize);
            ctx.lineTo(cx - iconSize * 0.4, cy);
            ctx.lineTo(cx - iconSize, cy);
            ctx.closePath();
            ctx.fill();
            break;
          default:
            ctx.beginPath();
            ctx.arc(cx, cy, iconSize, 0, 2 * Math.PI);
            ctx.fill();
        }

        if (h.shape === 'arrow') {
          ctx.restore();
        }

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(pos);
        sprite.scale.set(0.4 * size, 0.4 * size, 1);
        sprite.userData = { hotspot: h };
        group.add(sprite);
      });
    }, [hotspots]);

    // Reticle detection (non-VR mode)
    const detectReticle = () => {
      if (!cameraRef.current || !onReticleHit) return;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
      const hits = raycaster.intersectObjects(hotspotsGroupRef.current.children);
      if (hits.length > 0) {
        onReticleHit((hits[0].object as THREE.Sprite).userData.hotspot);
      } else {
        onReticleHit(null);
      }
    };

    // Pointer and drag handlers
    useEffect(() => {
      const container = mountRef.current!;
      if (!container) return;
      const canvas = rendererRef.current?.domElement;
      if (!canvas) return;

      const getCoords = (e: MouseEvent | TouchEvent) => {
        let clientX: number, clientY: number;
        if ('touches' in e) {
          if ((e as TouchEvent).touches.length === 0) return null;
          clientX = (e as TouchEvent).touches[0].clientX;
          clientY = (e as TouchEvent).touches[0].clientY;
        } else {
          clientX = (e as MouseEvent).clientX;
          clientY = (e as MouseEvent).clientY;
        }
        return { clientX, clientY };
      };

      const onPointerDown = (e: MouseEvent | TouchEvent) => {
        dragMoved.current = false;
        const coords = getCoords(e);
        if (!coords) return;
        pointerDownPos.current = { x: coords.clientX, y: coords.clientY };

        if (isAdmin && onHotspotMove) {
          const rect = canvas.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((coords.clientX - rect.left) / rect.width) * 2 - 1,
            -((coords.clientY - rect.top) / rect.height) * 2 + 1
          );
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, cameraRef.current!);
          const hits = raycaster.intersectObjects(hotspotsGroupRef.current.children);
          if (hits.length > 0) {
            draggedSpriteRef.current = hits[0].object as THREE.Sprite;
            isDraggingOverlayRef.current = true;
            lastDragPos.current = { lon: 0, lat: 0 };
            e.preventDefault();
            return;
          }
        }
      };

      const onPointerMove = (e: MouseEvent | TouchEvent) => {
        if (draggedSpriteRef.current) {
          e.preventDefault();
          const coords = getCoords(e);
          if (!coords) return;
          const rect = canvas.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((coords.clientX - rect.left) / rect.width) * 2 - 1,
            -((coords.clientY - rect.top) / rect.height) * 2 + 1
          );
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, cameraRef.current!);
          const intersects = raycaster.intersectObject(sphereRef.current!);
          if (intersects.length > 0) {
            const point = intersects[0].point.clone().normalize();
            // ===== TAMANG INVERSE FORMULA =====
            const lat = 90 - Math.acos(point.y) * (180 / Math.PI);
            const lon = Math.atan2(point.x, -point.z) * (180 / Math.PI);
            lastDragPos.current = { lon, lat };
            onHotspotMove?.(draggedSpriteRef.current.userData.hotspot.id, lon, lat);
          }
          return;
        }

        if (pointerDownPos.current) {
          const coords = getCoords(e);
          if (!coords) return;
          const dx = coords.clientX - pointerDownPos.current.x;
          const dy = coords.clientY - pointerDownPos.current.y;
          if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            dragMoved.current = true;
          }
        }
      };

      const onPointerUp = (e: MouseEvent | TouchEvent) => {
        if (draggedSpriteRef.current) {
          if (onHotspotMoveEnd && lastDragPos.current) {
            onHotspotMoveEnd(
              draggedSpriteRef.current.userData.hotspot.id,
              lastDragPos.current.lon,
              lastDragPos.current.lat
            );
          }
          draggedSpriteRef.current = null;
          isDraggingOverlayRef.current = false;
          lastDragPos.current = null;
          return;
        }

        if (!dragMoved.current && pointerDownPos.current) {
          const coords = getCoords(e);
          if (!coords) {
            pointerDownPos.current = null;
            return;
          }
          const rect = canvas.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((coords.clientX - rect.left) / rect.width) * 2 - 1,
            -((coords.clientY - rect.top) / rect.height) * 2 + 1
          );
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, cameraRef.current!);

          const spriteHits = raycaster.intersectObjects(hotspotsGroupRef.current.children);
          if (spriteHits.length > 0) {
            onHotspotClick?.((spriteHits[0].object as THREE.Sprite).userData.hotspot);
            pointerDownPos.current = null;
            return;
          }

          if (enableClickToPlace && onClickScene && sphereRef.current) {
            const sphereHits = raycaster.intersectObject(sphereRef.current);
            if (sphereHits.length > 0) {
              const point = sphereHits[0].point.clone().normalize();
              // ===== TAMANG INVERSE FORMULA =====
              const lat = 90 - Math.acos(point.y) * (180 / Math.PI);
              const lon = Math.atan2(point.x, -point.z) * (180 / Math.PI);
              onClickScene(lon, lat);
            }
          }
        }
        pointerDownPos.current = null;
        dragMoved.current = false;
      };

      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      };
      const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onDropSceneRef.current) return;
        const sceneId = e.dataTransfer?.getData('text/plain');
        if (!sceneId) return;
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current!);
        const intersects = raycaster.intersectObject(sphereRef.current!);
        if (intersects.length > 0) {
          const point = intersects[0].point.clone().normalize();
          // ===== TAMANG INVERSE FORMULA =====
          const lat = 90 - Math.acos(point.y) * (180 / Math.PI);
          const lon = Math.atan2(point.x, -point.z) * (180 / Math.PI);
          onDropSceneRef.current(lon, lat, sceneId);
        }
      };

      container.addEventListener('dragover', handleDragOver);
      container.addEventListener('drop', handleDrop);
      canvas.addEventListener('mousedown', onPointerDown);
      canvas.addEventListener('touchstart', onPointerDown, { passive: false });
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchend', onPointerUp);

      return () => {
        container.removeEventListener('dragover', handleDragOver);
        container.removeEventListener('drop', handleDrop);
        canvas.removeEventListener('mousedown', onPointerDown);
        canvas.removeEventListener('touchstart', onPointerDown);
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchend', onPointerUp);
      };
    }, [isAdmin, onHotspotClick, onClickScene, enableClickToPlace, onHotspotMove, onHotspotMoveEnd]);

    // Gaze-based hotspot triggering (non-VR)
    useEffect(() => {
      if (!showReticle || !onHotspotGaze) return;
      let frame: number;
      const raycaster = new THREE.Raycaster();
      let start = 0,
        current: HotspotData | null = null;
      const check = () => {
        if (!cameraRef.current) return;
        raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
        const hits = raycaster.intersectObjects(hotspotsGroupRef.current.children);
        if (hits.length > 0) {
          const h = (hits[0].object as THREE.Sprite).userData.hotspot;
          if (current?.id !== h.id) {
            current = h;
            start = performance.now();
          }
          const progress = Math.min((performance.now() - start) / gazeTimeout, 1);
          if (progress >= 1) {
            onHotspotGaze(h);
            current = null;
            start = 0;
          }
        } else {
          current = null;
          start = 0;
        }
        frame = requestAnimationFrame(check);
      };
      frame = requestAnimationFrame(check);
      return () => cancelAnimationFrame(frame);
    }, [showReticle, onHotspotGaze, gazeTimeout, hotspots]);

    // Retry loading
    const retryLoad = () => {
      textureCache.delete(sceneUrl);
      setIsLoading(true);
      setLoadError(false);
      if (sphereRef.current) {
        (sphereRef.current.material as THREE.MeshBasicMaterial).color.setScalar(brightness + 0.01);
      }
    };

    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        mountRef.current?.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    };

    const showReticleUI = enableReticle && !isLoading && !loadError;

    return (
      <div ref={mountRef} className="relative w-full h-full bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20 pointer-events-none">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white text-sm">Loading 360° view…</p>
            </div>
          </div>
        )}
        {loadError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <div className="text-center text-white">
              <p className="text-lg font-semibold mb-1">Image failed to load</p>
              <p className="text-xs text-gray-400 mb-3">Check the URL or network connection.</p>
              <button
                onClick={retryLoad}
                className="px-4 py-2 bg-white text-black rounded-lg text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <div
          className="absolute inset-0 bg-black z-10 pointer-events-none transition-opacity duration-300"
          style={{ opacity: transitionActive ? 0.3 : 0 }}
        />
        {showReticleUI && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <line x1="16" y1="2" x2="16" y2="10" stroke="white" strokeWidth="1.5" opacity="0.9" />
              <line x1="16" y1="22" x2="16" y2="30" stroke="white" strokeWidth="1.5" opacity="0.9" />
              <line x1="2" y1="16" x2="10" y2="16" stroke="white" strokeWidth="1.5" opacity="0.9" />
              <line x1="22" y1="16" x2="30" y2="16" stroke="white" strokeWidth="1.5" opacity="0.9" />
            </svg>
          </div>
        )}
        {isAdmin && onSceneChange && !isLoading && !loadError && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-center z-10 gap-2">
            <button
              onClick={() => onSceneChange(-1)}
              className="bg-black/60 text-white px-3 py-1.5 rounded-full text-sm hover:bg-black/80"
            >
              Prev
            </button>
            <span className="text-white bg-black/60 px-3 py-1 rounded-full text-sm">
              {currentIndex! + 1} / {totalScenes}
            </span>
            <button
              onClick={() => onSceneChange(1)}
              className="bg-black/60 text-white px-3 py-1.5 rounded-full text-sm hover:bg-black/80"
            >
              Next
            </button>
          </div>
        )}
        {!isAdmin && !isLoading && !loadError && (
          <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center shadow-lg"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default EquirectangularViewer;