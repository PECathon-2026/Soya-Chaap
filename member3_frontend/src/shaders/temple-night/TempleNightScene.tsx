import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { createTempleNightRenderer } from "./templeNightRenderer.js";

/* The Yosemite world is a sibling of this one: same rig, same foreground
   plates, same bloom chain, a different valley. It is reached as a variant of
   this scene rather than as its own entry, and it is loaded lazily so that
   opening either world never downloads both renderers. */
const YosemiteSunsetScene = lazy(() =>
  import("../yosemite-sunset/YosemiteSunsetScene").then((module) => ({ default: module.YosemiteSunsetScene })),
);
const PresidioSunsetScene = lazy(() =>
  import("../presidio-sunset/PresidioSunsetScene").then((module) => ({ default: module.PresidioSunsetScene })),
);
const LakeLouiseScene = lazy(() =>
  import("../lake-louise/LakeLouiseScene").then((module) => ({ default: module.LakeLouiseScene })),
);

export type TempleNightVariant = "temple-night" | "yosemite-sunset" | "presidio-sunset" | "lake-louise";

export type TempleNightSceneProps = {
  className?: string;
  variant?: TempleNightVariant;
};

export function TempleNightScene({ className = "", variant = "temple-night" }: TempleNightSceneProps) {
  const fallback = <div className={`temple-night-scene${className ? ` ${className}` : ""}`} data-state="loading" />;
  if (variant === "yosemite-sunset") {
    return <Suspense fallback={fallback}><YosemiteSunsetScene className={className} /></Suspense>;
  }
  if (variant === "presidio-sunset") {
    return <Suspense fallback={fallback}><PresidioSunsetScene className={className} /></Suspense>;
  }
  if (variant === "lake-louise") {
    return <Suspense fallback={fallback}><LakeLouiseScene className={className} /></Suspense>;
  }
  return <TempleNightWorld className={className} />;
}

function TempleNightWorld({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    let renderer;
    try {
      renderer = createTempleNightRenderer(canvas);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown renderer error");
      setState("unavailable");
      return undefined;
    }
    if (!renderer) {
      setState("unavailable");
      return undefined;
    }

    let frame = 0;
    let visible = true;
    let disposed = false;
    let rendered = false;

    const schedule = () => {
      if (!disposed && visible && !document.hidden && !frame) {
        frame = requestAnimationFrame(render);
      }
    };
    const render = (time: number) => {
      frame = 0;
      renderer.render(time);
      if (!rendered) {
        rendered = true;
        setState("ready");
      }
      if (!renderer.reducedMotion) schedule();
    };
    const resize = () => {
      renderer.resize();
      schedule();
    };
    const setPointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
      const y = 1 - ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2;
      renderer.setPointer(x, y, true);
      schedule();
    };
    const clearPointer = () => {
      renderer.setPointer(0, 0, false);
      schedule();
    };
    const onVisibility = () => {
      if (document.hidden && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        schedule();
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        schedule();
      }
    });
    intersectionObserver.observe(host);
    canvas.addEventListener("pointermove", setPointer, { passive: true });
    canvas.addEventListener("pointerenter", setPointer, { passive: true });
    canvas.addEventListener("pointerleave", clearPointer, { passive: true });
    window.addEventListener("blur", clearPointer);
    document.addEventListener("visibilitychange", onVisibility);
    resize();

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      canvas.removeEventListener("pointermove", setPointer);
      canvas.removeEventListener("pointerenter", setPointer);
      canvas.removeEventListener("pointerleave", clearPointer);
      window.removeEventListener("blur", clearPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`temple-night-scene${className ? ` ${className}` : ""}`} ref={hostRef} data-state={state}>
      <canvas
        ref={canvasRef}
        className={`temple-night-canvas${state === "ready" ? " is-ready" : ""}`}
        aria-label="Interactive Kage mountain temple world after dark"
      />
      {state === "unavailable" ? (
        <p className="temple-night-unavailable" role="status">WebGL is unavailable: {errorMessage || "unsupported context"}.</p>
      ) : null}
    </div>
  );
}
