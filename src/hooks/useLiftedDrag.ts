/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, RefObject } from 'react';

interface UseLiftedDragOptions {
  active: boolean;
  elementRef: RefObject<HTMLElement | null>;
  startClientYRef: RefObject<number | null>;
  onMove: (deltaY: number) => void;
  onEnd: () => void;
}

export function useLiftedDrag({
  active,
  elementRef,
  startClientYRef,
  onMove,
  onEnd,
}: UseLiftedDragOptions) {
  useEffect(() => {
    if (!active) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (startClientYRef.current === null) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startClientYRef.current;
      onMove(deltaY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (startClientYRef.current === null) return;
      const currentY = e.clientY;
      const deltaY = currentY - startClientYRef.current;
      onMove(deltaY);
    };

    const handleEnd = () => {
      onEnd();
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [active, onMove, onEnd, startClientYRef]);
}
