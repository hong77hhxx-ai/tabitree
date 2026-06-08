'use client'

import { useDragControls } from 'framer-motion'
import type { PointerEvent } from 'react'

// ボトムシートを下方向スワイプで閉じるための共通ロジック。
// dragProps をシートの motion.div に展開し、ハンドル要素の onPointerDown で startDrag を呼ぶ。
// （dragListener=false なので、ハンドル以外＝中身のスクロールはドラッグに干渉しない）
export function useSwipeDownToClose(onClose: () => void) {
  const dragControls = useDragControls()

  const dragProps = {
    drag: 'y' as const,
    dragListener: false,
    dragControls,
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: 0, bottom: 0.6 },
    onDragEnd: (_: unknown, info: { offset: { y: number }, velocity: { y: number } }) => {
      if (info.offset.y > 120 || info.velocity.y > 700) onClose()
    },
  }

  const startDrag = (e: PointerEvent) => dragControls.start(e)

  return { dragProps, startDrag }
}
