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

  const iconColor = !showCountdown && isTripDay ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'

  return (
    <div
      className="absolute left-4 z-20 flex flex-col items-start"
      style={{ top: 'max(env(safe-area-inset-top, 0px) + 12px, 16px)' }}
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // カレンダーアイコンのみ
          <motion.button
            key="icon"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsExpanded(true)}
            className={`relative p-3 rounded-2xl shadow-lg border border-white/60 bg-white/95 backdrop-blur-md active:scale-95 transition-transform`}
          >
            <div className={`p-1.5 rounded-xl ${iconColor}`}>
              {!showCountdown && isTripDay ? <Sparkles size={22} className="animate-pulse" /> : <Calendar size={22} />}
            </div>
            {/* 通知ドット */}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white" />
          </motion.button>
        ) : (
          // 展開時：フルバー
          <motion.div
            key="bar"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-white/60 px-4 py-3 flex items-center gap-3 w-[calc(100vw-2rem)] max-w-sm"
          >
            <button
              onClick={() => setIsExpanded(false)}
              className={`p-2.5 rounded-xl flex-shrink-0 active:scale-95 transition-transform ${iconColor}`}
            >
              {!showCountdown && isTripDay ? <Sparkles size={22} className="animate-pulse" /> : <Calendar size={22} />}
            </button>

            <div className="flex-1 min-w-0">
              {!showCountdown && isTripDay ? (
                <div>
                  <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-0.5">Today's Trip</div>
                  <div className="text-sm font-bold text-gray-800 truncate">
                    {nextPin ? (
                      <>次は <span className="text-orange-600">{format(parseISO(nextPin.scheduled_at!), 'HH:mm')}</span> {nextPin.title}</>
                    ) : '今日の予定はすべて完了！'}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Trip Countdown</div>
                  <div className="text-sm font-bold text-gray-800 truncate">
                    <span className="text-indigo-700">{firstPin.title}</span>
                    {'まであと '}
                    <span className="text-indigo-600 text-base font-extrabold">
                      {hoursUntil >= 0 && hoursUntil < 24 ? `${hoursUntil}時間` : `${daysUntil}日`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {nextPin && (
              <button
                onClick={() => onPinSelect?.(nextPin)}
                className="bg-indigo-500 active:bg-indigo-600 active:scale-95 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-all flex-shrink-0 shadow-sm"
              >
                CHECK
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
