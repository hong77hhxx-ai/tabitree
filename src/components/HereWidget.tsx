'use client'

import { Pin } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, X } from 'lucide-react'
import { useState } from 'react'

type HereWidgetProps = {
  pins: Pin[]
  onSelectPin: (pin: Pin) => void
}

export default function HereWidget({ pins, onSelectPin }: HereWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)

  const herePins = pins.filter(p => {
    if (p.category !== 'Here') return false
    if (p.scheduled_at && new Date(p.scheduled_at) < new Date()) return false
    return true
  })

  if (herePins.length === 0) return null

  return (
    <div className="absolute bottom-6 left-4 z-10 flex flex-col items-start gap-2">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="bg-[var(--surface)] rounded-2xl shadow-xl border border-[var(--border-soft)] overflow-hidden w-52"
          >
            <div className="px-4 py-3 border-b border-[var(--border-soft)] flex items-center justify-between">
              <span className="text-xs font-bold text-violet-500">今ここにいる人</span>
              <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:opacity-70">
                <X size={14} />
              </button>
            </div>
            <div className="py-1 max-h-48 overflow-y-auto">
              {herePins.map(pin => (
                <button
                  key={pin.id}
                  onClick={() => { onSelectPin(pin); setIsOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-violet-500/10 active:bg-violet-500/20 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                    <Users size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[var(--text-strong)] truncate">
                      {pin.title || 'ここにいるよ'}
                    </div>
                    {pin.notes && (
                      <div className="text-xs text-[var(--text-muted)] truncate">{pin.notes}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* フローティングバッジ */}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        whileTap={{ scale: 0.9 }}
        className="relative bg-violet-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg border-2 border-white"
      >
        <Users size={24} />
        {/* バッジカウント */}
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white">
          {herePins.length}
        </div>
        {/* パルスリング */}
        <div className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-30" />
      </motion.button>
    </div>
  )
}
