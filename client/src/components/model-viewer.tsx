// Before/after colour preview (three.js). Loaded on demand only, so three.js never reaches the main bundle.
import { useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RotateCcw } from "lucide-react";
import type { PreviewMesh } from "@/engine/preview-mesh";
import { cn } from "@/lib/utils";

export interface PreviewRow {
  fil: number;
  type: string;
  before: string;
  after: string;
  slot: number;
}
type Mode = "split" | "before" | "after";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function colourAttr(fil: Uint8Array, colours: Map<number, string>): BufferAttribute {
  const lut = new Map<number, [number, number, number]>();
  const col = new Color();
  const arr = new Float32Array(fil.length * 9);
  for (let t = 0; t < fil.length; t++) {
    const f = fil[t];
    let c = lut.get(f);
    if (!c) {
      col.set(colours.get(f) || "#B0B0B0");
      c = [col.r, col.g, col.b];
      lut.set(f, c);
    }
    for (let v = 0; v < 3; v++) arr.set(c, t * 9 + v * 3);
  }
  return new BufferAttribute(arr, 3);
}

export default function ModelViewer({
  mesh,
  rows,
  beforeLabel,
  afterLabel,
}: {
  mesh: PreviewMesh;
  rows: PreviewRow[];
  beforeLabel: string;
  afterLabel: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("split");
  const [plateIdx, setPlateIdx] = useState(0);
  const [gl] = useState(hasWebGL);
  const [failed, setFailed] = useState(false);
  const [wide, setWide] = useState(true);
  const resetRef = useRef<() => void>(() => {});
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const renderRef = useRef<() => void>(() => {});
  const plate = mesh.plates[Math.min(plateIdx, mesh.plates.length - 1)];

  useEffect(() => {
    const el = host.current;
    if (!el || !gl || !plate) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "default" });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setScissorTest(true);
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("data-testid", "preview-canvas");
    el.appendChild(renderer.domElement);
    const lost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);

    const pos = new BufferAttribute(plate.pos, 3);
    const before = new Map(rows.map((r) => [r.fil, r.before]));
    const after = new Map(rows.map((r) => [r.fil, r.after]));
    const make = (colours: Map<number, string>) => {
      const g = new BufferGeometry();
      g.setAttribute("position", pos);
      g.setAttribute("color", colourAttr(plate.fil, colours));
      return g;
    };
    const gA = make(before), gB = make(after);
    gA.computeVertexNormals();
    gB.setAttribute("normal", gA.getAttribute("normal"));
    gA.computeBoundingBox();
    const box = gA.boundingBox || new Box3(new Vector3(), new Vector3(1, 1, 1));
    const centre = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const radius = Math.max(size.length() / 2, 1);
    const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0, side: DoubleSide, flatShading: true });

    const scenes = [gA, gB].map((g) => {
      const s = new Scene();
      const m = new Mesh(g, mat);
      m.position.set(-centre.x, -centre.y, -box.min.z);
      s.add(m);
      const grid = new GridHelper(Math.ceil((Math.max(size.x, size.y) * 1.4) / 10) * 10 || 10, 10, 0x8a94a6, 0xc4cad4);
      grid.rotation.x = Math.PI / 2;
      (grid.material as any).transparent = true;
      (grid.material as any).opacity = 0.5;
      s.add(grid);
      s.add(new AmbientLight(0xffffff, 0.55));
      s.add(new HemisphereLight(0xffffff, 0x667080, 1.1));
      const head = new DirectionalLight(0xffffff, 1.6);
      s.add(head);
      return { s, head };
    });
    const camera = new PerspectiveCamera(35, 1, Math.max(radius / 100, 0.05), radius * 100);
    camera.up.set(0, 0, 1);
    const target = new Vector3(0, 0, size.z / 2);
    const reset = () => {
      const d = radius / Math.sin((camera.fov * Math.PI) / 360) * 1.05;
      camera.position.set(target.x + d * 0.55, target.y - d * 0.7, target.z + d * 0.45);
      controls.target.copy(target);
      controls.update();
      render();
    };
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.screenSpacePanning = true;
    controls.minDistance = radius * 0.2;
    controls.maxDistance = radius * 20;

    let w = 1, h = 1;
    const render = () => {
      const m = modeRef.current;
      // headlight: light comes from the viewer's direction
      scenes.forEach(({ head }) => head.position.copy(camera.position));
      const side = w >= 560;
      const views: [Scene, number, number, number, number][] =
        m === "split"
          ? side
            ? [[scenes[0].s, 0, 0, w / 2, h], [scenes[1].s, w / 2, 0, w / 2, h]]
            : [[scenes[0].s, 0, h / 2, w, h / 2], [scenes[1].s, 0, 0, w, h / 2]]
          : [[scenes[m === "before" ? 0 : 1].s, 0, 0, w, h]];
      renderer.setScissor(0, 0, w, h);
      renderer.clear();
      for (const [s, x, y, vw, vh] of views) {
        renderer.setViewport(x, y, vw, vh);
        renderer.setScissor(x, y, vw, vh);
        camera.aspect = vw / Math.max(vh, 1);
        camera.updateProjectionMatrix();
        renderer.render(s, camera);
      }
    };
    const resize = () => {
      w = Math.max(el.clientWidth, 1);
      h = Math.max(el.clientHeight, 1);
      setWide(w >= 560);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      render();
    };
    controls.addEventListener("change", render);
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    reset();
    resetRef.current = reset;
    renderRef.current = render;
    el.setAttribute("data-ready", "1");
    return () => {
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      gA.dispose();
      gB.dispose();
      mat.dispose();
      scenes.forEach(({ s }) => s.traverse((o: any) => o.isLineSegments && (o.geometry.dispose(), o.material.dispose())));
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      el.removeAttribute("data-ready");
    };
  }, [mesh, plate, rows, gl]);

  useEffect(() => renderRef.current(), [mode]);

  const changed = rows.some((r) => r.before.toUpperCase() !== r.after.toUpperCase());
  const noGl = !gl || failed;
  return (
    <div className="space-y-3" data-testid="colour-preview">
      {!noGl && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Preview view">
            {(["split", "before", "after"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={m === mode}
                onClick={() => setMode(m)}
                className={cn("rounded-md px-3 py-1 text-xs transition-colors", m === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                data-testid={`preview-mode-${m}`}
              >
                {m === "split" ? "Both" : m === "before" ? "Before" : "After"}
              </button>
            ))}
          </div>
          {mesh.plates.length > 1 && (
            <div className="inline-flex flex-wrap rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Plate">
              {mesh.plates.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={i === plateIdx}
                  onClick={() => setPlateIdx(i)}
                  className={cn("rounded-md px-2.5 py-1 text-xs transition-colors", i === plateIdx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  data-testid={`preview-plate-${p.id}`}
                >
                  {`Plate ${p.id}`}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => resetRef.current()}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            data-testid="preview-reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset view
          </button>
        </div>
      )}
      {noGl ? (
        <p className="rounded-lg border border-card-border bg-muted/60 p-3 text-sm" data-testid="preview-no-webgl">
          The 3D preview needs WebGL, which is turned off or unavailable in this browser. The colour list below shows the same before and after colours.
        </p>
      ) : (
        <div className="relative h-[min(60vh,480px)] min-h-[260px] w-full touch-none overflow-hidden rounded-lg border border-card-border bg-muted/40">
          <div ref={host} className="absolute inset-0" data-testid="preview-viewport" />
          {mode === "split" ? (
            <>
              <span className={cn("pointer-events-none absolute left-2 top-2 truncate", wide ? "max-w-[45%]" : "max-w-[90%]", "rounded bg-background/85 px-2 py-0.5 text-xs font-medium")}>{beforeLabel}</span>
              <span
                className={cn("pointer-events-none absolute truncate rounded bg-background/85 px-2 py-0.5 text-xs font-medium", wide ? "left-[calc(50%+0.5rem)] top-2 max-w-[45%]" : "left-2 top-[calc(50%+0.5rem)] max-w-[90%]")}
              >
                {afterLabel}
              </span>
              <span className={cn("pointer-events-none absolute bg-border", wide ? "inset-y-0 left-1/2 w-px" : "inset-x-0 top-1/2 h-px")} />
            </>
          ) : (
            <span className="pointer-events-none absolute left-2 top-2 max-w-[80%] truncate rounded bg-background/85 px-2 py-0.5 text-xs font-medium">
              {mode === "before" ? beforeLabel : afterLabel}
            </span>
          )}
        </div>
      )}
      {!noGl && <p className="text-xs text-muted-foreground">Drag to rotate, pinch or scroll to zoom, right-drag or two-finger drag to pan.</p>}
      {(mesh.decimated || mesh.paintSimplified) && (
        <p className="text-xs text-muted-foreground" data-testid="preview-simplified">
          {`Large model: showing ${mesh.shownTriangles.toLocaleString("en-US")} of its triangles${mesh.decimated ? " in a simplified mesh" : ""}${mesh.paintSimplified ? " with the finest painted detail merged" : ""}. The converted file keeps every triangle.`}
        </p>
      )}
      <ul className="grid gap-1.5 sm:grid-cols-2" data-testid="preview-legend">
        {rows.map((r) => (
          <li key={r.fil} className="flex items-center gap-2 rounded-md border border-card-border px-2 py-1.5 text-xs">
            <span className="w-4 text-right font-mono text-muted-foreground">{r.fil}</span>
            <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-black/15 dark:border-white/20" style={{ background: r.before }} aria-hidden />
            <span className="font-mono text-muted-foreground">{r.before}</span>
            <span aria-hidden>→</span>
            <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-black/15 dark:border-white/20" style={{ background: r.after }} aria-hidden />
            <span className="min-w-0 truncate">{`Slot ${r.slot}`}</span>
            <span className="ml-auto truncate text-muted-foreground" translate="no">{r.type}</span>
          </li>
        ))}
      </ul>
      {!changed && <p className="text-xs text-muted-foreground">Every colour keeps its own slot, so before and after look the same.</p>}
    </div>
  );
}
