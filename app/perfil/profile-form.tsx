'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { ImageUpload } from '@/components/image-upload'
import { initials } from '@/components/user-sidebar'
import { card, input, label, btnPrimary, alertError } from '@/components/ui'

export function ProfileForm({
  initialName,
  initialAvatar,
  email,
}: {
  initialName: string
  initialAvatar: string
  email: string
}) {
  const [name, setName] = useState(initialName)
  const [avatar, setAvatar] = useState(initialAvatar)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sessão expirada. Faça login novamente.')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: name.trim(), avatar_url: avatar || null })
      .eq('id', user.id)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)

    if (password.length < 6) {
      setPwMsg({ ok: false, text: 'A senha deve ter pelo menos 6 caracteres' })
      return
    }
    if (password !== password2) {
      setPwMsg({ ok: false, text: 'As senhas não coincidem' })
      return
    }

    setPwSaving(true)
    const { error: pwError } = await supabase.auth.updateUser({ password })
    setPwSaving(false)

    if (pwError) {
      setPwMsg({ ok: false, text: pwError.message })
    } else {
      setPwMsg({ ok: true, text: 'Senha alterada com sucesso!' })
      setPassword('')
      setPassword2('')
    }
  }

  return (
    <>
      <form onSubmit={saveProfile} className={`${card} p-6 space-y-5`}>
        <h2 className="font-semibold">Dados pessoais</h2>

        {error && <div className={alertError}>{error}</div>}
        {saved && (
          <div className="p-3 rounded-xl bg-primary/15 text-primary text-sm font-medium">
            Perfil atualizado com sucesso!
          </div>
        )}

        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              initials(name || email)
            )}
          </div>
          <ImageUpload
            value={avatar}
            onChange={setAvatar}
            label="Foto de perfil"
            folder="avatars"
          />
        </div>

        <div>
          <label className={label}>Nome completo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={input}
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label className={label}>Email</label>
          <input type="email" value={email} className={`${input} opacity-60`} disabled />
          <p className="text-xs text-muted-foreground mt-1.5">O email não pode ser alterado.</p>
        </div>

        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>

      <form onSubmit={changePassword} className={`${card} p-6 space-y-5`}>
        <h2 className="font-semibold">Alterar senha</h2>

        {pwMsg && (
          <div
            className={`p-3 rounded-xl text-sm font-medium ${
              pwMsg.ok ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'
            }`}
          >
            {pwMsg.text}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>
          <div>
            <label className={label}>Confirmar senha</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className={input}
              placeholder="Repita a senha"
              minLength={6}
            />
          </div>
        </div>

        <button type="submit" disabled={pwSaving} className={btnPrimary}>
          {pwSaving ? 'Alterando...' : 'Alterar senha'}
        </button>
      </form>
    </>
  )
}
