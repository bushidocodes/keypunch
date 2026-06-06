// Component tests for Indicator.
//
// Indicator renders an SVG circle that is lit (litColor fill) or unlit
// (unlitColor fill). When isBlinking=true it toggles lit state on a 200ms
// interval. Tests use vi.useFakeTimers() to advance time deterministically.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import Indicator from '../../app/components/Indicator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function circle(container) {
  return container.querySelector('svg circle');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Indicator', () => {
  describe('static rendering', () => {
    it('renders unlit (unlitColor fill) by default', () => {
      const { container } = render(<Indicator />);
      expect(circle(container).getAttribute('fill')).toBe('#000');
    });

    it('renders lit (litColor fill) when isLit=true and not blinking', () => {
      const { container } = render(<Indicator isLit={true} />);
      expect(circle(container).getAttribute('fill')).toBe('#FEFDFE');
    });

    it('respects custom unlitColor', () => {
      const { container } = render(<Indicator isLit={false} unlitColor="#123456" />);
      expect(circle(container).getAttribute('fill')).toBe('#123456');
    });

    it('respects custom litColor', () => {
      const { container } = render(<Indicator isLit={true} litColor="#abcdef" />);
      expect(circle(container).getAttribute('fill')).toBe('#abcdef');
    });
  });

  describe('blink lifecycle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('toggles lit state on interval when isBlinking=true', () => {
      const { container } = render(<Indicator isBlinking={true} />);
      const c = circle(container);

      // Before any tick: starts unlit (default isLit=false)
      const initialFill = c.getAttribute('fill');

      // Advance one blink interval — wrap in act so React flushes state updates
      act(() => {
        vi.advanceTimersByTime(200);
      });
      const afterOneTick = c.getAttribute('fill');
      expect(afterOneTick).not.toBe(initialFill);

      // Advance another interval — should toggle back
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(c.getAttribute('fill')).toBe(initialFill);
    });

    it('clears the interval when isBlinking changes from true to false', () => {
      const { container, rerender } = render(<Indicator isBlinking={true} />);
      const c = circle(container);

      const initialFill = c.getAttribute('fill');

      // Start blinking for one tick
      act(() => {
        vi.advanceTimersByTime(200);
      });
      const blinkFill = c.getAttribute('fill');
      expect(blinkFill).not.toBe(initialFill);

      // Turn blinking off
      rerender(<Indicator isBlinking={false} isLit={false} />);

      const fillAfterStop = c.getAttribute('fill');

      // Advance more time — interval should be cleared, no further toggling
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(c.getAttribute('fill')).toBe(fillAfterStop);
    });

    it('clears interval on unmount (no lingering ticks after unmount)', () => {
      const { container, unmount } = render(<Indicator isBlinking={true} />);
      const c = circle(container);
      const fillBeforeUnmount = c.getAttribute('fill');

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(c.getAttribute('fill')).not.toBe(fillBeforeUnmount);

      unmount();
      // After unmount, advancing timers should not throw (interval cleared)
      expect(() => {
        act(() => vi.advanceTimersByTime(2000));
      }).not.toThrow();
    });
  });
});
