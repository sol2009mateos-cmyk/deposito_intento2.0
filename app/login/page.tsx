'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg('Email o contraseña incorrectos.')
      setCargando(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={entrar}
        className="bg-[#161922] border border-gray-800 rounded-lg p-8 w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <span className="text-4xl">🏭</span>
          <h1 className="text-2xl font-bold text-white mt-2">Depósito</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresá con tu usuario</p>
        </div>

        <label className="block text-gray-400 text-sm mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-4 outline-none focus:border-blue-500"
        />

        <label className="block text-gray-400 text-sm mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mb-4 outline-none focus:border-blue-500"
        />

        {errorMsg && <p className="text-red-400 text-sm mb-4">{errorMsg}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg py-2"
        >
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
