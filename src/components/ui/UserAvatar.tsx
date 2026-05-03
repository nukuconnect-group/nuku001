import { User } from "lucide-react";

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "w-4 h-4",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-16 h-16",
};

const iconSizeMap = {
  xs: "w-2.5 h-2.5",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
  xl: "w-8 h-8",
};

/**
 * Consistent avatar component across the site.
 * When no image is available, shows a circular outlined person icon (like the reference design).
 */
const UserAvatar = ({ src, alt = "", size = "sm", className = "" }: UserAvatarProps) => {
  if (src) {
    return (
      <div className={`${sizeMap[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div className={`${sizeMap[size]} rounded-full border-2 border-muted-foreground/40 flex items-center justify-center flex-shrink-0 bg-transparent ${className}`}>
      <User className={`${iconSizeMap[size]} text-muted-foreground/60`} strokeWidth={1.5} />
    </div>
  );
};

export default UserAvatar;
