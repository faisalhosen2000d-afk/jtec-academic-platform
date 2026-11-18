"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCcw, Play, Pause, Move3d, Eye, EyeOff, ZoomIn, ZoomOut } from "lucide-react";

export type Lab3DMode = "ply" | "wrap_reel" | "beesley";

interface Yarn3DLabProps {
  mode: Lab3DMode;
  plyCount: number;
  singleTex: number;
  activeLabel?: string;
  compareLabel?: string;
  compareSingleTex?: number;
  comparePly?: number;
  wrapTurns: number;
  wrapWeightGrains: number;
  beesleyThreads: number;
}

const PLY_COLORS = [0x22d3ee, 0xfbbf24, 0x34d399, 0xf472b6];
const CMP_COLORS = [0x94a3b8, 0x818cf8, 0xa78bfa, 0x64748b];

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
      obj.geometry.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    }
  });
}

function buildHelicalStrand(
  parent: THREE.Group,
  options: {
    yOffset: number;
    length: number;
    strandRadius: number;
    helixRadius: number;
    turns: number;
    phase: number;
    colorHex: number;
    opacity?: number;
    addFibers?: boolean;
  }
) {
  const {
    yOffset,
    length,
    strandRadius,
    helixRadius,
    turns,
    phase,
    colorHex,
    opacity = 1,
    addFibers = true,
  } = options;

  const samples = 96;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = -length / 2 + t * length;
    const angle = t * Math.PI * 2 * turns + phase;
    const y = yOffset + Math.cos(angle) * helixRadius;
    const z = Math.sin(angle) * helixRadius;
    pts.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 96, strandRadius, 18, false);
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.52,
    metalness: 0.08,
    transparent: opacity < 1,
    opacity,
  });
  parent.add(new THREE.Mesh(geo, mat));

  if (addFibers) {
    for (let f = 0; f < 2; f++) {
      const fPts: THREE.Vector3[] = [];
      const fPhase = phase + f * Math.PI;
      const fOffset = strandRadius * 0.92;
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const x = -length / 2 + t * length;
        const mainAng = t * Math.PI * 2 * turns + phase;
        const fiberAng = t * Math.PI * 2 * (turns * 3.5) + fPhase;
        const cy = yOffset + Math.cos(mainAng) * helixRadius;
        const cz = Math.sin(mainAng) * helixRadius;
        fPts.push(
          new THREE.Vector3(
            x,
            cy + Math.cos(fiberAng) * fOffset,
            cz + Math.sin(fiberAng) * fOffset
          )
        );
      }
      const fCurve = new THREE.CatmullRomCurve3(fPts);
      const fGeo = new THREE.TubeGeometry(fCurve, 96, strandRadius * 0.16, 8, false);
      const fMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        transparent: true,
        opacity: 0.28,
      });
      parent.add(new THREE.Mesh(fGeo, fMat));
    }
  }
}

export default function Yarn3DLab({
  mode,
  plyCount,
  singleTex,
  activeLabel = "",
  compareLabel = "30 Ne (1-Ply)",
  compareSingleTex = 19.68,
  comparePly = 1,
  wrapTurns,
  wrapWeightGrains,
  beesleyThreads,
}: Yarn3DLabProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const activeTagRef = useRef<HTMLDivElement | null>(null);
  const refTagRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [showRef, setShowRef] = useState(true);
  const [wrapStep, setWrapStep] = useState<1 | 2 | 3>(1);
  const [resetTick, setResetTick] = useState(0);

  const stateRef = useRef({
    isPlaying: true,
    wrapStep: 1 as 1 | 2 | 3,
    rotX: 0.18,
    rotY: 0.28,
    zoom: 1,
  });

  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    stateRef.current.wrapStep = wrapStep;
  }, [wrapStep]);

  const resultantTex = singleTex * Math.max(1, Math.min(4, plyCount));
  const cmpResultantTex = compareSingleTex * Math.max(1, Math.min(4, comparePly));
  const approxDiameterMm = 0.036 * Math.sqrt(Math.max(0.1, resultantTex));
  const cmpDiameterMm = 0.036 * Math.sqrt(Math.max(0.1, cmpResultantTex));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 300;
    const isNarrow = width < 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const baseZ = mode === "ply" ? (isNarrow ? 6.1 : 4.9) : isNarrow ? 7.6 : 6.4;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.75, baseZ);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    keyLight.position.set(4, 7, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const grid = new THREE.GridHelper(12, 18, 0x334155, 0x1e293b);
    grid.position.y = -1.85;
    rootGroup.add(grid);

    let reelWheel: THREE.Group | null = null;
    let panSkein: THREE.Mesh | null = null;
    let beesleyBeam: THREE.Group | null = null;
    const beesleyTargetTilt = Math.max(
      -0.32,
      Math.min(0.32, (30 - beesleyThreads) * 0.014)
    );

    const activeAnchor = new THREE.Object3D();
    activeAnchor.position.set(0, showRef ? 0.85 : 0.45, 0);
    rootGroup.add(activeAnchor);

    const refAnchor = new THREE.Object3D();
    refAnchor.position.set(0, -0.45, 0);
    rootGroup.add(refAnchor);

    if (mode === "ply") {
      const clampedPly = Math.max(1, Math.min(4, plyCount));
      const strandRadius = Math.max(0.038, Math.min(0.28, 0.032 + Math.sqrt(Math.max(0.5, singleTex)) * 0.023));
      const helixRadius =
        clampedPly === 1 ? 0 : strandRadius * (clampedPly === 2 ? 1.05 : clampedPly === 3 ? 1.24 : 1.4);
      const length = 4.6;
      const activeY = showRef ? 0.45 : 0.0;

      for (let p = 0; p < clampedPly; p++) {
        const phase = (p * Math.PI * 2) / clampedPly;
        const colorHex = PLY_COLORS[p % PLY_COLORS.length] ?? 0x22d3ee;
        buildHelicalStrand(rootGroup, {
          yOffset: activeY,
          length,
          strandRadius,
          helixRadius,
          turns: 3.4,
          phase,
          colorHex,
          addFibers: true,
        });
      }

      if (showRef) {
        const clampedCmpPly = Math.max(1, Math.min(4, comparePly));
        const cmpRadius = Math.max(0.038, Math.min(0.28, 0.032 + Math.sqrt(Math.max(0.5, compareSingleTex)) * 0.023));
        const cmpHelixRadius =
          clampedCmpPly === 1 ? 0 : cmpRadius * (clampedCmpPly === 2 ? 1.05 : clampedCmpPly === 3 ? 1.24 : 1.4);
        for (let p = 0; p < clampedCmpPly; p++) {
          const phase = (p * Math.PI * 2) / clampedCmpPly;
          const colorHex = CMP_COLORS[p % CMP_COLORS.length] ?? 0x94a3b8;
          buildHelicalStrand(rootGroup, {
            yOffset: -0.78,
            length,
            strandRadius: cmpRadius,
            helixRadius: cmpHelixRadius,
            turns: 3.4,
            phase,
            colorHex,
            opacity: 0.85,
            addFibers: true,
          });
        }
      }
    } else if (mode === "wrap_reel") {
      const coneGroup = new THREE.Group();
      coneGroup.position.set(-2.6, -1.0, 0);
      const coneBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.52, 0.16, 24),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
      );
      coneGroup.add(coneBase);
      const yarnCone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.44, 1.35, 24),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.65 })
      );
      yarnCone.position.y = 0.75;
      coneGroup.add(yarnCone);
      rootGroup.add(coneGroup);

      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 2.4, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.4 })
      );
      stand.position.set(-0.65, -0.75, -0.45);
      rootGroup.add(stand);

      reelWheel = new THREE.Group();
      reelWheel.position.set(-0.65, 0.28, 0);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.9, 20),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 })
      );
      hub.rotation.x = Math.PI / 2;
      reelWheel.add(hub);

      for (let a = 0; a < 6; a++) {
        const ang = (a * Math.PI * 2) / 6;
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, 1.3, 10),
          new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.25 })
        );
        arm.position.set(Math.cos(ang) * 0.65, Math.sin(ang) * 0.65, 0);
        arm.rotation.z = ang + Math.PI / 2;
        reelWheel.add(arm);

        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.75, 12),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.3 })
        );
        bar.rotation.x = Math.PI / 2;
        bar.position.set(Math.cos(ang) * 1.25, Math.sin(ang) * 1.25, 0);
        reelWheel.add(bar);
      }

      const woundBand = new THREE.Mesh(
        new THREE.CylinderGeometry(1.27, 1.27, 0.36, 6),
        new THREE.MeshStandardMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.72, roughness: 0.6 })
      );
      woundBand.rotation.x = Math.PI / 2;
      reelWheel.add(woundBand);
      rootGroup.add(reelWheel);

      const balanceGroup = new THREE.Group();
      balanceGroup.position.set(2.05, -1.45, 0);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.55, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.3 })
      );
      balanceGroup.add(body);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.22, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.7 })
      );
      screen.position.set(0, 0.02, 0.76);
      balanceGroup.add(screen);

      const pan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.62, 0.06, 28),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 })
      );
      pan.position.set(0, 0.34, -0.05);
      balanceGroup.add(pan);

      panSkein = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.11, 14, 28),
        new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.6 })
      );
      panSkein.rotation.x = Math.PI / 2;
      panSkein.position.set(0, 0.48, -0.05);
      balanceGroup.add(panSkein);

      rootGroup.add(balanceGroup);
    } else {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.22, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.3 })
      );
      base.position.set(0, -1.65, 0);
      rootGroup.add(base);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.16, 2.6, 20),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.78, roughness: 0.25 })
      );
      pillar.position.set(-0.15, -0.3, 0);
      rootGroup.add(pillar);

      const datumPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.5, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 })
      );
      datumPost.position.set(1.85, -0.85, 0);
      rootGroup.add(datumPost);

      const datumLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.05, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.8 })
      );
      datumLine.position.set(1.85, 0.98, 0);
      rootGroup.add(datumLine);

      beesleyBeam = new THREE.Group();
      beesleyBeam.position.set(-0.15, 0.98, 0);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.09, 0.09),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.75, roughness: 0.25 })
      );
      bar.position.set(0.15, 0, 0);
      beesleyBeam.add(bar);

      const rider = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.24, 18),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 })
      );
      rider.position.set(1.35, -0.14, 0);
      beesleyBeam.add(rider);

      const hookStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.45, 10),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8 })
      );
      hookStem.position.set(-1.55, -0.24, 0);
      beesleyBeam.add(hookStem);

      const visibleThreads = Math.max(1, Math.min(12, Math.round(beesleyThreads / 4)));
      for (let t = 0; t < visibleThreads; t++) {
        const strand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, 0.75, 8),
          new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.55 })
        );
        strand.position.set(-1.55 + (t - visibleThreads / 2) * 0.032, -0.78, 0);
        beesleyBeam.add(strand);
      }

      rootGroup.add(beesleyBeam);

      const swatch = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.05, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.85 })
      );
      swatch.position.set(-1.35, -1.5, 0.2);
      rootGroup.add(swatch);
    }

    const pointers = new Map<number, { x: number; y: number }>();
    let prevPinchDist = 0;

    const getPinchDist = () => {
      const pts = Array.from(pointers.values());
      if (pts.length < 2) return 0;
      const p0 = pts[0]!;
      const p1 = pts[1]!;
      return Math.hypot(p1.x - p0.x, p1.y - p0.y);
    };

    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        prevPinchDist = getPinchDist();
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        stateRef.current.rotY += dx * 0.012;
        stateRef.current.rotX = Math.max(-1.1, Math.min(1.1, stateRef.current.rotX + dy * 0.012));
      } else if (pointers.size >= 2) {
        const dist = getPinchDist();
        if (prevPinchDist > 0 && dist > 0) {
          const delta = (dist - prevPinchDist) * 0.005;
          stateRef.current.zoom = Math.max(0.6, Math.min(2.2, stateRef.current.zoom + delta));
        }
        prevPinchDist = dist;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        prevPinchDist = 0;
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stateRef.current.zoom = Math.max(0.6, Math.min(2.2, stateRef.current.zoom - e.deltaY * 0.001));
    };

    const domEl = renderer.domElement;
    domEl.style.touchAction = "none";
    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    domEl.addEventListener("wheel", onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    const projVec = new THREE.Vector3();
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);

      if (stateRef.current.isPlaying && pointers.size === 0 && mode === "ply") {
        stateRef.current.rotY += 0.0035;
      }

      if (reelWheel && stateRef.current.isPlaying && stateRef.current.wrapStep === 1) {
        reelWheel.rotation.z -= 0.045;
      }
      if (panSkein) {
        panSkein.visible = stateRef.current.wrapStep >= 2;
        panSkein.position.y =
          stateRef.current.wrapStep === 3 && stateRef.current.isPlaying
            ? 0.48 + Math.sin(Date.now() * 0.004) * 0.015
            : 0.48;
      }
      if (beesleyBeam) {
        beesleyBeam.rotation.z += (beesleyTargetTilt - beesleyBeam.rotation.z) * 0.1;
      }

      rootGroup.rotation.x = stateRef.current.rotX;
      rootGroup.rotation.y = stateRef.current.rotY;
      camera.position.z = baseZ / stateRef.current.zoom;
      renderer.render(scene, camera);

      if (mode === "ply") {
        const w = container.clientWidth || 360;
        const h = container.clientHeight || 300;
        rootGroup.updateMatrixWorld();

        if (activeTagRef.current) {
          activeAnchor.getWorldPosition(projVec);
          projVec.project(camera);
          const sx = Math.max(70, Math.min(w - 70, (projVec.x * 0.5 + 0.5) * w));
          const sy = Math.max(36, Math.min(h - 20, (-projVec.y * 0.5 + 0.5) * h));
          activeTagRef.current.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
        }
        if (refTagRef.current && showRef) {
          refAnchor.getWorldPosition(projVec);
          projVec.project(camera);
          const rx = Math.max(70, Math.min(w - 70, (projVec.x * 0.5 + 0.5) * w));
          const ry = Math.max(36, Math.min(h - 10, (-projVec.y * 0.5 + 0.5) * h));
          refTagRef.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -100%)`;
        }
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      domEl.removeEventListener("wheel", onWheel);
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, [mode, plyCount, singleTex, compareSingleTex, comparePly, wrapTurns, beesleyThreads, showRef, resetTick]);

  const handleReset = () => {
    stateRef.current.rotX = 0.18;
    stateRef.current.rotY = 0.28;
    stateRef.current.zoom = 1;
    setResetTick((t) => t + 1);
  };

  const handleZoom = (delta: number) => {
    stateRef.current.zoom = Math.max(0.6, Math.min(2.2, stateRef.current.zoom + delta));
  };

  const diffPct = Math.abs(resultantTex - cmpResultantTex) / Math.max(0.01, cmpResultantTex);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
          <Move3d className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[230px] sm:max-w-none">
            {mode === "ply" && `3D ${plyCount}P (${resultantTex.toFixed(1)} Tex) vs ${compareLabel}`}
            {mode === "wrap_reel" && `Wrap Reel (${wrapTurns} turns) + Balance`}
            {mode === "beesley" && `Beesley's Balance (${beesleyThreads} threads)`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {mode === "ply" && (
            <button
              type="button"
              onClick={() => setShowRef((r) => !r)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] sm:text-xs border transition ${
                showRef
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {showRef ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showRef ? "Yarn B: ON" : "Yarn B: OFF"}</span>
            </button>
          )}
          {mode === "wrap_reel" && (
            <div className="flex items-center gap-1">
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setWrapStep(s)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    wrapStep === s
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s === 1 ? "1.Wind" : s === 2 ? "2.Cut" : "3.Weigh"}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => handleZoom(0.2)}
            aria-label="Zoom in"
            className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-0.2)}
            aria-label="Zoom out"
            className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] sm:text-xs text-slate-200"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isPlaying ? "Pause" : "Play"}</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] sm:text-xs text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div ref={mountRef} className="w-full h-[300px] sm:h-[360px] touch-none cursor-grab active:cursor-grabbing" />

        {mode === "ply" && (
          <>
            <div
              ref={activeTagRef}
              className="pointer-events-none absolute top-0 left-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-cyan-950/90 border border-cyan-400/60 text-[10px] sm:text-[11px] font-semibold text-cyan-200 shadow-lg whitespace-nowrap"
            >
              {"\u09b8\u09c1\u09a4\u09be A"} {activeLabel ? `(${activeLabel})` : ""} • {resultantTex.toFixed(1)} Tex
            </div>
            {showRef && (
              <div
                ref={refTagRef}
                className="pointer-events-none absolute top-0 left-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-900/90 border border-indigo-400/50 text-[10px] sm:text-[11px] font-medium text-indigo-200 shadow-lg whitespace-nowrap"
              >
                {"\u09b8\u09c1\u09a4\u09be B"} ({compareLabel}) • {cmpResultantTex.toFixed(1)} Tex
              </div>
            )}
          </>
        )}

        <div className="pointer-events-none absolute top-2.5 left-2.5 right-2.5 flex flex-wrap items-start justify-between gap-2">
          {mode === "ply" && (
            <div className="ml-auto rounded-xl bg-slate-900/85 backdrop-blur-sm border border-slate-700/70 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-right">
              <div className="text-slate-200 font-mono">
                A: ~{approxDiameterMm.toFixed(2)} mm | B: ~{cmpDiameterMm.toFixed(2)} mm
              </div>
              <div
                className={
                  diffPct < 0.03
                    ? "text-emerald-400 font-medium"
                    : resultantTex > cmpResultantTex
                    ? "text-amber-300 font-medium"
                    : "text-indigo-300 font-medium"
                }
              >
                {diffPct < 0.03
                  ? "\u09a6\u09c1\u099f\u09cb \u09b8\u09c1\u09a4\u09be \u09aa\u09cd\u09b0\u09be\u09df \u09b8\u09ae\u09be\u09a8 \u09ae\u09cb\u099f\u09be"
                  : resultantTex > cmpResultantTex
                  ? "\u09b8\u09c1\u09a4\u09be A \u09ac\u09c7\u09b6\u09bf \u09ae\u09cb\u099f\u09be"
                  : "\u09b8\u09c1\u09a4\u09be B \u09ac\u09c7\u09b6\u09bf \u09ae\u09cb\u099f\u09be"}
              </div>
            </div>
          )}

          {mode === "wrap_reel" && (
            <div className="rounded-xl bg-slate-900/85 backdrop-blur-sm border border-slate-700/70 px-2.5 py-1.5 text-[10px] sm:text-[11px] space-y-0.5 max-w-full">
              <div className="text-cyan-300 font-semibold">
                {wrapStep === 1
                  ? "\u09a7\u09be\u09aa \u09e7: \u09b0\u200d\u09cd\u09af\u09be\u09aa \u09b0\u09bf\u09b2\u09c7 \u09b8\u09c1\u09a4\u09be \u09aa\u09cd\u09af\u09be\u0981\u099a\u09be\u09a8\u09cb \u09b9\u099a\u09cd\u099b\u09c7"
                  : wrapStep === 2
                  ? "\u09a7\u09be\u09aa \u09e8: \u09b8\u09c1\u09a4\u09be \u0995\u09c7\u099f\u09c7 \u09ac\u09cd\u09af\u09be\u09b2\u09c7\u09a8\u09cd\u09b8\u09c7\u09b0 \u09aa\u09cd\u09af\u09be\u09a8\u09c7 \u09b0\u09be\u0996\u09be \u09b9\u09df\u09c7\u099b\u09c7"
                  : `\u09a7\u09be\u09aa \u09e9: \u09a1\u09bf\u099c\u09bf\u099f\u09be\u09b2 \u09ac\u09cd\u09af\u09be\u09b2\u09c7\u09a8\u09cd\u09b8\u09c7 \u0993\u099c\u09a8 (${wrapWeightGrains.toFixed(1)} gr)`}
              </div>
              <div className="text-slate-400">
                {"\u09ac\u09be\u09ae\u09c7: Cone | \u09ae\u09be\u099d\u09c7: Wrap Reel | \u09a1\u09be\u09a8\u09c7: Balance"}
              </div>
            </div>
          )}

          {mode === "beesley" && (
            <div className="rounded-xl bg-slate-900/85 backdrop-blur-sm border border-slate-700/70 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-slate-300">
              {"\u09ac\u09be\u09ae\u09c7: \u09b9\u09c1\u0995\u09c7 \u0995\u09be\u099f\u09be \u09b8\u09c1\u09a4\u09be | \u09a1\u09be\u09a8\u09c7: \u09b8\u09ac\u09c1\u099c Datum \u09a6\u09be\u0997 (30 Ne)"}
            </div>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-4 py-2 border-t border-slate-800/80 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>{"\u09ae\u09be\u0989\u09b8/\u0986\u0999\u09c1\u09b2 \u09a6\u09bf\u09df\u09c7 \u09a1\u09cd\u09b0\u09cd\u09af\u09be\u0997 \u0995\u09b0\u09c7 \u09e9\u09ec\u09e6\u00b0 \u0998\u09c1\u09b0\u09bf\u09df\u09c7 \u0993 \u09aa\u09bf\u099e\u09cd\u099a / + - \u09a6\u09bf\u09df\u09c7 \u099c\u09c1\u09ae \u0995\u09b0\u09c7 \u09a6\u09c7\u0996\u09cb"}</span>
        {mode === "beesley" && (
          <span className={Math.abs(beesleyThreads - 30) <= 1 ? "text-emerald-400 font-medium" : "text-amber-300"}>
            {Math.abs(beesleyThreads - 30) <= 1
              ? "\u09aa\u09df\u09c7\u09a8\u09cd\u099f\u09be\u09b0 \u09b8\u09ac\u09c1\u099c Datum \u09a6\u09be\u0997\u09c7 \u09b8\u09ae\u09be\u09a8 \u09b9\u09df\u09c7\u099b\u09c7!"
              : beesleyThreads < 30
              ? "\u09b8\u09c1\u09a4\u09be \u0995\u09ae \u2014 \u09ac\u09be\u09ae \u09a6\u09bf\u0995 \u09b9\u09be\u09b2\u0995\u09be (\u0989\u09aa\u09b0\u09c7 \u0989\u09a0\u09c7\u099b\u09c7)"
              : "\u09b8\u09c1\u09a4\u09be \u09ac\u09c7\u09b6\u09bf \u2014 \u09ac\u09be\u09ae \u09a6\u09bf\u0995 \u09ad\u09be\u09b0\u09c0 (\u09a8\u09bf\u099a\u09c7 \u09a8\u09c7\u09ae\u09c7\u099b\u09c7)"}
          </span>
        )}
      </div>
    </div>
  );
}