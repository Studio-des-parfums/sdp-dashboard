import { useState } from 'react'
import { X, Sun, Mail, Lock, Eye, EyeOff, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authClient } from '../api/authClient'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const sections = [
  { id: 'appearance', name: 'Apparence', icon: Sun },
  { id: 'account', name: 'Compte', icon: Mail },
] as const

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { sdpUser } = useAuth()
  const [active, setActive] = useState('appearance')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState({ cur: false, new: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!open) return null

  const resetPasswordFields = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleClose = () => {
    resetPasswordFields()
    setError(null)
    setSuccess(false)
    onClose()
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sdpUser) return
    setError(null)
    setSuccess(false)
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères')
      return
    }
    setLoading(true)
    try {
      await authClient.changePassword(sdpUser.email, currentPassword, newPassword)
      setSuccess(true)
      resetPasswordFields()
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-gray-100 border border-gray-200 rounded-2xl w-full max-w-2xl mx-4 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Paramètres</h2>
          <button
            onClick={handleClose}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex" style={{ minHeight: 320 }}>
          <div className="w-44 border-r border-gray-200 p-3 space-y-1 shrink-0">
            {sections.map((s) => {
              const Icon = s.icon
              const isActive = active === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-indigo-600/10 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={16} />
                  {s.name}
                </button>
              )
            })}
          </div>

          <div className="flex-1 p-6">
            {active === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Apparence</h3>
                  <p className="text-xs text-gray-600">Personnalisez l'affichage de l'application</p>
                </div>

                <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Sun size={18} className="text-amber-600" />
                    <div>
                      <p className="text-sm text-gray-900">Mode clair</p>
                      <p className="text-[11px] text-gray-600">Thème chaud & élégant</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {active === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Compte</h3>
                  <p className="text-xs text-gray-600">Vos identifiants et votre mot de passe</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Adresse email</label>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 opacity-70">
                      <Mail size={15} className="text-gray-700 shrink-0" />
                      <span className="text-sm text-gray-900 flex-1">{sdpUser?.email}</span>
                    </div>
                  </div>

                  {sdpUser?.pseudo && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Pseudo</label>
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 opacity-70">
                        <span className="text-sm text-gray-900 flex-1">{sdpUser.pseudo}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4 pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-900 pt-3">Changer de mot de passe</p>

                    {error && (
                      <p className="text-xs text-red-700 text-center bg-red-500/10 rounded-lg p-2">{error}</p>
                    )}
                    {success && (
                      <p className="text-xs text-emerald-700 text-center bg-emerald-500/10 rounded-lg p-2 flex items-center justify-center gap-1.5">
                        <Check size={13} /> Mot de passe modifié avec succès
                      </p>
                    )}

                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Mot de passe actuel</label>
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-indigo-500 transition-colors">
                        <Lock size={15} className="text-gray-700 shrink-0" />
                        <input
                          type={show.cur ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-transparent text-sm text-gray-900 outline-none flex-1 placeholder-gray-400"
                        />
                        <button type="button" onClick={() => setShow((s) => ({ ...s, cur: !s.cur }))} className="text-gray-500 hover:text-gray-700">
                          {show.cur ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Nouveau mot de passe</label>
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-indigo-500 transition-colors">
                        <Lock size={15} className="text-gray-700 shrink-0" />
                        <input
                          type={show.new ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-transparent text-sm text-gray-900 outline-none flex-1 placeholder-gray-400"
                        />
                        <button type="button" onClick={() => setShow((s) => ({ ...s, new: !s.new }))} className="text-gray-500 hover:text-gray-700">
                          {show.new ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Confirmer le mot de passe</label>
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-indigo-500 transition-colors">
                        <Lock size={15} className="text-gray-700 shrink-0" />
                        <input
                          type={show.confirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-transparent text-sm text-gray-900 outline-none flex-1 placeholder-gray-400"
                        />
                        <button type="button" onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} className="text-gray-500 hover:text-gray-700">
                          {show.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
