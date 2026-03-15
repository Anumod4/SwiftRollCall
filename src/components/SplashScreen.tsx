import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function SplashScreen({ message = 'Launching SwiftRollCall' }: { message?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-zinc-950 transition-colors duration-500"
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/10 dark:bg-emerald-600/5 rounded-full blur-[80px] pointer-events-none delay-700" />
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [0.95, 1.05, 1],
            opacity: 1
          }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut"
          }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/40 transition-all duration-700 animate-pulse" />
          <img 
            src="/assets/logo.png" 
            alt="SwiftRollCall" 
            className="w-40 h-40 object-contain relative z-10 drop-shadow-2xl" 
          />
        </motion.div>

        <div className="mt-12 flex flex-col items-center gap-6">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white"
          >
            SwiftRollCall
          </motion.h1>

          <div className="w-64 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative border border-zinc-200/50 dark:border-zinc-700/50 shadow-inner">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5, 
                ease: "easeInOut" 
              }}
              className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-indigo-600 to-transparent"
            />
          </div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500"
          >
            {message}
          </motion.p>
        </div>
      </div>
      
      {/* Footer Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-12 text-center"
      >
        <p className="text-[10px] font-medium text-zinc-300 dark:text-zinc-700 tracking-widest uppercase">
          Precision Attendance & Revenue Management
        </p>
      </motion.div>
    </motion.div>
  );
}
