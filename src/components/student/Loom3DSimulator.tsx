"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  Layers,
  Gauge,
  AlertTriangle,
  GraduationCap,
  Camera,
  Eye,
} from "lucide-react";

type PickingType = "shuttle" | "rapier" | "projectile" | "airjet";
type ShedType = "open" | "center_closed" | "bottom_closed";
type WeaveType = "plain" | "twill21" | "twill22" | "denim31";
type CameraPresetId = "full" | "shedding" | "beatup" | "picking" | "cloth";

type LoomPartId =
  | "motor_gears"
  | "tappets_treadles"
  | "weavers_beam"
  | "back_rest"
  | "lease_rods"
  | "drop_wires"
  | "heald_frames"
  | "picking_unit"
  | "reed_sley"
  | "woven_cloth"
  | "breast_beam"
  | "cloth_roller"
  | "modern_creel_hmi";

interface PartMeta {
  id: LoomPartId;
  name: string;
  motion: string;
  role: string;
  defect: string;
  vivaTip: string;
}

const LOOM_PARTS: Record<LoomPartId, PartMeta> = {
  motor_gears: {
    id: "motor_gears",
    name: "Main Motor, Flywheel & 1:2 Spur Gears",
    motion: "Main Mechanical Drive Train",
    role: "Electric motor drives the Crank Shaft (1 rev/pick) via V-belt & flywheel. A 1:2 spur gear pair drives the Bottom Shaft at half speed (1 rev per 2 picks).",
    defect: "Worn gear teeth or loose V-belt causes irregular loom speed, jerky beat-up, and timing drift.",
    vivaTip: "Crank Shaft RPM = Loom Picks Per Minute (PPM). Bottom Shaft RPM = Crank Shaft RPM / 2.",
  },
  tappets_treadles: {
    id: "tappets_treadles",
    name: "Bottom Shaft, Tappets (Cams) & Treadles",
    motion: "Shedding Drive Mechanism",
    role: "Eccentric tappet cams on the Bottom Shaft press anti-friction bowls on Treadle Levers, pulling Heald Frames down while Top Reversing Rollers lift opposing frames.",
    defect: "Worn tappet nose or loose treadle bowl reduces shed height, causing warp rubbing and shuttle trapping.",
    vivaTip: "In negative tappet shedding, cams pull frames DOWN while top reversing rollers/springs pull opposing frames UP.",
  },
  weavers_beam: {
    id: "weavers_beam",
    name: "Weaver's Beam (Warp Beam)",
    motion: "Secondary Motion (Let-off)",
    role: "Holds thousands of sized warp ends wound in parallel between heavy cast-iron flanges and releases warp under uniform tension.",
    defect: "Uneven let-off tension creates thick & thin places (starting marks) across the fabric width.",
    vivaTip: "Positive let-off automatically maintains constant warp tension even as beam diameter decreases.",
  },
  back_rest: {
    id: "back_rest",
    name: "Back Rest (Whip Roll)",
    motion: "Warp Guide & Tension Sensor",
    role: "Deflects the warp sheet from the weaver's beam into the horizontal warp line and absorbs shedding tension peaks.",
    defect: "Rough or misaligned back rest causes warp filament abrasion and frequent end breaks.",
    vivaTip: "Raising the back rest creates slack top-shed ends, improving fabric cover in plain weaves.",
  },
  lease_rods: {
    id: "lease_rods",
    name: "Lease Rods (2 Separating Rods)",
    motion: "Warp Sheet Separation",
    role: "Maintains strict 1-and-1 separation of adjacent warp ends in a figure-of-eight path, preventing entanglement behind the healds.",
    defect: "Wrong lease causes crossed warp ends, clinging fibers, and frequent loom stops.",
    vivaTip: "Lease rods also help weavers quickly locate and knot broken warp ends.",
  },
  drop_wires: {
    id: "drop_wires",
    name: "Drop Wires (Warp Stop Motion)",
    motion: "Tertiary Motion (Safety)",
    role: "One metal drop wire hangs on every warp end. When an end breaks, its wire drops onto the serrated contact bar and halts the loom instantly.",
    defect: "Faulty warp stop motion produces long warp-way 'Missing End' streaks.",
    vivaTip: "Drop wire weight must match yarn count—too heavy breaks fine yarn, too light fails to drop.",
  },
  heald_frames: {
    id: "heald_frames",
    name: "Heald Frames & Top Reversing Arch",
    motion: "Primary Motion (Shedding)",
    role: "Raises and lowers selected warp groups according to the lifting plan to open the V-shaped Shed passage.",
    defect: "Wrong drawing-in or broken heald eye causes 'Wrong Draft' or stitching faults.",
    vivaTip: "Tappet handles up to 8 shafts, Dobby up to 24-32 shafts, Jacquard controls every individual warp end.",
  },
  picking_unit: {
    id: "picking_unit",
    name: "Picking Unit (Shuttle Box / Rapier / Air-Jet)",
    motion: "Primary Motion (Picking)",
    role: "Launches weft yarn across the open shed (110-245 deg) via picking stick & shuttle, twin rapier wheels, torsion projectile, or compressed air-jet nozzles.",
    defect: "Mistimed picking causes 'Broken Pick', 'Double Pick', or shuttle fly-out.",
    vivaTip: "Conventional shuttle looms max out near 200 PPM; modern Air-Jet looms achieve 900-1200+ PPM.",
  },
  reed_sley: {
    id: "reed_sley",
    name: "Crank Arm, Sley Swords, Rocking Shaft & Reed",
    motion: "Primary Motion (Beat-up)",
    role: "Crank throws push Connecting Arms linked to heavy Sley Swords pivoting on the bottom Rocking Shaft, swinging the metallic Reed to beat each pick at 0 deg.",
    defect: "Bent reed dent creates permanent warp-way 'Reed Marks'; weak beat-up causes 'Cracks'.",
    vivaTip: "Shorter crank-arm-to-crank-radius ratio increases reed eccentricity, giving more dwell time for picking.",
  },
  woven_cloth: {
    id: "woven_cloth",
    name: "Fell of Cloth, Temples & Woven Fabric",
    motion: "Fabric Formation Zone",
    role: "Warp and weft lock at the Fell of Cloth while Ring Temples grip both selvedges to keep fabric width equal to reed width.",
    defect: "Excessive temple pin pressure leaves 'Temple Marks'; loose temples cause selvedge end breakage.",
    vivaTip: "Denim uses 3/1 Z-Twill with indigo warp and white weft—3 warp ends float on the face for every 1 weft.",
  },
  breast_beam: {
    id: "breast_beam",
    name: "Breast Beam & Front Control Cover",
    motion: "Fabric Support Guide",
    role: "Smooth front guide beam (enclosed under a protective cobalt-blue cover with Run/Stop buttons on modern looms) deflecting fabric downward to take-up.",
    defect: "Scratches or burrs snag delicate yarns and cause pulled loops on the cloth surface.",
    vivaTip: "Horizontal warp line runs: Back Rest -> Heald Eyes -> Fell of Cloth -> Breast Beam.",
  },
  cloth_roller: {
    id: "cloth_roller",
    name: "Emery Take-up Roller & Cloth Roller",
    motion: "Secondary Motion (Take-up)",
    role: "High-friction emery roller advances woven cloth by an exact step per pick (setting PPI) and winds finished fabric onto the cloth roller.",
    defect: "Cloth slippage on the emery roller produces 'Thick Places' (bunched picks) and uneven GSM.",
    vivaTip: "PPI is controlled by change-wheel gears (conventional) or electronic servo motor (modern looms).",
  },
  modern_creel_hmi: {
    id: "modern_creel_hmi",
    name: "Weft Cone Creel, Accumulators, HMI & Signal Tower",
    motion: "Modern Factory Automation",
    role: "Shuttleless looms draw weft continuously from stationary cones on a side Creel Stand via electronic Weft Accumulators, controlled by a Touchscreen HMI with an Andon Signal Tower.",
    defect: "Accumulator tension spikes cause weft breaks and uneven selvedge loops; signal tower flashes amber/red on loom stop.",
    vivaTip: "Because weft comes from large stationary cones (not tiny shuttle pirns), shuttleless looms run non-stop at 3x-5x speed.",
  },
};

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; theta: number; phi: number; radius: number; target: [number, number, number] }
> = {
  full: { label: "Full Loom", theta: 0.62, phi: 1.12, radius: 13.0, target: [0.2, -0.25, 0] },
  shedding: { label: "Shedding & Cams", theta: 0.95, phi: 1.24, radius: 6.8, target: [-0.85, -0.35, 0.2] },
  beatup: { label: "Beat-up & Gears", theta: -0.78, phi: 1.18, radius: 7.4, target: [0.25, -0.85, -1.6] },
  picking: { label: "Picking & Shed", theta: 0.35, phi: 1.05, radius: 7.2, target: [0.9, 0.05, 0] },
  cloth: { label: "Woven Cloth", theta: 0.42, phi: 0.62, radius: 6.4, target: [2.85, 0.05, 0] },
};

interface GuidedStep {
  title: string;
  angle: number;
  part: LoomPartId;
  camera: CameraPresetId;
  summary: string;
}

const GUIDED_STEPS: GuidedStep[] = [
  {
    title: "Step 1: Motor & 1:2 Gear Drive (40 deg)",
    angle: 40,
    part: "motor_gears",
    camera: "beatup",
    summary:
      "Electric motor rotates the Crank Shaft (1 rev/pick). The 1:2 spur gear meshes with the Bottom Shaft so cams rotate once every 2 picks.",
  },
  {
    title: "Step 2: Tappet Cam Shedding (75 deg)",
    angle: 75,
    part: "tappets_treadles",
    camera: "shedding",
    summary:
      "Rotating tappets on the Bottom Shaft press the Treadle Levers, pulling down selected Heald Frames while Top Reversing Rollers lift opposing frames.",
  },
  {
    title: "Step 3: Picking Across Open Shed (175 deg)",
    angle: 175,
    part: "picking_unit",
    camera: "picking",
    summary:
      "During full shed dwell (110-245 deg), the picking stick / rapier / projectile / air-jet propels weft yarn cleanly through the open warp shed.",
  },
  {
    title: "Step 4: Crank Arm & Sley Sword Beat-up (0 deg)",
    angle: 0,
    part: "reed_sley",
    camera: "beatup",
    summary:
      "Crank throws drive the Connecting Arms and Sley Swords pivoting on the Rocking Shaft, pushing the Reed forward at 0 deg to beat the pick into the cloth.",
  },
  {
    title: "Step 5: Live Cloth Formation & Take-up (20 deg)",
    angle: 20,
    part: "woven_cloth",
    camera: "cloth",
    summary:
      "Ring temples hold selvedge width taut at the Fell of Cloth while the Emery Take-up Roller advances the new pick onto the Cloth Roller.",
  },
];

const WEAVE_CONFIG: Record<
  WeaveType,
  {
    label: string;
    repeat: number;
    matrix: number[][];
    warpColor: number;
    weftColor: number;
    note: string;
  }
> = {
  plain: {
    label: "Plain (1/1)",
    repeat: 2,
    matrix: [
      [1, 0, 1, 0],
      [0, 1, 0, 1],
    ],
    warpColor: 0x38bdf8,
    weftColor: 0xf59e0b,
    note: "Simplest & strongest weave; 1 up, 1 down alternation.",
  },
  twill21: {
    label: "Twill (2/1)",
    repeat: 3,
    matrix: [
      [1, 1, 0, 1],
      [0, 1, 1, 0],
      [1, 0, 1, 1],
    ],
    warpColor: 0x22d3ee,
    weftColor: 0xfb7185,
    note: "Warp-faced diagonal twill lines; 2 up, 1 down repeat.",
  },
  twill22: {
    label: "Twill (2/2)",
    repeat: 4,
    matrix: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 1],
      [1, 0, 0, 1],
    ],
    warpColor: 0x34d399,
    weftColor: 0xfbbf24,
    note: "Balanced twill with prominent 45-degree diagonal wale.",
  },
  denim31: {
    label: "Denim (3/1 Z-Twill)",
    repeat: 4,
    matrix: [
      [1, 1, 1, 0],
      [0, 1, 1, 1],
      [1, 0, 1, 1],
      [1, 1, 0, 1],
    ],
    warpColor: 0x2563eb,
    weftColor: 0xf8fafc,
    note: "Classic Denim: Indigo warp (3 up, 1 down) + White weft.",
  },
};

const PICKING_INFO: Record<
  PickingType,
  { label: string; era: string; ppm: string; desc: string }
> = {
  shuttle: {
    label: "Shuttle (Lab Loom)",
    era: "Conventional Motor-Driven",
    ppm: "160-220 PPM",
    desc: "Open mechanical lab power loom with overhead arch, 1:2 gears & picking sticks.",
  },
  rapier: {
    label: "Rapier (Modern)",
    era: "Modern Industrial Factory",
    ppm: "450-650 PPM",
    desc: "Picanol-style factory cabinet, weft cone creel, HMI screen & twin rapiers.",
  },
  projectile: {
    label: "Projectile (Modern)",
    era: "Modern Industrial Factory",
    ppm: "350-450 PPM",
    desc: "Factory enclosure with weft creel, HMI panel & torsion-bar gripper projectile.",
  },
  airjet: {
    label: "Air-Jet (Modern)",
    era: "Modern Industrial Factory",
    ppm: "850-1200+ PPM",
    desc: "Toyota-style factory loom with weft accumulators, air manifold & relay nozzles.",
  },
};

function getPhaseLabel(deg: number): { name: string; color: string } {
  const a = ((deg % 360) + 360) % 360;
  if (a <= 25 || a >= 335) return { name: "Beat-up (Reed Strike)", color: "text-rose-300" };
  if (a < 110) return { name: "Shed Opening", color: "text-cyan-300" };
  if (a <= 245) return { name: "Dwell & Picking (Weft Insertion)", color: "text-amber-300" };
  return { name: "Shed Closing & Crossing", color: "text-emerald-300" };
}

function buildSpurGear(
  radius: number,
  thickness: number,
  teeth: number,
  color: number,
): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.78,
    roughness: 0.28,
  });

  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 28), mat);
  wheel.rotation.x = Math.PI / 2;
  group.add(wheel);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.34, radius * 0.34, thickness * 1.45, 18),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 }),
  );
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  const toothW = (2 * Math.PI * radius) / (teeth * 2.1);
  const toothGeo = new THREE.BoxGeometry(toothW, radius * 0.22, thickness * 0.92);
  for (let i = 0; i < teeth; i++) {
    const ang = (i / teeth) * Math.PI * 2;
    const t = new THREE.Mesh(toothGeo, mat);
    t.position.set(Math.cos(ang) * (radius + radius * 0.08), Math.sin(ang) * (radius + radius * 0.08), 0);
    t.rotation.z = ang - Math.PI / 2;
    group.add(t);
  }
  return group;
}

export default function Loom3DSimulator() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.6);
  const [crankAngle, setCrankAngle] = useState(175);
  const [pickingType, setPickingType] = useState<PickingType>("shuttle");
  const [shedType, setShedType] = useState<ShedType>("open");
  const [weaveType, setWeaveType] = useState<WeaveType>("denim31");
  const [selectedPart, setSelectedPart] = useState<LoomPartId>("heald_frames");
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>("full");
  const [xRayMode, setXRayMode] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState<number | null>(null);
  const [picksWoven, setPicksWoven] = useState(18);

  const stateRef = useRef({
    isPlaying,
    speed,
    crankAngle,
    pickingType,
    shedType,
    weaveType,
    selectedPart,
    xRayMode,
    pickIndex: 18,
  });

  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
    stateRef.current.speed = speed;
    stateRef.current.pickingType = pickingType;
    stateRef.current.shedType = shedType;
    stateRef.current.weaveType = weaveType;
    stateRef.current.selectedPart = selectedPart;
    stateRef.current.xRayMode = xRayMode;
  }, [isPlaying, speed, pickingType, shedType, weaveType, selectedPart, xRayMode]);

  const cameraControlsRef = useRef<{
    zoom: (delta: number) => void;
    applyPreset: (preset: CameraPresetId) => void;
  } | null>(null);

  const selectPreset = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    cameraControlsRef.current?.applyPreset(preset);
  };

  const applyStep = (idx: number) => {
    const step = GUIDED_STEPS[idx];
    if (!step) return;
    setActiveStepIdx(idx);
    setIsPlaying(false);
    setCrankAngle(step.angle);
    stateRef.current.crankAngle = step.angle;
    setSelectedPart(step.part);
    if (pickingType !== "shuttle" && (step.part === "motor_gears" || step.part === "tappets_treadles")) {
      setXRayMode(true);
    }
    selectPreset(step.camera);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1526);

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(300, container.clientHeight);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Bright Industrial Studio Lighting
    const hemi = new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 1.25);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-9, 6, -8);
    scene.add(rimLight);
    const frontFill = new THREE.DirectionalLight(0xfde68a, 0.45);
    frontFill.position.set(6, 4, -9);
    scene.add(frontFill);

    const floorGrid = new THREE.GridHelper(24, 30, 0x334155, 0x162236);
    floorGrid.position.y = -2.28;
    scene.add(floorGrid);

    const isNarrow = width < 520;
    let theta = CAMERA_PRESETS.full.theta;
    let phi = CAMERA_PRESETS.full.phi;
    let radius = isNarrow ? 15.8 : CAMERA_PRESETS.full.radius;
    const target = new THREE.Vector3(...CAMERA_PRESETS.full.target);

    let desiredTheta = theta;
    let desiredPhi = phi;
    let desiredRadius = radius;
    const desiredTarget = target.clone();
    let isLerping = false;

    const updateCamera = () => {
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(target);
    };
    updateCamera();

    cameraControlsRef.current = {
      zoom: (delta: number) => {
        isLerping = false;
        radius = Math.min(23, Math.max(4.5, radius + delta));
        desiredRadius = radius;
        updateCamera();
      },
      applyPreset: (presetId: CameraPresetId) => {
        const p = CAMERA_PRESETS[presetId];
        desiredTheta = p.theta;
        desiredPhi = p.phi;
        desiredRadius = container.clientWidth < 520 ? p.radius * 1.2 : p.radius;
        desiredTarget.set(p.target[0], p.target[1], p.target[2]);
        isLerping = true;
      },
    };

    const partMeshes: Record<LoomPartId, THREE.Mesh[]> = {
      motor_gears: [],
      tappets_treadles: [],
      weavers_beam: [],
      back_rest: [],
      lease_rods: [],
      drop_wires: [],
      heald_frames: [],
      picking_unit: [],
      reed_sley: [],
      woven_cloth: [],
      breast_beam: [],
      cloth_roller: [],
      modern_creel_hmi: [],
    };
    const allClickable: THREE.Mesh[] = [];

    const registerMesh = (mesh: THREE.Mesh, partId: LoomPartId) => {
      mesh.userData.partId = partId;
      partMeshes[partId].push(mesh);
      allClickable.push(mesh);
    };

    const registerGroupMeshes = (grp: THREE.Object3D, partId: LoomPartId) => {
      grp.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          registerMesh(child, partId);
        }
      });
    };

    const castIronMat = new THREE.MeshStandardMaterial({
      color: 0x264653,
      metalness: 0.58,
      roughness: 0.42,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.72,
      roughness: 0.35,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.82,
      roughness: 0.25,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.9,
      roughness: 0.18,
    });

    // === CONVENTIONAL CAST-IRON FRAME & TOP ARCH ===
    const conventionalArchGroup = new THREE.Group();
    for (const zSide of [-2.42, 2.42]) {
      const baseBeam = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.34, 0.28), castIronMat);
      baseBeam.position.set(0.15, -2.08, zSide);
      scene.add(baseBeam);

      for (const xFoot of [-4.4, -0.5, 4.5]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.52), darkSteelMat);
        foot.position.set(xFoot, -2.21, zSide);
        scene.add(foot);
      }

      const backPillar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.5, 0.26), castIronMat);
      backPillar.position.set(-4.2, -0.82, zSide);
      scene.add(backPillar);

      const midArchCol = new THREE.Mesh(new THREE.BoxGeometry(0.34, 4.25, 0.28), castIronMat);
      midArchCol.position.set(-0.78, -0.02, zSide);
      conventionalArchGroup.add(midArchCol);

      const frontPillar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.45, 0.26), castIronMat);
      frontPillar.position.set(4.35, -0.84, zSide);
      scene.add(frontPillar);

      const midTie = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.24, 0.22), castIronMat);
      midTie.position.set(0.1, -0.78, zSide);
      scene.add(midTie);

      const upperTie = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.2, 0.2), castIronMat);
      upperTie.position.set(0.1, 0.32, zSide);
      scene.add(upperTie);

      const crankBearing = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 16), brassMat);
      crankBearing.rotation.x = Math.PI / 2;
      crankBearing.position.set(0.15, -0.78, zSide);
      scene.add(crankBearing);

      const bottomBearing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.34, 16), brassMat);
      bottomBearing.rotation.x = Math.PI / 2;
      bottomBearing.position.set(-0.78, -1.46, zSide);
      scene.add(bottomBearing);
    }

    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 5.25), castIronMat);
    archBeam.position.set(-0.78, 2.12, 0);
    registerMesh(archBeam, "heald_frames");
    conventionalArchGroup.add(archBeam);

    const topRollerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.9, 16), chromeMat);
    topRollerShaft.rotation.x = Math.PI / 2;
    topRollerShaft.position.set(-0.78, 1.82, 0);
    registerMesh(topRollerShaft, "heald_frames");
    conventionalArchGroup.add(topRollerShaft);

    const topRollers: THREE.Mesh[] = [];
    for (const zR of [-1.45, 1.45]) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 20), brassMat);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(-0.78, 1.82, zR);
      registerMesh(roller, "heald_frames");
      conventionalArchGroup.add(roller);
      topRollers.push(roller);
    }
    scene.add(conventionalArchGroup);

    // === MODERN FACTORY ENCLOSURE (PICANOL / TOYOTA STYLE) ===
    const modernFactoryGroup = new THREE.Group();
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: 0xdbe4ee,
      metalness: 0.28,
      roughness: 0.42,
      transparent: true,
      opacity: 0.96,
    });
    const cobaltMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      metalness: 0.35,
      roughness: 0.32,
      transparent: true,
      opacity: 0.96,
    });
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.45,
      roughness: 0.15,
    });

    // Left & Right Silver-Grey Side Drive Cabinets (become translucent in X-Ray mode!)
    const leftCabinet = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.55, 1.15), cabinetMat);
    leftCabinet.position.set(0.7, -0.92, -3.05);
    registerMesh(leftCabinet, "modern_creel_hmi");
    modernFactoryGroup.add(leftCabinet);

    const leftTopBlue = new THREE.Mesh(new THREE.BoxGeometry(5.65, 0.32, 1.2), cobaltMat);
    leftTopBlue.position.set(0.7, 0.46, -3.05);
    registerMesh(leftTopBlue, "modern_creel_hmi");
    modernFactoryGroup.add(leftTopBlue);

    const rightCabinet = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.65, 1.45), cabinetMat);
    rightCabinet.position.set(0.65, -0.88, 3.22);
    registerMesh(rightCabinet, "modern_creel_hmi");
    modernFactoryGroup.add(rightCabinet);

    const rightTopBlue = new THREE.Mesh(new THREE.BoxGeometry(5.85, 0.36, 1.5), cobaltMat);
    rightTopBlue.position.set(0.65, 0.56, 3.22);
    registerMesh(rightTopBlue, "modern_creel_hmi");
    modernFactoryGroup.add(rightTopBlue);

    // Sleek Cobalt-Blue Front Breast Beam Cover + Control Buttons
    const frontBlueCover = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.46, 5.1), cobaltMat);
    frontBlueCover.position.set(4.38, 0.14, 0);
    registerMesh(frontBlueCover, "breast_beam");
    modernFactoryGroup.add(frontBlueCover);

    for (const [bz, col] of [
      [-1.7, 0x22c55e],
      [-1.45, 0xef4444],
      [1.45, 0x22c55e],
      [1.7, 0xf59e0b],
    ] as const) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35 }),
      );
      btn.position.set(4.52, 0.39, bz);
      registerMesh(btn, "breast_beam");
      modernFactoryGroup.add(btn);
    }

    // Slanted Touchscreen HMI Pedestal (Left-Front)
    const hmiPost = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.35, 0.36), cobaltMat);
    hmiPost.position.set(3.95, -1.05, -3.55);
    registerMesh(hmiPost, "modern_creel_hmi");
    modernFactoryGroup.add(hmiPost);

    const hmiHead = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 1.15), darkSteelMat);
    hmiHead.position.set(4.05, 0.25, -3.55);
    hmiHead.rotation.z = -0.35;
    registerMesh(hmiHead, "modern_creel_hmi");
    modernFactoryGroup.add(hmiHead);

    const hmiDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.96), screenMat);
    hmiDisplay.position.set(4.08, 0.31, -3.55);
    hmiDisplay.rotation.z = -0.35;
    registerMesh(hmiDisplay, "modern_creel_hmi");
    modernFactoryGroup.add(hmiDisplay);

    // Andon Signal Tower Light on Right Drive Cabinet
    const towerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.55, 12), chromeMat);
    towerPole.position.set(1.2, 1.5, 3.25);
    registerMesh(towerPole, "modern_creel_hmi");
    modernFactoryGroup.add(towerPole);

    const signalLightMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.9,
    });
    const signalLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 16), signalLightMat);
    signalLamp.position.set(1.2, 2.35, 3.25);
    registerMesh(signalLamp, "modern_creel_hmi");
    modernFactoryGroup.add(signalLamp);

    // Weft Yarn Cone Creel Stand + 4 White Cones + 2 Electronic Weft Accumulators (Far Left)
    const creelGroup = new THREE.Group();
    creelGroup.position.set(1.4, -2.25, -4.95);
    for (const cx of [-0.55, 0.55]) {
      const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.6, 10), chromeMat);
      upright.position.set(cx, 1.8, 0);
      creelGroup.add(upright);
    }
    const creelBase = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 0.95), darkSteelMat);
    creelBase.position.y = 0.05;
    creelGroup.add(creelBase);

    const coneYarnMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.72 });
    for (let cy = 0; cy < 4; cy++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.18), darkSteelMat);
      shelf.position.set(0, 0.75 + cy * 0.78, 0);
      creelGroup.add(shelf);

      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.24, 0.52, 18), coneYarnMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(0, 0.95 + cy * 0.78, 0.28);
      creelGroup.add(cone);
    }

    // 2 Cylindrical Electronic Weft Accumulators mounted between creel and loom
    for (const ax of [-0.35, 0.35]) {
      const acc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.48, 18),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 }),
      );
      acc.rotation.x = Math.PI / 2;
      acc.position.set(ax, 2.75, 1.15);
      creelGroup.add(acc);
    }
    registerGroupMeshes(creelGroup, "modern_creel_hmi");
    modernFactoryGroup.add(creelGroup);

    scene.add(modernFactoryGroup);

    // === 1. ELECTRIC MOTOR, FLYWHEEL, CRANK SHAFT & 1:2 SPUR GEARS ===
    const motorGroup = new THREE.Group();
    motorGroup.position.set(0.15, -1.68, 3.05);
    const motorBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.92, 22),
      new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.6, roughness: 0.35 }),
    );
    motorBody.rotation.x = Math.PI / 2;
    motorGroup.add(motorBody);
    const motorPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 18), darkSteelMat);
    motorPulley.rotation.x = Math.PI / 2;
    motorPulley.position.z = -0.52;
    motorGroup.add(motorPulley);
    registerGroupMeshes(motorGroup, "motor_gears");
    scene.add(motorGroup);

    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    for (const xOff of [-0.14, 0.14]) {
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.08), beltMat);
      belt.position.set(0.15 + xOff, -1.24, 2.66);
      registerMesh(belt, "motor_gears");
      scene.add(belt);
    }

    const crankShaftGroup = new THREE.Group();
    crankShaftGroup.position.set(0.15, -0.78, 0);

    const crankMainBar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 5.7, 18), chromeMat);
    crankMainBar.rotation.x = Math.PI / 2;
    crankShaftGroup.add(crankMainBar);

    const crankRadius = 0.38;
    for (const zCrank of [-2.05, 2.05]) {
      const web1 = new THREE.Mesh(new THREE.BoxGeometry(crankRadius + 0.14, 0.16, 0.08), darkSteelMat);
      web1.position.set(crankRadius / 2, 0, zCrank - 0.12);
      crankShaftGroup.add(web1);
      const web2 = new THREE.Mesh(new THREE.BoxGeometry(crankRadius + 0.14, 0.16, 0.08), darkSteelMat);
      web2.position.set(crankRadius / 2, 0, zCrank + 0.12);
      crankShaftGroup.add(web2);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.3, 14), brassMat);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(crankRadius, 0, zCrank);
      crankShaftGroup.add(pin);
    }

    const flywheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.075, 12, 28), darkSteelMat);
    flywheelRim.position.z = 2.75;
    crankShaftGroup.add(flywheelRim);
    for (let sp = 0; sp < 4; sp++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.07, 0.06), darkSteelMat);
      spoke.rotation.z = (sp * Math.PI) / 4;
      spoke.position.z = 2.75;
      crankShaftGroup.add(spoke);
    }

    const crankPinion = buildSpurGear(0.36, 0.16, 12, 0xf59e0b);
    crankPinion.position.z = -2.72;
    crankShaftGroup.add(crankPinion);

    registerGroupMeshes(crankShaftGroup, "motor_gears");
    scene.add(crankShaftGroup);

    // === 2. BOTTOM SHAFT (1:2 GEAR) + TAPPETS + TREADLES ===
    const bottomShaftGroup = new THREE.Group();
    bottomShaftGroup.position.set(-0.78, -1.46, 0);

    const bottomBar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 5.55, 18), chromeMat);
    bottomBar.rotation.x = Math.PI / 2;
    bottomShaftGroup.add(bottomBar);

    const bottomGear = buildSpurGear(0.68, 0.16, 24, 0x38bdf8);
    bottomGear.position.z = -2.72;
    registerGroupMeshes(bottomGear, "motor_gears");
    bottomShaftGroup.add(bottomGear);

    const camColors = [0x38bdf8, 0x818cf8, 0x34d399, 0xf472b6];
    for (let c = 0; c < 4; c++) {
      const cam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.14, 20),
        new THREE.MeshStandardMaterial({
          color: camColors[c] ?? 0x38bdf8,
          metalness: 0.65,
          roughness: 0.3,
        }),
      );
      cam.rotation.x = Math.PI / 2;
      cam.scale.set(1.35, 1, 0.85);
      const zCam = -0.9 + c * 0.6;
      cam.position.set(c % 2 === 0 ? 0.08 : -0.08, 0, zCam);
      bottomShaftGroup.add(cam);
    }
    registerGroupMeshes(bottomShaftGroup, "tappets_treadles");
    scene.add(bottomShaftGroup);

    const treadleLevers: THREE.Group[] = [];
    for (let t = 0; t < 4; t++) {
      const leverGrp = new THREE.Group();
      const zLev = -0.9 + t * 0.6;
      leverGrp.position.set(-2.35, -1.86, zLev);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.09, 0.1), darkSteelMat);
      bar.position.x = 1.07;
      leverGrp.add(bar);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 16), brassMat);
      bowl.rotation.x = Math.PI / 2;
      bowl.position.set(1.55, 0.1, 0);
      leverGrp.add(bowl);
      registerGroupMeshes(leverGrp, "tappets_treadles");
      scene.add(leverGrp);
      treadleLevers.push(leverGrp);
    }

    // === 3. WEAVER'S BEAM, BACK REST, LEASE RODS, DROP WIRES ===
    const beamGroup = new THREE.Group();
    beamGroup.position.set(-4.2, -0.58, 0);
    const beamCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 4.2, 28),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55, metalness: 0.15 }),
    );
    beamCore.rotation.x = Math.PI / 2;
    registerMesh(beamCore, "weavers_beam");
    beamGroup.add(beamCore);

    for (const zF of [-2.12, 2.12]) {
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.09, 28), darkSteelMat);
      flange.rotation.x = Math.PI / 2;
      flange.position.z = zF;
      registerMesh(flange, "weavers_beam");
      beamGroup.add(flange);
    }
    scene.add(beamGroup);

    const backRest = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.65, 20), chromeMat);
    backRest.rotation.x = Math.PI / 2;
    backRest.position.set(-3.45, 0.06, 0);
    registerMesh(backRest, "back_rest");
    scene.add(backRest);

    const leaseMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.5, roughness: 0.3 });
    for (const [lx, ly] of [
      [-2.85, 0.16],
      [-2.45, -0.06],
    ] as const) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 4.5, 16), leaseMat);
      rod.rotation.x = Math.PI / 2;
      rod.position.set(lx, ly, 0);
      registerMesh(rod, "lease_rods");
      scene.add(rod);
    }

    const dropGroup = new THREE.Group();
    dropGroup.position.set(-1.95, 0.05, 0);
    const contactBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.45), brassMat);
    contactBar.position.y = -0.22;
    registerMesh(contactBar, "drop_wires");
    dropGroup.add(contactBar);
    const wirePinMat = new THREE.MeshStandardMaterial({ color: 0xfde047, metalness: 0.85, roughness: 0.2 });
    for (let i = 0; i < 20; i++) {
      const zPos = -1.85 + (i / 19) * 3.7;
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 0.035), wirePinMat);
      pin.position.set(0, 0.05, zPos);
      registerMesh(pin, "drop_wires");
      dropGroup.add(pin);
    }
    scene.add(dropGroup);

    // === 4. HEALD FRAMES ===
    const healdXPositions = [-1.24, -0.94, -0.64, -0.34];
    const healdFrames: THREE.Group[] = [];
    const topStraps: THREE.Mesh[][] = [];
    const botStraps: THREE.Mesh[] = [];
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.45 });

    for (let s = 0; s < 4; s++) {
      const frame = new THREE.Group();
      const xPos = healdXPositions[s] ?? -0.8;
      frame.position.set(xPos, 0, 0);

      const hMat = new THREE.MeshStandardMaterial({
        color: camColors[s] ?? 0x38bdf8,
        metalness: 0.55,
        roughness: 0.3,
      });

      const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.11, 4.32), hMat);
      topBar.position.y = 0.96;
      registerMesh(topBar, "heald_frames");
      frame.add(topBar);

      const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.11, 4.32), hMat);
      botBar.position.y = -0.96;
      registerMesh(botBar, "heald_frames");
      frame.add(botBar);

      for (const zSide of [-2.12, 2.12]) {
        const stay = new THREE.Mesh(new THREE.BoxGeometry(0.085, 1.98, 0.085), hMat);
        stay.position.z = zSide;
        registerMesh(stay, "heald_frames");
        frame.add(stay);
      }

      for (let e = s; e < 20; e += 4) {
        const zEnd = -1.85 + (e / 19) * 3.7;
        const hWire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.85, 6), chromeMat);
        hWire.position.set(0, 0, zEnd);
        registerMesh(hWire, "heald_frames");
        frame.add(hWire);
      }
      scene.add(frame);
      healdFrames.push(frame);

      const sPair: THREE.Mesh[] = [];
      for (const zS of [-1.45, 1.45]) {
        const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8), strapMat);
        strap.position.set(xPos, 1.4, zS);
        registerMesh(strap, "heald_frames");
        conventionalArchGroup.add(strap);
        sPair.push(strap);
      }
      topStraps.push(sPair);

      const bStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), strapMat);
      bStrap.position.set(xPos, -1.4, -0.9 + s * 0.6);
      registerMesh(bStrap, "tappets_treadles");
      scene.add(bStrap);
      botStraps.push(bStrap);
    }

    // === 5. ROCKING SHAFT, SLEY SWORDS, CRANK ARMS, REED & SHUTTLE BOXES ===
    const rockingShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.1, 18), chromeMat);
    rockingShaft.rotation.x = Math.PI / 2;
    rockingShaft.position.set(1.04, -1.88, 0);
    registerMesh(rockingShaft, "reed_sley");
    scene.add(rockingShaft);

    const sleyPivot = new THREE.Group();
    sleyPivot.position.set(1.04, -1.88, 0);

    const sleyMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.45, roughness: 0.35 });
    for (const zSw of [-2.05, 2.05]) {
      const sword = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 0.14), castIronMat);
      sword.position.set(0, 1.05, zSw);
      registerMesh(sword, "reed_sley");
      sleyPivot.add(sword);
    }

    const sleyRace = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 5.4), sleyMat);
    sleyRace.position.set(0, 1.38, 0);
    registerMesh(sleyRace, "reed_sley");
    sleyPivot.add(sleyRace);

    const sleyCap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 4.65), sleyMat);
    sleyCap.position.set(0, 2.68, 0);
    registerMesh(sleyCap, "reed_sley");
    sleyPivot.add(sleyCap);

    for (let d = 0; d < 34; d++) {
      const zD = -1.96 + (d / 33) * 3.92;
      const dent = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.24, 0.016), chromeMat);
      dent.position.set(0, 2.03, zD);
      registerMesh(dent, "reed_sley");
      sleyPivot.add(dent);
    }

    const shuttleBoxGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.55, metalness: 0.1 });
    for (const zBox of [-2.38, 2.38]) {
      const boxBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.72), darkSteelMat);
      boxBack.position.set(0, 1.56, zBox);
      shuttleBoxGroup.add(boxBack);
    }
    const leftPickStick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.45, 0.09), woodMat);
    leftPickStick.position.set(0, 1.15, -2.55);
    shuttleBoxGroup.add(leftPickStick);

    const rightPickStick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.45, 0.09), woodMat);
    rightPickStick.position.set(0, 1.15, 2.55);
    shuttleBoxGroup.add(rightPickStick);

    registerGroupMeshes(shuttleBoxGroup, "picking_unit");
    sleyPivot.add(shuttleBoxGroup);

    const airManifoldGroup = new THREE.Group();
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 4.1, 14),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.7, roughness: 0.25 }),
    );
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(0.14, 1.5, 0);
    airManifoldGroup.add(pipe);
    for (let n = 0; n < 8; n++) {
      const noz = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 10), brassMat);
      noz.position.set(0.1, 1.62, -1.7 + n * 0.48);
      airManifoldGroup.add(noz);
    }
    registerGroupMeshes(airManifoldGroup, "picking_unit");
    sleyPivot.add(airManifoldGroup);

    scene.add(sleyPivot);

    const crankArms: THREE.Mesh[] = [];
    for (const zArm of [-2.05, 2.05]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1, 0.11, 0.09), brassMat);
      arm.position.set(0.6, -0.78, zArm);
      registerMesh(arm, "reed_sley");
      scene.add(arm);
      crankArms.push(arm);
    }

    // === 6. PICKING CARRIERS ===
    const shuttleMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.14, 0.68, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.2 }),
    );
    shuttleMesh.rotation.x = Math.PI / 2;
    shuttleMesh.position.set(1.05, 0, -2.25);
    registerMesh(shuttleMesh, "picking_unit");
    scene.add(shuttleMesh);

    const rapierMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.85, roughness: 0.2 });
    const rapierLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 2.2), rapierMat);
    rapierLeft.position.set(1.05, 0, -3.2);
    registerMesh(rapierLeft, "picking_unit");
    scene.add(rapierLeft);

    const rapierRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 2.2), rapierMat);
    rapierRight.position.set(1.05, 0, 3.2);
    registerMesh(rapierRight, "picking_unit");
    scene.add(rapierRight);

    const rapierWheelLeft = buildSpurGear(0.42, 0.12, 16, 0x38bdf8);
    rapierWheelLeft.position.set(1.05, -0.45, -2.75);
    registerGroupMeshes(rapierWheelLeft, "picking_unit");
    scene.add(rapierWheelLeft);

    const rapierWheelRight = buildSpurGear(0.42, 0.12, 16, 0x38bdf8);
    rapierWheelRight.position.set(1.05, -0.45, 2.75);
    registerGroupMeshes(rapierWheelRight, "picking_unit");
    scene.add(rapierWheelRight);

    const projectileMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.36), chromeMat);
    projectileMesh.position.set(1.05, 0, -2.25);
    registerMesh(projectileMesh, "picking_unit");
    scene.add(projectileMesh);

    const airJetBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.12, 3.85, 12),
      new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.85,
        transparent: true,
        opacity: 0.72,
      }),
    );
    airJetBeam.rotation.x = Math.PI / 2;
    airJetBeam.position.set(1.05, 0, 0);
    registerMesh(airJetBeam, "picking_unit");
    scene.add(airJetBeam);

    const activeWeftMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const activeWeftMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), activeWeftMat);
    activeWeftMesh.rotation.x = Math.PI / 2;
    activeWeftMesh.visible = false;
    scene.add(activeWeftMesh);

    // === 7. 20 LIVE WARP THREADS ===
    const warpCount = 20;
    const warpLines: THREE.Line[] = [];
    const warpLineMat = new THREE.LineBasicMaterial({ color: 0x2563eb });

    for (let i = 0; i < warpCount; i++) {
      const zPos = -1.85 + (i / (warpCount - 1)) * 3.7;
      const pts = [
        new THREE.Vector3(-4.2, -0.05, zPos),
        new THREE.Vector3(-3.45, 0.06, zPos),
        new THREE.Vector3(-2.85, i % 2 === 0 ? 0.22 : -0.1, zPos),
        new THREE.Vector3(-2.45, i % 2 === 0 ? -0.1 : 0.16, zPos),
        new THREE.Vector3(healdXPositions[i % 4] ?? -0.8, 0, zPos),
        new THREE.Vector3(1.74, 0.06, zPos),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, warpLineMat);
      scene.add(line);
      warpLines.push(line);
    }

    // === 8. LIVE WOVEN CLOTH + TEMPLES ===
    const clothGroup = new THREE.Group();
    const clothRows = 18;
    const clothCols = 20;
    const clothStartX = 1.74;
    const clothEndX = 4.25;
    const cellW = (clothEndX - clothStartX) / clothRows;
    const cellD = 3.76 / clothCols;
    const clothCells: THREE.Mesh[][] = [];

    const clothBase = new THREE.Mesh(
      new THREE.BoxGeometry(clothEndX - clothStartX, 0.025, 3.82),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }),
    );
    clothBase.position.set((clothStartX + clothEndX) / 2, 0.04, 0);
    registerMesh(clothBase, "woven_cloth");
    clothGroup.add(clothBase);

    const cellGeo = new THREE.BoxGeometry(cellW * 0.92, 0.05, cellD * 0.88);
    for (let r = 0; r < clothRows; r++) {
      const rowArr: THREE.Mesh[] = [];
      const xCell = clothStartX + (r + 0.5) * cellW;
      for (let c = 0; c < clothCols; c++) {
        const zCell = -1.88 + (c + 0.5) * cellD;
        const mat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.58 });
        const cell = new THREE.Mesh(cellGeo, mat);
        cell.position.set(xCell, 0.065, zCell);
        registerMesh(cell, "woven_cloth");
        clothGroup.add(cell);
        rowArr.push(cell);
      }
      clothCells.push(rowArr);
    }

    for (const zT of [-1.96, 1.96]) {
      const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.36, 14), brassMat);
      temple.rotation.x = Math.PI / 2;
      temple.position.set(1.94, 0.14, zT);
      registerMesh(temple, "woven_cloth");
      clothGroup.add(temple);
    }
    scene.add(clothGroup);

    // === 9. BREAST BEAM, EMERY ROLLER & CLOTH ROLLER ===
    const breastBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.65, 20), chromeMat);
    breastBeam.rotation.x = Math.PI / 2;
    breastBeam.position.set(4.35, 0.06, 0);
    registerMesh(breastBeam, "breast_beam");
    scene.add(breastBeam);

    const clothRollerGroup = new THREE.Group();
    clothRollerGroup.position.set(4.18, -1.05, 0);
    const clothRollMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 4.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 }),
    );
    clothRollMesh.rotation.x = Math.PI / 2;
    registerMesh(clothRollMesh, "cloth_roller");
    clothRollerGroup.add(clothRollMesh);

    const emeryRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 4.35, 20),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.55 }),
    );
    emeryRoll.rotation.x = Math.PI / 2;
    emeryRoll.position.set(0.28, 0.54, 0);
    registerMesh(emeryRoll, "cloth_roller");
    clothRollerGroup.add(emeryRoll);

    const takeUpGear = buildSpurGear(0.32, 0.1, 16, 0x94a3b8);
    takeUpGear.position.set(0.28, 0.54, 2.28);
    registerGroupMeshes(takeUpGear, "cloth_roller");
    clothRollerGroup.add(takeUpGear);
    scene.add(clothRollerGroup);

    // === POINTER, TOUCH & RAYCAST CONTROLS ===
    const raycaster = new THREE.Raycaster();
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let downX = 0;
    let downY = 0;
    let pinchDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      isLerping = false;
      prevX = e.clientX;
      prevY = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      theta -= dx * 0.008;
      phi = Math.min(Math.PI * 0.48, Math.max(0.22, phi - dy * 0.008));
      desiredTheta = theta;
      desiredPhi = phi;
      updateCamera();
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      const moveDist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moveDist < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const visibleClickables = allClickable.filter((m) => {
          let cur: THREE.Object3D | null = m;
          while (cur) {
            if (!cur.visible) return false;
            cur = cur.parent;
          }
          return true;
        });
        const hits = raycaster.intersectObjects(visibleClickables, false);
        const hit = hits[0];
        if (hit && typeof hit.object.userData.partId === "string") {
          setSelectedPart(hit.object.userData.partId as LoomPartId);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      isLerping = false;
      radius = Math.min(23, Math.max(4.5, radius + e.deltaY * 0.006));
      desiredRadius = radius;
      updateCamera();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (t0 && t1) {
          pinchDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isLerping = false;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (t0 && t1) {
          const newDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
          const diff = pinchDist - newDist;
          pinchDist = newDist;
          radius = Math.min(23, Math.max(4.5, radius + diff * 0.025));
          desiredRadius = radius;
          updateCamera();
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    domEl.addEventListener("wheel", onWheel, { passive: false });
    domEl.addEventListener("touchstart", onTouchStart, { passive: true });
    domEl.addEventListener("touchmove", onTouchMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = Math.max(280, container.clientWidth);
      const h = Math.max(280, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // === ANIMATION LOOP ===
    let rafId = 0;
    let lastTime = performance.now();
    let uiSyncAccum = 0;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (isLerping) {
        const alpha = Math.min(1, dt * 6);
        theta += (desiredTheta - theta) * alpha;
        phi += (desiredPhi - phi) * alpha;
        radius += (desiredRadius - radius) * alpha;
        target.lerp(desiredTarget, alpha);
        updateCamera();
        if (
          Math.abs(desiredTheta - theta) < 0.004 &&
          Math.abs(desiredPhi - phi) < 0.004 &&
          Math.abs(desiredRadius - radius) < 0.01 &&
          target.distanceTo(desiredTarget) < 0.01
        ) {
          isLerping = false;
        }
      }

      const st = stateRef.current;
      const isModern = st.pickingType !== "shuttle";

      // Switch between Conventional Lab Power Loom & Modern Industrial Factory Loom
      conventionalArchGroup.visible = !isModern;
      modernFactoryGroup.visible = isModern;
      cabinetMat.opacity = st.xRayMode ? 0.16 : 0.96;
      cabinetMat.depthWrite = !st.xRayMode;
      cobaltMat.opacity = st.xRayMode ? 0.25 : 0.96;
      cobaltMat.depthWrite = !st.xRayMode;

      // Signal Tower Lamp: Green when running, Amber when paused
      const lampHex = st.isPlaying ? 0x22c55e : 0xf59e0b;
      signalLightMat.color.setHex(lampHex);
      signalLightMat.emissive.setHex(lampHex);

      if (st.isPlaying) {
        const prevAngle = st.crankAngle;
        const degPerSec = 115 * st.speed;
        st.crankAngle = (st.crankAngle + degPerSec * dt) % 360;
        if (st.crankAngle < prevAngle) {
          st.pickIndex += 1;
          setPicksWoven(st.pickIndex);
        }
        uiSyncAccum += dt;
        if (uiSyncAccum >= 0.05) {
          uiSyncAccum = 0;
          setCrankAngle(Math.round(st.crankAngle));
        }
      }

      const deg = st.crankAngle;
      const totalRad = ((st.pickIndex * 360 + deg) * Math.PI) / 180;
      const rad = (deg * Math.PI) / 180;
      const weave = WEAVE_CONFIG[st.weaveType];
      const currentRow = weave.matrix[st.pickIndex % weave.repeat] ?? [1, 0, 1, 0];
      const nextRow = weave.matrix[(st.pickIndex + 1) % weave.repeat] ?? [0, 1, 0, 1];

      warpLineMat.color.setHex(weave.warpColor);
      activeWeftMat.color.setHex(weave.weftColor);
      (clothRollMesh.material as THREE.MeshStandardMaterial).color.setHex(weave.warpColor);

      crankShaftGroup.rotation.z = -totalRad;
      bottomShaftGroup.rotation.z = totalRad * 0.5;
      motorPulley.rotation.z = -totalRad * 2.2;

      let shedOpen = 0;
      if (deg < 100) {
        shedOpen = Math.sin((deg / 100) * (Math.PI / 2));
      } else if (deg <= 255) {
        shedOpen = 1;
      } else {
        shedOpen = Math.cos(((deg - 255) / 105) * (Math.PI / 2));
      }

      const shaftY: number[] = [0, 0, 0, 0];
      for (let s = 0; s < 4; s++) {
        const isUp = (currentRow[s] ?? 0) === 1;
        const nextUp = (nextRow[s] ?? 0) === 1;
        let yVal = 0;
        if (st.shedType === "open") {
          if (isUp && nextUp) {
            yVal = 0.54;
          } else if (!isUp && !nextUp) {
            yVal = -0.54;
          } else {
            yVal = (isUp ? 0.54 : -0.54) * shedOpen;
          }
        } else if (st.shedType === "center_closed") {
          yVal = (isUp ? 0.54 : -0.54) * shedOpen;
        } else {
          yVal = isUp ? -0.4 + 0.94 * shedOpen : -0.4;
        }
        shaftY[s] = yVal;
        const hf = healdFrames[s];
        if (hf) hf.position.y = yVal;

        const pair = topStraps[s];
        if (pair) {
          const topY = 1.82;
          const botY = yVal + 0.96;
          const len = Math.max(0.1, topY - botY);
          for (const strap of pair) {
            strap.scale.y = len;
            strap.position.y = (topY + botY) / 2;
          }
        }

        const lever = treadleLevers[s];
        if (lever) lever.rotation.z = yVal * 0.14;

        const bStrap = botStraps[s];
        if (bStrap) {
          const topY = yVal - 0.96;
          const botY = -1.84 + yVal * 0.22;
          const len = Math.max(0.1, topY - botY);
          bStrap.scale.y = len;
          bStrap.position.y = (topY + botY) / 2;
        }
      }

      const revAng = (shaftY[0] ?? 0) * 1.6;
      for (const r of topRollers) r.rotation.y = revAng;

      for (let i = 0; i < warpCount; i++) {
        const line = warpLines[i];
        if (!line) continue;
        const posAttr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
        posAttr.setY(4, shaftY[i % 4] ?? 0);
        posAttr.needsUpdate = true;
      }

      const pinX = 0.15 + crankRadius * Math.cos(-rad);
      const pinY = -0.78 + crankRadius * Math.sin(-rad);
      const sleyTilt = -0.29 * Math.cos(rad);
      sleyPivot.rotation.z = sleyTilt;

      const attachX = 1.04 - 1.1 * Math.sin(sleyTilt);
      const attachY = -1.88 + 1.1 * Math.cos(sleyTilt);
      const armDx = attachX - pinX;
      const armDy = attachY - pinY;
      const armLen = Math.hypot(armDx, armDy);
      const armAngle = Math.atan2(armDy, armDx);

      for (const arm of crankArms) {
        arm.scale.x = armLen;
        arm.position.x = (pinX + attachX) / 2;
        arm.position.y = (pinY + attachY) / 2;
        arm.rotation.z = armAngle;
      }

      const reedWorldX = 1.04 - 1.95 * Math.sin(sleyTilt);

      const inPick = deg >= 110 && deg <= 245;
      const pickProgress = inPick ? (deg - 110) / 135 : 0;
      const dirLeftToRight = st.pickIndex % 2 === 0;
      const carrierZ = dirLeftToRight
        ? -2.18 + pickProgress * 4.36
        : 2.18 - pickProgress * 4.36;

      shuttleBoxGroup.visible = st.pickingType === "shuttle";
      shuttleMesh.visible = st.pickingType === "shuttle";
      rapierLeft.visible = st.pickingType === "rapier";
      rapierRight.visible = st.pickingType === "rapier";
      rapierWheelLeft.visible = st.pickingType === "rapier";
      rapierWheelRight.visible = st.pickingType === "rapier";
      projectileMesh.visible = st.pickingType === "projectile";
      airManifoldGroup.visible = st.pickingType === "airjet";
      airJetBeam.visible = st.pickingType === "airjet" && inPick;

      if (st.pickingType === "shuttle") {
        shuttleMesh.position.z = inPick ? carrierZ : dirLeftToRight ? -2.35 : 2.35;
        const kick = deg >= 105 && deg <= 140 ? Math.sin(((deg - 105) / 35) * Math.PI) : 0;
        leftPickStick.rotation.x = dirLeftToRight ? kick * 0.45 : 0;
        rightPickStick.rotation.x = !dirLeftToRight ? -kick * 0.45 : 0;
      } else if (st.pickingType === "rapier") {
        const reach = inPick ? Math.sin(pickProgress * Math.PI) : 0;
        rapierLeft.position.z = -3.15 + reach * 2.05;
        rapierRight.position.z = 3.15 - reach * 2.05;
        rapierWheelLeft.rotation.z = reach * 2.8;
        rapierWheelRight.rotation.z = -reach * 2.8;
      } else if (st.pickingType === "projectile") {
        projectileMesh.position.z = inPick ? -2.18 + pickProgress * 4.36 : -2.3;
      } else if (st.pickingType === "airjet") {
        airJetBeam.scale.set(1, Math.max(0.05, pickProgress), 1);
        airJetBeam.position.z = -1.92 + pickProgress * 1.92;
      }

      if (deg >= 110) {
        activeWeftMesh.visible = true;
        const weftLen = inPick ? Math.max(0.15, pickProgress * 3.76) : 3.76;
        activeWeftMesh.scale.set(1, weftLen, 1);
        const startZ =
          st.pickingType === "projectile" || st.pickingType === "airjet" || dirLeftToRight
            ? -1.88
            : 1.88;
        const sign = startZ < 0 ? 1 : -1;
        activeWeftMesh.position.z = inPick ? startZ + sign * (weftLen / 2) : 0;
        activeWeftMesh.position.x = deg <= 245 ? 1.05 : Math.min(1.7, reedWorldX + 0.08);
      } else {
        activeWeftMesh.visible = false;
      }

      const rollAngle = (st.pickIndex * 360 + deg) * 0.0025;
      beamGroup.rotation.z = -rollAngle;
      clothRollMesh.rotation.y = rollAngle * 1.2;
      takeUpGear.rotation.z = -rollAngle * 2.4;

      for (let r = 0; r < clothRows; r++) {
        const rowMeshes = clothCells[r];
        if (!rowMeshes) continue;
        const historicalPick = Math.max(0, st.pickIndex - r);
        const patternRow = weave.matrix[historicalPick % weave.repeat] ?? [1, 0, 1, 0];
        for (let c = 0; c < clothCols; c++) {
          const cell = rowMeshes[c];
          if (!cell) continue;
          const warpOnTop = (patternRow[c % 4] ?? 0) === 1;
          const mat = cell.material as THREE.MeshStandardMaterial;
          mat.color.setHex(warpOnTop ? weave.warpColor : weave.weftColor);
          cell.position.y = warpOnTop ? 0.072 : 0.048;
        }
      }

      const pulse = 0.28 + 0.14 * Math.sin(now * 0.006);
      for (const partKey of Object.keys(partMeshes) as LoomPartId[]) {
        const isSel = partKey === st.selectedPart;
        for (const m of partMeshes[partKey]) {
          if (m === airJetBeam || m === signalLamp || m === hmiDisplay) continue;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && "emissive" in mat) {
            if (isSel) {
              mat.emissive.setHex(0x38bdf8);
              mat.emissiveIntensity = pulse;
            } else {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          }
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domEl.addEventListener("wheel", onWheel);
      domEl.removeEventListener("wheel", onWheel);
      domEl.removeEventListener("touchstart", onTouchStart);
      domEl.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  const phaseInfo = useMemo(() => getPhaseLabel(crankAngle), [crankAngle]);
  const selectedMeta = LOOM_PARTS[selectedPart];
  const weaveMeta = WEAVE_CONFIG[weaveType];
  const pickMeta = PICKING_INFO[pickingType];
  const isModernLoom = pickingType !== "shuttle";

  const needleRad = ((crankAngle - 90) * Math.PI) / 180;
  const nx = 60 + 44 * Math.cos(needleRad);
  const ny = 60 + 44 * Math.sin(needleRad);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1220] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              1. Weave Pattern (Live Cloth)
            </span>
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(WEAVE_CONFIG) as WeaveType[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeaveType(w)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  weaveType === w
                    ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50"
                    : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {WEAVE_CONFIG[w].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{weaveMeta.note}</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1220] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              2. Machine Type &amp; Picking
            </span>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              {pickMeta.ppm}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(PICKING_INFO) as PickingType[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPickingType(p)}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  pickingType === p
                    ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50"
                    : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {PICKING_INFO[p].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{pickMeta.desc}</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-[#0B1220] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              3. Shed Type
            </span>
            <Gauge className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 md:grid-cols-1">
            {(
              [
                { id: "open", label: "Open Shed (High Speed)" },
                { id: "center_closed", label: "Center-Closed Shed" },
                { id: "bottom_closed", label: "Bottom-Closed Shed" },
              ] as const
            ).map((sh) => (
              <button
                key={sh.id}
                type="button"
                onClick={() => setShedType(sh.id)}
                className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                  shedType === sh.id
                    ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/50"
                    : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {sh.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Camera Focus + X-Ray Cutaway Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800/80 bg-[#0B1220] px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Camera className="h-3.5 w-3.5 text-cyan-400" />
            Camera Focus:
          </span>
          {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((cid) => (
            <button
              key={cid}
              type="button"
              onClick={() => selectPreset(cid)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                cameraPreset === cid
                  ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {CAMERA_PRESETS[cid].label}
            </button>
          ))}
        </div>

        {isModernLoom && (
          <button
            type="button"
            onClick={() => setXRayMode((x) => !x)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
              xRayMode
                ? "bg-violet-500/25 text-violet-200 ring-1 ring-violet-400/60"
                : "bg-slate-900 text-slate-300 ring-1 ring-slate-700 hover:bg-slate-800"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            {xRayMode ? "X-Ray Cutaway: ON" : "X-Ray Inside Machine"}
          </button>
        )}
      </div>

      {/* Main 3D Viewport + Side Timing & Inspector */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0B1526]">
            <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-1.5 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className={`text-xs font-semibold ${phaseInfo.color}`}>
                  {phaseInfo.name}
                </span>
                <span className="text-[11px] text-slate-400">
                  &middot; {crankAngle}&deg;
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
                <span className="text-slate-400">{pickMeta.era} &middot;</span>
                <span>Picks:</span>
                <span className="font-bold text-cyan-300">{picksWoven}</span>
              </div>
            </div>

            <div
              ref={mountRef}
              className="h-[360px] w-full cursor-grab touch-none active:cursor-grabbing sm:h-[450px]"
            />

            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => cameraControlsRef.current?.zoom(-1.5)}
                title="Zoom In"
                className="rounded-lg border border-slate-700/80 bg-slate-950/85 p-2 text-slate-200 hover:bg-slate-800"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => cameraControlsRef.current?.zoom(1.5)}
                title="Zoom Out"
                className="rounded-lg border border-slate-700/80 bg-slate-950/85 p-2 text-slate-200 hover:bg-slate-800"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => selectPreset("full")}
                title="Reset Full Loom View"
                className="rounded-lg border border-slate-700/80 bg-slate-950/85 p-2 text-slate-200 hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg bg-slate-950/75 px-2.5 py-1 text-[10px] text-slate-400 backdrop-blur">
              Drag to orbit &middot; Pinch/Scroll to zoom &middot; Click any part to inspect
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-800/80 bg-[#0B1220] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStepIdx(null);
                    setIsPlaying((p) => !p);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isPlaying ? "Pause Loom" : "Run Loom"}
                </button>
                <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-[11px]">
                  {[0.25, 0.6, 1.2].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSpeed(sp)}
                      className={`rounded-lg px-2 py-1 font-medium transition ${
                        speed === sp
                          ? "bg-slate-800 text-cyan-300"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {sp === 0.25 ? "0.25x" : sp === 0.6 ? "0.5x" : "1x"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next =
                      activeStepIdx === null
                        ? 0
                        : (activeStepIdx - 1 + GUIDED_STEPS.length) % GUIDED_STEPS.length;
                    applyStep(next);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800"
                  title="Previous Step"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = activeStepIdx === null ? 0 : (activeStepIdx + 1) % GUIDED_STEPS.length;
                    applyStep(next);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/25"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {activeStepIdx === null
                    ? "Step-by-Step Tour"
                    : `Next Step (${activeStepIdx + 1}/${GUIDED_STEPS.length})`}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Manual Crank Shaft Angle (Scrub 0&deg; &ndash; 360&deg;)</span>
                <span className="font-mono font-semibold text-cyan-300">{crankAngle}&deg;</span>
              </div>
              <input
                type="range"
                min={0}
                max={359}
                value={crankAngle}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setIsPlaying(false);
                  setActiveStepIdx(null);
                  setCrankAngle(val);
                  stateRef.current.crankAngle = val;
                }}
                className="h-2 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {activeStepIdx !== null && GUIDED_STEPS[activeStepIdx] && (
              <div className="mt-3 rounded-xl border border-violet-500/35 bg-violet-500/10 p-3 text-xs text-violet-100">
                <p className="font-semibold text-violet-200">
                  {GUIDED_STEPS[activeStepIdx].title}
                </p>
                <p className="mt-1 text-slate-300">{GUIDED_STEPS[activeStepIdx].summary}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-800/80 bg-[#0B1220] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Loom Timing Diagram (0&deg;&ndash;360&deg;)
              </h3>
              <span className="font-mono text-xs font-bold text-cyan-300">{crankAngle}&deg;</span>
            </div>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#1e293b" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="10"
                  strokeDasharray="36 254"
                  strokeDashoffset="18"
                  transform="rotate(-90 60 60)"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="10"
                  strokeDasharray="108 182"
                  strokeDashoffset="-88"
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="10" textAnchor="middle" fill="#fda4af" fontSize="8" fontWeight="bold">
                  0&deg; Beat-up
                </text>
                <text x="60" y="117" textAnchor="middle" fill="#fcd34d" fontSize="8" fontWeight="bold">
                  180&deg; Picking
                </text>
                <line x1="60" y1="60" x2={nx} y2={ny} stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="60" cy="60" r="4" fill="#38bdf8" />
              </svg>
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Beat-up (335&deg;&ndash;25&deg;)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span>Dwell &amp; Picking (110&deg;&ndash;245&deg;)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                  <span>Shed Open/Close Transition</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 bg-[#0B1220] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                  {selectedMeta.motion}
                </span>
                <h3 className="mt-1 text-sm font-bold text-white">{selectedMeta.name}</h3>
              </div>
              <Info className="h-4 w-4 shrink-0 text-cyan-400" />
            </div>

            <p className="mt-2.5 text-xs leading-relaxed text-slate-300">{selectedMeta.role}</p>

            <div className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Common Fault / Defect</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-rose-100/90">{selectedMeta.defect}</p>
            </div>

            <div className="mt-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Exam &amp; Viva Key Point</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/90">{selectedMeta.vivaTip}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-[#0B1220] p-3.5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Inspect Machine Parts (Click below or directly in 3D)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LOOM_PARTS) as LoomPartId[]).map((partId) => (
            <button
              key={partId}
              type="button"
              onClick={() => setSelectedPart(partId)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                selectedPart === partId
                  ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/60"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {LOOM_PARTS[partId].name.split(" (")[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}