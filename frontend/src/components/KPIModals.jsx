import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export function KPIActionModal({ show, onClose, onSave, kpiName, currentValue, objective }) {
  const [formData, setFormData] = useState({
    action: '',
    responsible: '',
    deadline: '',
    priority: 'medium',
    description: ''
  })

  if (!show) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.action.trim()) {
      onSave(formData)
      setFormData({ action: '', responsible: '', deadline: '', priority: 'medium', description: '' })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div 
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '550px' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className="modal-header">
          <div>
            <h3>Nouvelle Action - {kpiName}</h3>
            <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
              Valeur actuelle: {currentValue} | Objectif: {objective}
            </p>
          </div>
          <button className="btn btn-outline btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Action à mener *</label>
              <input 
                type="text"
                className="form-input"
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                placeholder="Décrivez l'action"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (optionnel)</label>
              <textarea 
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Détails supplémentaires..."
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Responsable</label>
                <input 
                  type="text"
                  className="form-input"
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  placeholder="Nom du responsable"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Priorité</label>
                <select 
                  className="form-select"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="critical">Critique</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Délai souhaité</label>
              <input 
                type="date"
                className="form-input"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Créer l'action
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export function ResetStateModal({ show, onClose, onConfirm, itemName }) {
  if (!show) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div 
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '400px' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className="modal-header">
          <h3>Réinitialiser {itemName}</h3>
          <button className="btn btn-outline btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p>
            Êtes-vous sûr de vouloir réinitialiser <strong>{itemName}</strong> à l'état initial?
          </p>
          <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '12px' }}>
            Cette action ne pourra pas être annulée.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button 
            className="btn btn-danger" 
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            Oui, réinitialiser
          </button>
        </div>
      </motion.div>
    </div>
  )
}
