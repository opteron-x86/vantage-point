import { cn } from "@/lib/utils/cn";

type LogoProps = {
  /** Pixel dimension — icon is square */
  size?: number;
  /** Include the baseline + summit dot? Default true; set false for tiny sizes */
  detailed?: boolean;
  className?: string;
  "aria-hidden"?: boolean;
};

/**
 * Vantage Point mark: three overlapping alpine peaks in a Nord tonal ramp.
 *
 * The colors are hardcoded rather than themed on purpose — this is brand art.
 * It should look identical on every surface (light card, dark dashboard,
 * exported screenshots) rather than inverting with the theme.
 */
export function Logo({
  size = 20,
  detailed = true,
  className,
  "aria-hidden": ariaHidden = true,
}: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn("flex-shrink-0", className)}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : "img"}
    >
      {/* Back peak: nord-3, muted and farthest */}
      <polygon points="8,36 18,18 28,36" fill="#4C566A" />
      {/* Middle peak: nord-10, mid-depth */}
      <polygon points="16,36 28,12 40,36" fill="#5E81AC" />
      {/* Foreground peak: nord-8 accent, closest */}
      <polygon points="26,36 34,20 42,36" fill="#88C0D0" />

      {detailed ? (
        <>
          {/* Horizon line grounds the composition */}
          <line
            x1="6"
            y1="36"
            x2="42"
            y2="36"
            stroke="#434C5E"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          {/* Summit mark on the foreground peak — subtle callback to the
              status indicator dot used elsewhere in the UI */}
          <circle cx="34" cy="20" r="1" fill="#ECEFF4" />
        </>
      ) : null}
    </svg>
  );
}
