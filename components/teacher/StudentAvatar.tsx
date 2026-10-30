import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function StudentAvatar({
  name,
  gender,
  photoUrl,
  size = "lg",
  className,
}: {
  name: string;
  gender?: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size === "md" ? "default" : size} className={className}>
      <AvatarImage src={photoUrl ?? undefined} alt="" />
      <AvatarFallback
        className={cn(
          "font-bold",
          gender === "FEMALE"
            ? "bg-pink-100 text-pink-700"
            : "bg-primary-100 text-primary-700",
        )}
      >
        {name.charAt(0)}
      </AvatarFallback>
    </Avatar>
  );
}
