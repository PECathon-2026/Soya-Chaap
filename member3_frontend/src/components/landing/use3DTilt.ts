"use client";

import { useState, useCallback, useRef } from "react";

export function use3DTilt(maxTilt = 12) {
  const [transform, setTransform] = useState({
    rotateX: 0,
    rotateY: 0,
    shineX: 50,
    shineY: 50,
  });

  const ref = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      const shineX = (x / rect.width) * 100;
      const shineY = (y / rect.height) * 100;

      setTransform({ rotateX, rotateY, shineX, shineY });
    },
    [maxTilt]
  );

  const handleMouseLeave = useCallback(() => {
    setTransform({ rotateX: 0, rotateY: 0, shineX: 50, shineY: 50 });
  }, []);

  return { ref, transform, handleMouseMove, handleMouseLeave };
}
