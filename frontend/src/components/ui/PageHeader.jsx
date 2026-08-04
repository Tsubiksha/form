import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function PageHeader({ title, description, eyebrow, action, backTo }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {backTo && (
          <button className="btn-icon btn-ghost" onClick={() => navigate(backTo)} style={{ marginTop: 2 }}>
            <ChevronLeft size={20} />
          </button>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {eyebrow && <span className="text-label" style={{ color: 'var(--brand-600)' }}>{eyebrow}</span>}
          <h1 className="text-h1" style={{ margin: 0 }}>{title}</h1>
          {description && <p className="text-body" style={{ margin: 0, opacity: 0.8 }}>{description}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
