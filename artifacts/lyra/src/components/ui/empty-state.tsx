import { motion } from "framer-motion";
import { Link } from "wouter";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({ icon, title, description, action, size = "md" }: EmptyStateProps) {
  const py = size === "sm" ? "py-8" : size === "lg" ? "py-20" : "py-14";
  const box = size === "sm" ? "w-10 h-10 rounded-xl" : "w-14 h-14 rounded-2xl";
  const iconCls = size === "sm" ? "[&>svg]:w-5 [&>svg]:h-5" : "[&>svg]:w-6 [&>svg]:h-6";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center ${py} text-center px-4`}
    >
      <div className={`${box} bg-muted/25 flex items-center justify-center mb-3 text-muted-foreground/40 ${iconCls}`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground/70 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Link href={action.href} className="text-xs text-primary hover:underline font-medium">
              {action.label} →
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="text-xs text-primary hover:underline font-medium"
            >
              {action.label} →
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
