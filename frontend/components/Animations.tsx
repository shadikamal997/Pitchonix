'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Reusable Animation Components using Framer Motion
 */

// Fade In Animation
export const FadeIn = ({
  children,
  delay = 0,
  duration = 0.5,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// Slide In from Bottom
export const SlideUp = ({
  children,
  delay = 0,
  duration = 0.5,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    transition={{ duration, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// Scale In Animation
export const ScaleIn = ({
  children,
  delay = 0,
  duration = 0.3,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// Stagger Children Animation
export const StaggerContainer = ({
  children,
  staggerDelay = 0.1,
  className = '',
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: 'easeOut' },
      },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// Page Transition
export const PageTransition = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <AnimatePresence mode="wait">
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

// Hover Scale Effect
export const HoverScale = ({
  children,
  scale = 1.05,
  className = '',
}: {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}) => (
  <motion.div
    whileHover={{ scale }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    className={className}
  >
    {children}
  </motion.div>
);

// Loading Spinner
export const LoadingSpinner = ({ size = 40 }: { size?: number }) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    style={{
      width: size,
      height: size,
      border: `${size / 10}px solid rgba(59, 130, 246, 0.3)`,
      borderTop: `${size / 10}px solid rgb(59, 130, 246)`,
      borderRadius: '50%',
    }}
  />
);

// Pulse Animation
export const Pulse = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    animate={{
      scale: [1, 1.02, 1],
      opacity: [1, 0.9, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// Slide In from Left
export const SlideInLeft = ({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// Slide In from Right
export const SlideInRight = ({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// Bounce Animation
export const Bounce = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    animate={{
      y: [0, -10, 0],
    }}
    transition={{
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 1,
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// Modal/Dialog Animation
export const ModalAnimation = ({
  children,
  isOpen,
  onClose,
  className = '',
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        />
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// Success Checkmark Animation
export const SuccessCheckmark = ({ size = 80 }: { size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
  >
    <motion.circle
      cx="50"
      cy="50"
      r="45"
      fill="none"
      stroke="#10B981"
      strokeWidth="4"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
    <motion.path
      d="M 30 50 L 45 65 L 70 35"
      fill="none"
      stroke="#10B981"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
    />
  </motion.svg>
);
