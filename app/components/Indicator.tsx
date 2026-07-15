import { useEffect, useState } from 'react';

interface IndicatorProps {
  isLit?: boolean;
  isBlinking?: boolean;
  unlitColor?: string;
  litColor?: string;
}

export default function Indicator({
  isLit: initialLit = false,
  isBlinking = false,
  unlitColor = '#000',
  litColor = '#FEFDFE',
}: IndicatorProps) {
  const [lit, setLit] = useState(initialLit);

  // Sync lit state when isLit prop changes and not blinking.
  useEffect(() => {
    if (!isBlinking) setLit(initialLit);
  }, [initialLit, isBlinking]);

  // Start/stop blink interval; cleanup on unmount or when isBlinking changes.
  useEffect(() => {
    if (!isBlinking) return;
    const id = setInterval(() => setLit((v) => !v), 200);
    return () => clearInterval(id);
  }, [isBlinking]);

  return (
    <svg viewBox="0 0 200 200" width="15px" height="15px">
      <circle
        cx="100"
        cy="100"
        r="100"
        fill={lit ? litColor : unlitColor}
        stroke="#000"
      />
    </svg>
  );
}
