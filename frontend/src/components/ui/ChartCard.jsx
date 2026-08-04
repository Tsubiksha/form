import { useTranslation } from "react-i18next";
import { ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardBody } from "./Card";

export function ChartCard({ title, subtitle, icon, action, children, height = 260, loading = false, empty = false }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} icon={icon} action={action} />
      <CardBody>
        {loading ? (
          <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <div className="btn-spinner" style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--brand-600)' }} />
          </div>
        ) : empty ? (
          <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-tertiary)' }}>
            <span style={{ fontSize: 24 }}>📊</span>
            <span style={{ fontSize: 13 }}>{t('ui.no_data_available', `No data available`)}</span>
          </div>
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
