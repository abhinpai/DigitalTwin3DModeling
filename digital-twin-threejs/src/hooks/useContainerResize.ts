import { useEffect, useRef, useState, type RefObject } from 'react';

export interface IContainerSize {
  width: number;
  height: number;
}

export interface IUseContainerResizeResult {
  containerRef: RefObject<HTMLElement>;
  containerSize: IContainerSize;
  canRenderCanvas: boolean;
}

export function useContainerResize(): IUseContainerResizeResult {
  const containerRef = useRef<HTMLElement>(null);
  const [containerSize, setContainerSize] = useState<IContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return {
    containerRef,
    containerSize,
    canRenderCanvas: containerSize.width > 0 && containerSize.height > 0,
  };
}
