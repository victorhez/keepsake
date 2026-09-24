/* eslint-disable @next/next/no-img-element */
import clsx from "clsx";

export function AssetLogo({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={clsx("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/5", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" width={size} height={size} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="font-serif text-ink" style={{ fontSize: size * 0.45 }}>
          {name.slice(0, 1)}
        </span>
      )}
    </span>
  );
}
