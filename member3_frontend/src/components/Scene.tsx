import { TempleNightScene } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

export function Scene() {
  return (
    <div className="shader-frame">
      <TempleNightScene
        variant="temple-night"
      />
    </div>
  );
}
