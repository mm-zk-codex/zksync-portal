import { getInitials } from "../utils/assets";

type LogoBadgeProps = {
  label: string;
  src?: string | null;
  size?: number;
  shape?: "circle" | "rounded";
};

export const LogoBadge = ({ label, src, size = 36, shape = "rounded" }: LogoBadgeProps) => {
  const initials = getInitials(label);
  return (
    <div
      className={`logo-badge ${shape}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-label={label}
    >
      {src ? <img src={src} alt="" loading="lazy" /> : <span>{initials}</span>}
    </div>
  );
};
