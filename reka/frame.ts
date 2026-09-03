// reka/frame.ts
"use client";

import { useEffect, useRef, useState } from "react";
import type { Reka, Frame } from "@rekajs/core";

interface UseRekaFrameReturn {
  frame: Frame | null;
  isReady: boolean;
}

export function useRekaFrame(
  reka: Reka,
  componentName = "App"
): UseRekaFrameReturn {
  const frameRef = useRef<Frame | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const frame = reka.createFrame({
      id: `builder-frame-${componentName}`,
      component: { name: componentName },
    });

    frameRef.current = frame;
    setIsReady(true);

    return () => {
      // ✅ reka.removeFrame() — frame.destroy() does not exist on this type
      reka.removeFrame(frame);
      frameRef.current = null;
      setIsReady(false);
    };
  }, [reka, componentName]);

  return { frame: frameRef.current, isReady };
}