import type { CSSProperties } from "react";

type GridPatternProps = {
  lineColor?: string;
  size?: number;
  className?: string;
};

const DEFAULT_LINE_COLOR = "rgba(16, 111, 76, 0.08)";

export default function GridPattern({
  lineColor = DEFAULT_LINE_COLOR,
  size = 32,
  className = "",
}: GridPatternProps) {
  const style: CSSProperties = {
    backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
    backgroundSize: `${size}px ${size}px`,
  };

  return <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`} style={style} />;
}
