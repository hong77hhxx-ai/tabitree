'use client'

import { Pin } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Calendar } from 'lucide-react'
import { format, differenceInDays, differenceInHours, isSameDay, isAfter, parseISO } from 'date-fns'
import { useState } from 'react'

type CountdownWidgetProps = {
  pins: Pin[]
  onPinSelect?: (pin: Pin) => void
}

export default function CountdownWidget({ pins, onPinSelect }: CountdownWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const now = new Date()

  // 未来の予定のみ取得（Hereカテゴリは除外）
  const scheduledPins = pins
    .filter(p => p.category !== 'Here' && p.scheduled_at && isAfter(parseISO(p.scheduled_at), now))
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())

  if (scheduledPins.length === 0) return null

  const firstPin = scheduledPins[0]
  const tripDate = parseISO(firstPin.scheduled_at!)

  const daysUntil = differenceInDays(tripDate, now)
  const hoursUntil = differenceInHours(tripDate, now)
  const isTripDay = isSameDay(tripDate, now) || (isAfter(now, tripDate) && isSameDay(now, parseISO(scheduledPins[scheduledPins.length - 1].scheduled_at!)))

  // 最初の予定時刻を過ぎるまではカウントダウンモード
  const showCountdown = hoursUntil > 0

  // 次の予定（今日の場合）
  const nextPin = scheduledPins.find(p => isAfter(parseISO(p.scheduled_at!), now))

  const iconColor = !showCountdown && isTripDay ? 'text-orange-600' : 'text-indigo-600'

  return (
    <div
      className="absolute right-4 bottom-[224px] z-20 flex flex-col-reverse items-end gap-2"
    >
      {/* カレンダーアイコン（常時表示・下に固定、ピン追加ボタンの上） */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="relative bg-[var(--surface)] p-3.5 rounded-full shadow-lg border border-[var(--border-soft)] active:scale-95 transition-transform"
      >
        {!showCountdown && isTripDay
          ? <Sparkles size={24} className={`${iconColor} animate-pulse`} />
          : <Calendar size={24} className={iconColor} />}
        {!isExpanded && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-[var(--surface)]" />
        )}
      </button>

      {/* 上方向に出るカードタブ */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="card"
            initial={{ y: 12, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="origin-bottom-right bg-[var(--surface)] backdrop-blur-md rounded-2xl shadow-xl border border-[var(--border-soft)] p-3 w-60"
          >
            {!showCountdown && isTripDay ? (
              <>
                <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">Today's Trip</div>
                <div className="text-sm font-bold text-[var(--text-strong)] leading-snug">
                  {nextPin ? (
                    <>次は <span className="text-orange-600">{format(parseISO(nextPin.scheduled_at!), 'HH:mm')}</span><br />{nextPin.title}</>
                  ) : '今日の予定はすべて完了！'}
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Trip Countdown</div>
                <div className="text-sm font-bold text-[var(--text-strong)] leading-snug truncate">{firstPin.title}</div>
                <div className="text-[var(--text-muted)] text-xs mt-0.5">
                  まであと
                  <span className="text-indigo-600 text-xl font-extrabold mx-1">
                    {hoursUntil >= 0 && hoursUntil < 24 ? hoursUntil : daysUntil}
                  </span>
                  {hoursUntil >= 0 && hoursUntil < 24 ? '時間' : '日'}
                </div>
              </>
            )}

            {nextPin && (
              <button
                onClick={() => onPinSelect?.(nextPin)}
                className="mt-3 w-full bg-indigo-500 active:bg-indigo-600 active:scale-95 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm"
              >
                地図で確認
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
