import {
  Building2,
  Circle,
  Diamond,
  Hexagon,
  Square,
  Triangle,
  Truck,
  Warehouse,
  Wrench,
} from "lucide-react";

const named = {
  warehouse: Warehouse,
  truck: Truck,
  building: Building2,
  wrench: Wrench,
} as const;

export function LocationMark({
  color,
  icon,
  name,
  size = 16,
}: {
  color: string;
  icon: string;
  name?: string | null;
  size?: number;
}) {
  const Named = named[icon as keyof typeof named];

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        className="inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size, color }}
        aria-hidden
      >
        {icon === "triangle" ? (
          <Triangle fill={color} stroke={color} className="size-full" />
        ) : icon === "square" ? (
          <Square fill={color} stroke={color} className="size-full" />
        ) : icon === "diamond" ? (
          <Diamond fill={color} stroke={color} className="size-full" />
        ) : icon === "hexagon" ? (
          <Hexagon fill={color} stroke={color} className="size-full" />
        ) : Named ? (
          <Named className="size-full" color={color} />
        ) : (
          <Circle fill={color} stroke={color} className="size-full" />
        )}
      </span>
      {name ? <span className="truncate">{name}</span> : null}
    </span>
  );
}
