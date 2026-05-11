'use client'

import { Pin } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Calendar, Clock, AlertCircle } from 'lucide-react'
import { format, differenceInDays, isSameDay, isAfter, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

type CountdownWidgetProps = {
  pins: Pin[]
}

export default function CountdownWidget({ pins }: CountdownWidgetProps) {
  // 予定があるピンを取得してソート
  const scheduledPins = pins
    .filter(p => p.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())

  if (scheduledPins.length === 0) return null

  const firstPin = scheduledPins[0]
  const tripDate = parseISO(firstPin.scheduled_at!)
  const now = new Date()
  
  const daysUntil = differenceInDays(tripDate, now)
  const isTripDay = isSameDay(tripDate, now) || (isAfter(now, tripDate) && isSameDay(now, parseISO(scheduledPins[scheduledPins.length - 1].scheduled_at!)))

  // 次の予定（今日の場合）
  const nextPin = scheduledPins.find(p => isAfter(parseISO(p.scheduled_at!), now))

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-sm">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 p-3 flex items-center gap-3"
      >
        <div className={`p-2 rounded-xl flex-shrink-0 ${isTripDay ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
          {isTripDay ? <Sparkles size={20} className="animate-pulse" /> : <Calendar size={20} />}
        </div>
        
        <div className="flex-1 min-w-0">
          {isTripDay ? (
            <div>
              <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Today's Trip</div>
              <div className="text-sm font-bold text-gray-800 truncate">
                {nextPin ? (
                  <>次は <span className="text-orange-600">{format(parseISO(nextPin.scheduled_at!), 'HH:mm')}</span> {nextPin.title}</>
                ) : (
                  '今日の予定はすべて完了しました！'
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Trip Countdown</div>
              <div className="text-sm font-bold text-gray-800">
                旅行まであと <span className="text-indigo-600 text-lg">{daysUntil + 1}</span> 日
              </div>
            </div>
          )}
        </div>

        {isTripDay && nextPin && (
          <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg animate-bounce">
            CHECK!
          </div>
        )}
      </motion.div>
    </div>
  )
}
