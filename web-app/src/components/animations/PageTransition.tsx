'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1], // Custom easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Stagger animation for lists
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const StaggerContainer: React.FC<StaggerContainerProps> = ({ 
  children, 
  className,
  delay = 0.1 
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Individual stagger item
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

const StaggerItem: React.FC<StaggerItemProps> = ({ children, className }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.4, 0.0, 0.2, 1],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Scale animation for interactive elements
interface ScaleOnHoverProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
}

const ScaleOnHover: React.FC<ScaleOnHoverProps> = ({ 
  children, 
  className,
  scale = 1.02 
}) => {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Slide in animation
interface SlideInProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  className?: string;
  delay?: number;
}

const SlideIn: React.FC<SlideInProps> = ({ 
  children, 
  direction = 'up',
  className,
  delay = 0 
}) => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'left': return { x: -50, y: 0 };
      case 'right': return { x: 50, y: 0 };
      case 'up': return { x: 0, y: 20 };
      case 'down': return { x: 0, y: -20 };
      default: return { x: 0, y: 20 };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0.0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Fade in animation
interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

const FadeIn: React.FC<FadeInProps> = ({ 
  children, 
  className,
  delay = 0,
  duration = 0.3 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Bounce animation for notifications
interface BounceProps {
  children: React.ReactNode;
  className?: string;
  trigger?: boolean;
}

const Bounce: React.FC<BounceProps> = ({ children, className, trigger = false }) => {
  return (
    <motion.div
      animate={trigger ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Loading pulse animation
interface PulseProps {
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

const Pulse: React.FC<PulseProps> = ({ children, className, isLoading = false }) => {
  return (
    <motion.div
      animate={isLoading ? { opacity: [1, 0.5, 1] } : {}}
      transition={isLoading ? { duration: 1.5, repeat: Infinity } : {}}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  ScaleOnHover,
  SlideIn,
  FadeIn,
  Bounce,
  Pulse,
};