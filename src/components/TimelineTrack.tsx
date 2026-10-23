/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useLayoutEffect, useRef, useState } from 'react';

interface TimelineTrackProps {
  children: React.ReactNode;
}

interface TrackSegment {
  left: number;
  top: number;
  height: number;
  background: string;
  dashed: boolean;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState<TrackSegment[]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateTrack = () => {
      const bubbles = container.querySelectorAll<HTMLElement>('[data-timeline-bubble]');
      if (bubbles.length < 2) {
        setSegments([]);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const gaps = Array.from(container.querySelectorAll<HTMLElement>('[data-timeline-gap]'));
      const nextSegments: TrackSegment[] = [];

      for (let index = 0; index < bubbles.length - 1; index += 1) {
        const firstBubble = bubbles[index];
        const nextBubble = bubbles[index + 1];
        const firstRect = firstBubble.getBoundingClientRect();
        const nextRect = nextBubble.getBoundingClientRect();
        const gapElement = gaps.find((gap) =>
          Boolean(firstBubble.compareDocumentPosition(gap) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          Boolean(gap.compareDocumentPosition(nextBubble) & Node.DOCUMENT_POSITION_FOLLOWING)
        );
        const gapMinutes = Number(gapElement?.dataset.timelineGap || 0);
        const firstColor = firstBubble.dataset.taskColor || '#cbd5e1';
        const nextColor = nextBubble.dataset.taskColor || firstColor;
        const top = firstRect.top + firstRect.height / 2 - containerRect.top;
        const bottom = nextRect.top + nextRect.height / 2 - containerRect.top;
        const height = Math.max(0, bottom - top);

        if (height > 0) {
          nextSegments.push({
            left: firstRect.left + firstRect.width / 2 - containerRect.left,
            top,
            height,
            background: firstColor === nextColor
              ? firstColor
              : `linear-gradient(to bottom, ${firstColor}, ${nextColor})`,
            dashed: gapMinutes >= 50,
          });
        }
      }

      setSegments((current) =>
        current.length === nextSegments.length &&
        current.every((segment, index) =>
          segment.left === nextSegments[index].left &&
          segment.top === nextSegments[index].top &&
          segment.height === nextSegments[index].height &&
          segment.background === nextSegments[index].background &&
          segment.dashed === nextSegments[index].dashed
        )
          ? current
          : nextSegments
      );
    };

    updateTrack();
    const observer = new ResizeObserver(updateTrack);
    observer.observe(container);
    container.querySelectorAll('[data-timeline-bubble]').forEach((bubble) => observer.observe(bubble));
    container.querySelectorAll('[data-timeline-gap]').forEach((gap) => observer.observe(gap));
    return () => observer.disconnect();
  });

  return (
    <div ref={containerRef} className="relative">
      {segments.map((segment, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="pointer-events-none absolute z-0 w-[2.5px]"
          style={{
            left: `${segment.left}px`,
            top: `${segment.top}px`,
            height: `${segment.height}px`,
            transform: 'translateX(-50%)',
            background: segment.background,
            ...(segment.dashed
              ? {
                  maskImage: 'repeating-linear-gradient(to bottom, #000 0 3px, transparent 3px 7px)',
                  WebkitMaskImage: 'repeating-linear-gradient(to bottom, #000 0 3px, transparent 3px 7px)',
                }
              : {}),
          }}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
