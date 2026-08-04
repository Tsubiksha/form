export function Card({ children, className = "" }) {
  return (
    <div className={`dash-card ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, action, className = "" }) {
  return (
    <div className={`dash-card-header ${className}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="dash-card-title">
          {Icon && <Icon size={16} />}
          {title}
        </div>
        {subtitle && <span className="dash-card-subtitle">{subtitle}</span>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = "", noPadding = false }) {
  return (
    <div className={`dash-card-body ${className}`} style={noPadding ? { padding: 0 } : {}}>
      {children}
    </div>
  );
}
