import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

export default function KPICard({ 
  title, 
  value, 
  unit = '%', 
  objective, 
  status = 'neutral', 
  trend = null,
  onClick = null,
  interactive = false 
}) {
  const statusColors = {
    success: { bg: 'rgba(56, 161, 105, 0.1)', border: '#38a169', text: '#38a169' },
    warning: { bg: 'rgba(214, 158, 46, 0.1)', border: '#d69e2e', text: '#d69e2e' },
    danger: { bg: 'rgba(229, 62, 62, 0.1)', border: '#e53e3e', text: '#e53e3e' },
    neutral: { bg: 'rgba(26, 54, 93, 0.05)', border: '#1a365d', text: '#1a202c' }
  }

  const colors = statusColors[status]

  return (
    <motion.div
      className="kpi-card"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        cursor: interactive ? 'pointer' : 'default'
      }}
      whileHover={interactive ? { scale: 1.02 } : {}}
      whileTap={interactive ? { scale: 0.98 } : {}}
      onClick={onClick}
    >
      <div className="kpi-header">
        <div>
          <div className="kpi-title">{title}</div>
          {objective && (
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
              Cible: {objective}{unit}
            </div>
          )}
        </div>
        {interactive && (
          <div style={{ fontSize: '12px', color: colors.text, fontWeight: 600 }}>
            Cliquer pour détails
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '12px' }}>
        <div 
          className="kpi-value" 
          style={{ color: colors.text }}
        >
          {value}{unit}
        </div>
        
        {trend !== null && (
          <div 
            className="kpi-trend"
            style={{ color: trend > 0 ? '#38a169' : '#e53e3e' }}
          >
            {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {status === 'warning' && (
        <div style={{ marginTop: '8px', color: '#d69e2e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={14} />
          Attention requise
        </div>
      )}
      
      {status === 'danger' && (
        <div style={{ marginTop: '8px', color: '#e53e3e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={14} />
          Action requise
        </div>
      )}
    </motion.div>
  )
}
