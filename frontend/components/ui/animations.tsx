import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessAnimationProps {
  message?: string;
  className?: string;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  message = 'Success!',
  className,
}) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      className={cn('flex flex-col items-center justify-center', className)}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: 0.1,
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
        className="relative"
      >
        <motion.div
          className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <CheckCircle2 className="h-16 w-16 text-green-600 relative z-10" />
      </motion.div>
      
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-lg font-semibold text-gray-900"
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
};

// Page transition variants
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

// Stagger children animation
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Slide in from side
export const slideInFromLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4 },
};

export const slideInFromRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4 },
};

// Scale animation
export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3 },
};
