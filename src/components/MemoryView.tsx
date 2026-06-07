'use client'

import { useState } from 'react'
import { Pin } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pencil, Calendar, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

type MemoryViewProps = {
  pin: Pin | null
  memories: Pin[]
  onClose: () => void
  onEdit: (pin: Pin) => void
  onChange: (pin: Pin) => void
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 280 : -280, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -280 : 280, opacity: 0 }),
}

export default function MemoryView({ pin, memories, onClose, onEdit, onChange }: MemoryViewProps) {
  const [direction, setDirection] = useState(0)

  const idx = pin ? memories.findIndex(m => m.id === pin.id) : -1
  const hasPrev = idx > 0
  const hasNext = idx >= 0 && idx < memories.length - 1

  const go = (delta: number) => {
    const next = idx + delta
    if (next < 0 || next >= memories.length) return
    setDirection(delta)
    onChange(memories[next])
  }

  const visitDate = pin?.scheduled_at || pin?.created_at
  const dateLabel = visitDate
    ? format(new Date(visitDate), 'yyyy年M月d日（E） HH:mm', { locale: ja })
    : ''

  return (
    <AnimatePresence>
      {pin && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="relative bg-[var(--surface)] rounded-t-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[88vh] overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="w-10 h-1 bg-[var(--border-soft)] rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

            {/* ヘッダー */}
            <div className="px-6 pt-2 pb-3 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                思い出{memories.length > 1 ? ` ${idx + 1}/${memories.length}` : ''}
              </span>
              <button onClick={onClose} className="p-2 bg-[var(--surface-sunken)] rounded-full text-[var(--text-muted)] hover:opacity-80">
                <X size={18} />
              </button>
            </div>

            {/* スワイプで切り替わるコンテンツ */}
            <div className="relative overflow-hidden">
              {/* 左右ナビ矢印 */}
              {hasPrev && (
                <button
                  onClick={() => go(-1)}
                  className="absolute left-2 top-[120px] z-10 bg-black/35 text-white rounded-full p-1.5 active:scale-90"
                  aria-label="前の思い出"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {hasNext && (
                <button
                  onClick={() => go(1)}
                  className="absolute right-2 top-[120px] z-10 bg-black/35 text-white rounded-full p-1.5 active:scale-90"
                  aria-label="次の思い出"
                >
                  <ChevronRight size={20} />
                </button>
              )}

              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={pin.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.5}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -70) go(1)
                    else if (info.offset.x > 70) go(-1)
                  }}
                  className="px-6 pb-6 overflow-y-auto"
                >
                  {/* 写真 */}
                  {pin.photo_url ? (
                    <div className="w-full rounded-2xl overflow-hidden border border-[var(--border-soft)] mb-4 pointer-events-none">
                      <img src={pin.photo_url} alt={pin.title} className="w-full max-h-72 object-cover" draggable={false} />
                    </div>
                  ) : (
                    <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-[var(--border-soft)] bg-[var(--surface-sunken)] flex flex-col items-center justify-center text-[var(--text-muted)] mb-4">
                      <ImageIcon size={36} className="mb-2 opacity-50" />
                      <span className="text-sm font-medium">写真がありません</span>
                    </div>
                  )}

                  {/* タイトル */}
                  <h2 className="text-xl font-extrabold text-[var(--text-strong)] mb-2 leading-snug">
                    {pin.title || '無題の思い出'}
                  </h2>

                  {/* 行った日時 */}
                  {dateLabel && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] font-bold mb-4">
                      <Calendar size={16} className="text-orange-500" />
                      {dateLabel}
                    </div>
                  )}

                  {/* コメント */}
                  {pin.notes ? (
                    <div className="bg-[var(--surface-sunken)] rounded-2xl p-4 text-sm text-[var(--text-strong)] leading-relaxed whitespace-pre-wrap border border-[var(--border-soft)]">
                      {pin.notes}
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--text-muted)] py-2">コメントはありません。</div>
                  )}

                  {/* 編集ボタン */}
                  <button
                    onClick={() => onEdit(pin)}
                    className="mt-5 w-full bg-[var(--color-primary)] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md text-base active:scale-[0.98]"
                  >
                    <Pencil size={18} />
                    編集する
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
