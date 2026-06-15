'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

const icons = {
  success: <CheckCircle className="size-4 text-emerald-500" strokeWidth={1.5} />,
  error: <AlertCircle className="size-4 text-rose-500" strokeWidth={1.5} />,
  warning: <AlertTriangle className="size-4 text-amber-500" strokeWidth={1.5} />,
  default: <Info className="size-4 text-muted_teal-500" strokeWidth={1.5} />,
};

export function Toaster() {
  const { toasts, removeToast } = useUIStore();
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2rem)]">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-3 p-4 rounded-2xl glass-strong shadow-xl border"
            style={{ borderColor: t.variant === 'error' ? 'rgba(244,63,94,0.2)' : t.variant === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(17,17,17,0.08)' }}
          >
            <span className="shrink-0 mt-0.5">{icons[t.variant ?? 'default']}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium leading-snug">{t.title}</p>
              {t.description && <p className="text-[12px] text-muted_teal-300 mt-0.5 leading-relaxed">{t.description}</p>}
            </div>
            <button onClick={() => removeToast(t.id)} className="shrink-0 text-muted_teal-300/70 hover:text-muted_teal-100 transition-colors duration-150 mt-0.5">
              <X className="size-3.5" strokeWidth={1.5} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
