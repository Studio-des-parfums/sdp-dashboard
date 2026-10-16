// sdp-dashboard/src/pages/aglae/analytics/AnalyticsHeader.tsx

import React, { useState } from 'react'
import { Calendar, RefreshCw, X, AlertCircle } from 'lucide-react'
import { getDatePresets } from './analyticsUtils'

interface AnalyticsHeaderProps {
  dateFrom: string
  dateTo: string
  onDateChange: (from: string, to: string) => void
  onRefresh: () => void
  loading?: boolean
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  dateFrom,
  dateTo,
  onDateChange,
  onRefresh,
  loading = false,
}) => {
  const presets = getDatePresets()
  const [localFrom, setLocalFrom] = useState(dateFrom)
  const [localTo, setLocalTo] = useState(dateTo)
  const [dateError, setDateError] = useState<string | null>(null)

  // DÉTECTION DU RACCOURCI TEMPOREL ACTIF :
  // Compare les dates sélectionnées avec les valeurs calculées de chaque preset
  // pour illuminer le bouton correspondant dans l'interface.
  const isPresetActive = (preset: { date_from: string; date_to: string }) => {
    return dateFrom === preset.date_from && dateTo === preset.date_to
  }

  // VALIDATION ET APPLICATION DU FILTRE PERSONNALISÉ :
  // Empêche la saisie d'un intervalle incohérent où la date de début dépasse la date de fin.
  const handleApplyCustomDates = () => {
    if (localFrom && localTo && localFrom > localTo) {
      setDateError('La date de début doit être antérieure à la date de fin')
      return
    }
    setDateError(null)
    onDateChange(localFrom, localTo)
  }

  // RÉINITIALISATION COMPLÈTE DES FILTRES :
  // Vide les champs de saisie et recharge l'ensemble de l'historique sans borne.
  const handleResetDates = () => {
    setLocalFrom('')
    setLocalTo('')
    setDateError(null)
    onDateChange('', '')
  }

  // SÉLECTION D'UN RACCOURCI PRÉDÉFINI :
  // Met à jour les états locaux et propage immédiatement les bornes au parent.
  const handleSelectPreset = (preset: { date_from: string; date_to: string }) => {
    setLocalFrom(preset.date_from)
    setLocalTo(preset.date_to)
    setDateError(null)
    onDateChange(preset.date_from, preset.date_to)
  }

  // Indicateur déterminant si au moins un filtre temporel est actif
  const hasFilter = Boolean(dateFrom || dateTo)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-700 mr-1 flex items-center gap-1.5">
            <Calendar size={14} className="text-indigo-600" />
            Période :
          </span>

          <button
            type="button"
            onClick={() => handleSelectPreset(presets.all)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isPresetActive(presets.all)
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {presets.all.label}
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset(presets.last30Days)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isPresetActive(presets.last30Days)
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {presets.last30Days.label}
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset(presets.thisMonth)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isPresetActive(presets.thisMonth)
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {presets.thisMonth.label}
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset(presets.thisYear)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isPresetActive(presets.thisYear)
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {presets.thisYear.label}
          </button>
        </div>

        {/* Refresh & status */}
        <div className="flex items-center gap-2">
          {hasFilter && (
            <button
              type="button"
              onClick={handleResetDates}
              className="text-xs text-gray-600 hover:text-red-700 flex items-center gap-1 transition-colors px-2 py-1"
              title="Effacer les filtres"
            >
              <X size={13} />
              Réinitialiser
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            title="Rafraîchir les données"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-indigo-600' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Date Pickers */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
        <span className="text-gray-500 font-medium">Plage personnalisée :</span>

        <div className="flex items-center gap-2">
          <label htmlFor="analytics-date-from" className="text-gray-600">Du</label>
          <input
            id="analytics-date-from"
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="analytics-date-to" className="text-gray-600">Au</label>
          <input
            id="analytics-date-to"
            type="date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="button"
          onClick={handleApplyCustomDates}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-colors"
        >
          Appliquer
        </button>

        {dateError && (
          <span className="text-red-700 flex items-center gap-1 text-xs">
            <AlertCircle size={13} />
            {dateError}
          </span>
        )}
      </div>
    </div>
  )
}
