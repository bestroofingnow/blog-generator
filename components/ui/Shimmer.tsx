// components/ui/Shimmer.tsx
// Shimmer loading placeholder component

import styles from "../../styles/ModernUI.module.css";

interface ShimmerProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export default function Shimmer({
  width = "100%",
  height = 20,
  borderRadius = 8,
  className = "",
}: ShimmerProps) {
  return (
    <div
      className={`${styles.shimmer} ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
      }}
    />
  );
}

// Pre-built shimmer patterns
export function ShimmerCard({ className = "" }: { className?: string }) {
  return (
    <div className={className} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Shimmer height={24} width="60%" />
      <Shimmer height={16} width="100%" />
      <Shimmer height={16} width="80%" />
      <Shimmer height={16} width="40%" />
    </div>
  );
}

export function ShimmerText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} height={16} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

export function ShimmerAvatar({ size = 48, className = "" }: { size?: number; className?: string }) {
  return <Shimmer width={size} height={size} borderRadius="50%" className={className} />;
}
