import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

function normalizeSuggestion(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

export default function AIActionSuggestion({
  cause,
  currentAction,
  onAccept,
  apiUrl,
  authHeaders
}) {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)

  const causeValue = useMemo(() => String(cause || '').trim(), [cause])
  const canGenerate = causeValue.length > 0 && !loading

  const requestSuggestion = async (isRegenerate = false) => {
    if (!causeValue) return

    setLoading(true)
    setError('')
    setVisible(true)

    try {
      const response = await fetch(`${apiUrl}/ai/actions`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cause: causeValue,
          previousAction: isRegenerate ? suggestion : ''
        })
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Erreur lors de la génération IA')
      }

      const nextSuggestion = normalizeSuggestion(payload.action)
      if (!nextSuggestion) {
        throw new Error('Aucune proposition exploitable n\'a été générée')
      }

      setSuggestion(nextSuggestion)
    } catch (requestError) {
      setError(requestError.message || 'Erreur inattendue')
      setSuggestion('')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    if (!suggestion) return
    onAccept(suggestion)
    setVisible(false)
  }

  const handleIgnore = () => {
    setVisible(false)
    setSuggestion('')
    setError('')
  }

  return (
    <div className="tw-mt-3 tw-space-y-3">
      <div className="tw-flex tw-items-center tw-justify-end">
        <button
          type="button"
          className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-amber-300 tw-bg-amber-50 tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-text-amber-700 tw-shadow-sm tw-transition hover:tw-bg-amber-100 disabled:tw-cursor-not-allowed disabled:tw-border-slate-200 disabled:tw-bg-slate-100 disabled:tw-text-slate-400"
          onClick={() => requestSuggestion(false)}
          disabled={!canGenerate}
          title={!causeValue ? 'Veuillez saisir une cause' : 'Générer une action corrective'}
        >
          <span aria-hidden="true">✨</span>
          Générer avec IA
        </button>
      </div>

      <AnimatePresence>
        {visible && (
          <motion.div
            className="tw-overflow-hidden tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-gradient-to-br tw-from-white tw-to-slate-50 tw-p-4 tw-shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
              <p className="tw-text-sm tw-font-semibold tw-text-slate-800">Suggestion IA premium</p>
              {loading && (
                <div className="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-medium tw-text-slate-500">
                  <span className="tw-h-4 tw-w-4 tw-animate-spin tw-rounded-full tw-border-2 tw-border-slate-300 tw-border-t-amber-500" />
                  Génération en cours...
                </div>
              )}
            </div>

            <div className="tw-mt-3 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-3">
              {error ? (
                <p className="tw-text-sm tw-font-medium tw-text-red-600">{error}</p>
              ) : suggestion ? (
                <p className="tw-text-sm tw-leading-relaxed tw-text-slate-700">{suggestion}</p>
              ) : (
                <p className="tw-text-sm tw-text-slate-500">Préparation de la meilleure action corrective...</p>
              )}
            </div>

            <div className="tw-mt-4 tw-flex tw-flex-wrap tw-gap-2">
              <button
                type="button"
                className="tw-rounded-lg tw-bg-emerald-600 tw-px-3 tw-py-2 tw-text-sm tw-font-semibold tw-text-white tw-transition hover:tw-bg-emerald-700 disabled:tw-cursor-not-allowed disabled:tw-bg-emerald-300"
                onClick={handleAccept}
                disabled={!suggestion || loading}
              >
                ✅ Accepter
              </button>
              <button
                type="button"
                className="tw-rounded-lg tw-border tw-border-slate-300 tw-bg-white tw-px-3 tw-py-2 tw-text-sm tw-font-semibold tw-text-slate-700 tw-transition hover:tw-bg-slate-100 disabled:tw-cursor-not-allowed disabled:tw-text-slate-400"
                onClick={() => requestSuggestion(true)}
                disabled={!causeValue || loading || (!suggestion && !error)}
                title={!causeValue ? 'Veuillez saisir une cause' : 'Demander une nouvelle proposition'}
              >
                🔄 Régénérer
              </button>
              <button
                type="button"
                className="tw-rounded-lg tw-border tw-border-rose-200 tw-bg-rose-50 tw-px-3 tw-py-2 tw-text-sm tw-font-semibold tw-text-rose-700 tw-transition hover:tw-bg-rose-100"
                onClick={handleIgnore}
              >
                ❌ Ignorer
              </button>
            </div>

            {currentAction && suggestion && (
              <p className="tw-mt-2 tw-text-xs tw-text-slate-400">
                Accepter remplacera le texte actuel du champ action.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
