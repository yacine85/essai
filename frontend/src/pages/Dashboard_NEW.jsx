import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  RefreshCw, 
  Settings, 
  AlertTriangle,
  Download,
  RotateCcw
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import KPICard from '../components/KPICard'
import { PerformanceChart, ProductionLineChart } from '../components/Charts'
import { KPIActionModal, ResetStateModal } from '../components/KPIModals'
import { API_URL } from '../config/api'

const defaultIndicators = [
  { name: 'TRG', objective: 95, unit: '%', inverse: false },
  { name: 'FOR', objective: 95, unit: '%', inverse: false },
  { name: 'FPY', objective: 98, unit: '%', inverse: false },
  { name: 'Qtés', objective: 1000, unit: '', inverse: false },
  { name: 'DMH', objective: 8, unit: 'h', inverse: true },
  { name: 'EF', objective: 100, unit: '%', inverse: false },
]

function Dashboard() {
  const { getAuthHeader, hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  // Data states
  const [kpiData, setKpiData] = useState({})
  const [chartData, setChartData] = useState({
    performance: [],
    cms2Lines: [],
    integrationLines: []
  })

  // Modal states
  const [kpiActionModal, setKpiActionModal] = useState({ show: false, kpi: null })
  const [resetModal, setResetModal] = useState({ show: false, item: null })

  const fetchData = async () => {
    try {
      const authHeader = getAuthHeader()
      
      // Simulation de données - remplacer par vrai appels API
      const mockData = {
        trg: { value: 92, objective: 95, status: 'warning', trend: -2 },
        for: { value: 96, objective: 95, status: 'success', trend: 1.5 },
        fpy: { value: 97, objective: 98, status: 'warning', trend: -0.5 },
        qty: { value: 985, objective: 1000, status: 'warning', trend: -1.2 },
        dmh: { value: 8.2, objective: 8, status: 'warning', trend: 0.3 },
        ef: { value: 99, objective: 100, status: 'success', trend: 0.2 }
      }

      setKpiData(mockData)

      // Mock chart data
      const mockChartData = {
        performance: [
          { date: '7j', TRG: 90, FOR: 94, FPY: 96 },
          { date: '6j', TRG: 91, FOR: 95, FPY: 97 },
          { date: '5j', TRG: 92, FOR: 95, FPY: 97 },
          { date: '4j', TRG: 92, FOR: 96, FPY: 97 },
          { date: '3j', TRG: 92, FOR: 96, FPY: 97 },
          { date: '2j', TRG: 92, FOR: 96, FPY: 97 },
          { date: 'Auj', TRG: 92, FOR: 96, FPY: 97 }
        ],
        cms2Lines: [
          { date: '7j', 'EE PRO': 88, 'Claro': 92, 'Wawoo': 85 },
          { date: '6j', 'EE PRO': 89, 'Claro': 93, 'Wawoo': 86 },
          { date: '5j', 'EE PRO': 90, 'Claro': 94, 'Wawoo': 88 },
          { date: '4j', 'EE PRO': 91, 'Claro': 95, 'Wawoo': 89 },
          { date: '3j', 'EE PRO': 91, 'Claro': 95, 'Wawoo': 90 },
          { date: '2j', 'EE PRO': 92, 'Claro': 96, 'Wawoo': 91 },
          { date: 'Auj', 'EE PRO': 92, 'Claro': 96, 'Wawoo': 91 }
        ],
        integrationLines: [
          { date: '7j', 'OPL': 94, 'Integration': 92 },
          { date: '6j', 'OPL': 94, 'Integration': 92 },
          { date: '5j', 'OPL': 94, 'Integration': 92 },
          { date: '4j', 'OPL': 95, 'Integration': 93 },
          { date: '3j', 'OPL': 95, 'Integration': 93 },
          { date: '2j', 'OPL': 96, 'Integration': 96 },
          { date: 'Auj', 'OPL': 96, 'Integration': 96 }
        ]
      }

      setChartData(mockChartData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleKPIClick = (kpiName, kpiData) => {
    setKpiActionModal({
      show: true,
      kpi: {
        name: kpiName,
        value: kpiData.value,
        objective: kpiData.objective
      }
    })
  }

  const handleSaveAction = (actionData) => {
    console.log('Action saved:', actionData)
    setKpiActionModal({ show: false, kpi: null })
  }

  const handleResetConfirm = () => {
    console.log('Reset confirmed for:', resetModal.item)
    setResetModal({ show: false, item: null })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header Controls */}
      <motion.div 
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}
      >
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Dashboard QRQC</h1>
          <p style={{ color: '#718096', fontSize: '14px' }}>Suivi des indicateurs de performance</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />

          <button 
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </button>

          {isAdmin && (
            <button className="btn btn-primary">
              <Settings size={18} />
              Configuration
            </button>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : (
        <motion.div
          className="dashboard-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* KPI Summary Cards - 3 columns top */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 4' }}>
            <KPICard
              title="TRG (Taux de Rendement Global)"
              value={kpiData.trg?.value || 0}
              objective={95}
              status={kpiData.trg?.status || 'neutral'}
              trend={kpiData.trg?.trend}
              interactive={isAdmin}
              onClick={() => isAdmin && handleKPIClick('TRG', kpiData.trg)}
            />
          </motion.div>

          <motion.div variants={itemVariants} style={{ gridColumn: 'span 4' }}>
            <KPICard
              title="FOR (Taux de Fiabilité Opérationnelle)"
              value={kpiData.for?.value || 0}
              objective={95}
              status={kpiData.for?.status || 'neutral'}
              trend={kpiData.for?.trend}
              interactive={isAdmin}
              onClick={() => isAdmin && handleKPIClick('FOR', kpiData.for)}
            />
          </motion.div>

          <motion.div variants={itemVariants} style={{ gridColumn: 'span 4' }}>
            <KPICard
              title="FPY (Premier Passage Juste)"
              value={kpiData.fpy?.value || 0}
              objective={98}
              status={kpiData.fpy?.status || 'neutral'}
              trend={kpiData.fpy?.trend}
              interactive={isAdmin}
              onClick={() => isAdmin && handleKPIClick('FPY', kpiData.fpy)}
            />
          </motion.div>

          {/* Performance Chart - 6 columns */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 6' }}>
            <PerformanceChart
              data={chartData.performance}
              title="Performance Globale (7 derniers jours)"
              kpis={['TRG', 'FOR', 'FPY']}
              objective={95}
            />
          </motion.div>

          {/* Additional KPIs - 3 columns on right */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 3' }}>
            <KPICard
              title="Quantités (Tâches/jour)"
              value={kpiData.qty?.value || 0}
              unit=""
              objective={1000}
              status={kpiData.qty?.status || 'neutral'}
            />
          </motion.div>

          <motion.div variants={itemVariants} style={{ gridColumn: 'span 3' }}>
            <KPICard
              title="DMH (Durée Moyenne Horaire)"
              value={kpiData.dmh?.value || 0}
              unit=" h"
              objective={8}
              status={kpiData.dmh?.status || 'neutral'}
            />
          </motion.div>

          {/* CMS2 Chart - Full width */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 6' }}>
            <ProductionLineChart
              data={chartData.cms2Lines}
              title="Performance Atelier CMS2 (par ligne de production)"
            />
          </motion.div>

          {/* CMS2 Details Card - 3 columns */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 3' }}>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>CMS2 - Actions</h3>
                {isAdmin && (
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => setResetModal({ show: true, item: 'CMS2' })}
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
              <div className="card-body">
                <div style={{ fontSize: '12px', color: '#718096', lineHeight: '1.8' }}>
                  <p><strong>Dernière mise à jour:</strong> {selectedDate}</p>
                  <p><strong>Statut:</strong> <span style={{ color: '#38a169', fontWeight: 600 }}>Actif</span></p>
                  <p><strong>Lignes:</strong> 3 (EE PRO, Claro, Wawoo)</p>
                  <p style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    {isAdmin ? (
                      <button className="btn btn-sm btn-primary" style={{ width: '100%' }}>
                        <Plus size={14} />
                        Nouvelle ligne
                      </button>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Integration Chart */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 6' }}>
            <ProductionLineChart
              data={chartData.integrationLines}
              title="Performance Atelier Intégration (par ligne de production)"
            />
          </motion.div>

          {/* Integration Details Card */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 3' }}>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Intégration - Actions</h3>
                {isAdmin && (
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => setResetModal({ show: true, item: 'Intégration' })}
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
              <div className="card-body">
                <div style={{ fontSize: '12px', color: '#718096', lineHeight: '1.8' }}>
                  <p><strong>Dernière mise à jour:</strong> {selectedDate}</p>
                  <p><strong>Statut:</strong> <span style={{ color: '#38a169', fontWeight: 600 }}>Actif</span></p>
                  <p><strong>Lignes:</strong> 2 (OPL, Intégration)</p>
                  <p style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    {isAdmin ? (
                      <button className="btn btn-sm btn-primary" style={{ width: '100%' }}>
                        <Plus size={14} />
                        Nouvelle ligne
                      </button>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Additional Indicators - E F */}
          <motion.div variants={itemVariants} style={{ gridColumn: 'span 3' }}>
            <KPICard
              title="Efficacité(EF)"
              value={kpiData.ef?.value || 0}
              objective={100}
              status={kpiData.ef?.status || 'neutral'}
              trend={kpiData.ef?.trend}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Modals */}
      {kpiActionModal.kpi && (
        <KPIActionModal
          show={kpiActionModal.show}
          onClose={() => setKpiActionModal({ show: false, kpi: null })}
          onSave={handleSaveAction}
          kpiName={kpiActionModal.kpi.name}
          currentValue={kpiActionModal.kpi.value}
          objective={kpiActionModal.kpi.objective}
        />
      )}

      <ResetStateModal
        show={resetModal.show}
        onClose={() => setResetModal({ show: false, item: null })}
        onConfirm={handleResetConfirm}
        itemName={resetModal.item}
      />
    </div>
  )
}

export default Dashboard
