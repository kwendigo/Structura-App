/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, RefObject } from 'react';

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
  const onMoveRef = useRef(onMove);
  const onEndRef = useRef(onEnd);

  onMoveRef.current = onMove;
  onEndRef.current = onEnd;

  useEffect(() => {
    if (!active) return;

    const scrollContainer = (() => {
      let element = elementRef.current?.parentElement ?? null;
      while (element && element !== document.body) {
        const { overflowY } = window.getComputedStyle(element);
        if (element.scrollHeight > element.clientHeight && /(auto|scroll)/.test(overflowY)) {
          return element;
        }
        element = element.parentElement;
      }
      return document.scrollingElement as HTMLElement | null;
    })();
    let edgeScrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let edgeScrollInterval: ReturnType<typeof setInterval> | null = null;
    let edgeScrollDirection = 0;

    const stopEdgeScroll = () => {
      if (edgeScrollTimeout) clearTimeout(edgeScrollTimeout);
      if (edgeScrollInterval) clearInterval(edgeScrollInterval);
      edgeScrollTimeout = null;
      edgeScrollInterval = null;
      edgeScrollDirection = 0;
    };

    const updateEdgeScroll = (clientY: number) => {
      if (!scrollContainer) return;
      const bounds = scrollContainer.getBoundingClientRect();
      const edgeSize = bounds.height * 0.1;
      const direction = clientY <= bounds.top + edgeSize
        ? -1
        : clientY >= bounds.bottom - edgeSize
          ? 1
          : 0;

      if (direction === edgeScrollDirection) return;
      stopEdgeScroll();
      if (direction === 0) return;

      edgeScrollDirection = direction;
      edgeScrollTimeout = setTimeout(() => {
        edgeScrollInterval = setInterval(() => {
          if (!scrollContainer) return;
          scrollContainer.scrollTop += direction * 6;
        }, 16);
      }, 1500);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startClientYRef.current === null) return;
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startClientYRef.current;
      updateEdgeScroll(currentY);
      onMoveRef.current(deltaY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (startClientYRef.current === null) return;
      const currentY = e.clientY;
      const deltaY = currentY - startClientYRef.current;
      updateEdgeScroll(currentY);
      onMoveRef.current(deltaY);
    };

    const handleEnd = () => {
      stopEdgeScroll();
      onEndRef.current();
    };

    if (startClientYRef.current !== null) {
      updateEdgeScroll(startClientYRef.current);
    }
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);

    return () => {
      stopEdgeScroll();
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [active, elementRef, startClientYRef]);
}
