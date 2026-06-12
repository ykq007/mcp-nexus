import React from 'react';

interface KpiCardProps {
  /** Label text above the value */
  title?: string;
  /** Alias for title (OverviewPage compat) */
  label?: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: string; isPositive: boolean };
  hint?: string;
  variant?: 'primary' | 'success' | 'warning' | 'neutral' | 'keys' | 'tokens' | 'usage';
  onClick?: () => void;
}

export function KpiCard({ title, label, value, icon, trend, hint, variant = 'neutral', onClick }: KpiCardProps) {
  const displayTitle = title ?? label;
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      className="kpiCard"
      onClick={onClick}
      data-variant={variant}
      type={onClick ? 'button' : undefined}
    >
      <div className="kpiCardHeader">
        <div className="kpiCardLabel">{displayTitle}</div>
        {icon ? <div className="kpiCardIcon" data-variant={variant}>{icon}</div> : null}
      </div>
      <div className="kpiValue">{value}</div>
      <div className="kpiCardFooter">
        {trend ? (
          <span className={`statusPill statusPill--${trend.isPositive ? 'success' : 'danger'}`}>
            {trend.value}
          </span>
        ) : null}
        {hint ? <div className="creditsMeta">{hint}</div> : null}
        {onClick ? <span className="kpiCardArrow" aria-hidden="true">→</span> : null}
      </div>
    </Tag>
  );
}
