import React, { useEffect, useRef } from 'react';

/**
 * Hook to add momentum/smooth scrolling to a container using the mouse wheel.
 * Useful for lists that need a smoother feel than the native browser scroll.
 * 
 * @param ref React ref to the scrollable element
 * @param options Configuration options
 */
export const useMomentumScroll = (
  ref: React.RefObject<HTMLElement>,
  options: {
    sensitivity?: number;
    friction?: number;
    threshold?: number;
  } = {}
) => {
  const {
    sensitivity = 1.0,
    friction = 0.95,
    threshold = 0.5
  } = options;

  const frame = useRef<number>(0);
  const velocity = useRef<number>(0);
  const isScrolling = useRef<boolean>(false);
  const lastTime = useRef<number>(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent default to take control of scrolling
      e.preventDefault();
      
      // Calculate delta based on deltaMode (0: pixel, 1: line, 2: page)
      let delta = e.deltaY;
      if (e.deltaMode === 1) {
        delta *= 40; // Approx line height
      } else if (e.deltaMode === 2) {
        delta *= element.clientHeight;
      }

      // Add to velocity
      velocity.current += delta * sensitivity;
      
      if (!isScrolling.current) {
        isScrolling.current = true;
        lastTime.current = performance.now();
        frame.current = requestAnimationFrame(animateScroll);
      }
    };

    const animateScroll = (time: number) => {
      if (!element) return;

      // Calculate time delta to be frame-rate independent
      // Limit delta to avoid huge jumps if tab was backgrounded
      const deltaTime = Math.min(time - lastTime.current, 50);
      lastTime.current = time;
      
      // Apply velocity
      // We normalize to ~16.6ms (60fps) to keep friction consistent
      const frameRatio = deltaTime / 16.6;
      
      // Update scroll position
      const previousScrollTop = element.scrollTop;
      element.scrollTop += velocity.current * frameRatio;
      
      // Apply friction
      // Friction is applied per frame-ratio
      velocity.current *= Math.pow(friction, frameRatio);

      // Check bounds to stop velocity if we hit edges
      const atTop = element.scrollTop <= 0;
      const atBottom = element.scrollTop >= element.scrollHeight - element.clientHeight;

      if ((atTop && velocity.current < 0) || (atBottom && velocity.current > 0)) {
        velocity.current = 0;
      }

      // Stop if velocity is negligible
      if (Math.abs(velocity.current) < threshold) {
        velocity.current = 0;
        isScrolling.current = false;
        return; // Stop loop
      }

      if (isScrolling.current) {
        frame.current = requestAnimationFrame(animateScroll);
      }
    };

    // Add event listener with passive: false to allow preventDefault
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
      if (frame.current) {
        cancelAnimationFrame(frame.current);
      }
    };
  }, [ref, sensitivity, friction, threshold]);
};
