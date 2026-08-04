export function Badge({ children, variant = "default", className = "" }) {
  let bg = "var(--gray-100)";
  let color = "var(--text-secondary)";
  
  if (variant === "success") { bg = "var(--success-50)"; color = "var(--success-600)"; }
  else if (variant === "warning") { bg = "var(--warning-50)"; color = "var(--warning-600)"; }
  else if (variant === "danger") { bg = "var(--danger-50)"; color = "var(--danger-600)"; }
  else if (variant === "brand") { bg = "var(--brand-50)"; color = "var(--brand-600)"; }
  else if (variant === "info") { bg = "var(--info-50)"; color = "var(--info-600)"; }

  return (
    <span className={`badge ${className}`} style={{ background: bg, color }}>
      {children}
    </span>
  );
}
