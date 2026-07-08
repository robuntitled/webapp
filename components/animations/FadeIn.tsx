'use client';

import { motion, Variants } from 'framer-motion';
import React from 'react';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const fadeInVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20
  },
  visible: { 
    opacity: 1, 
    y: 0
  },
};

export const FadeIn: React.FC<FadeInProps> = ({ children, delay = 0, className }) => {
  return (
    <motion.div
      className={className}
      variants={fadeInVariants}
      initial="hidden"
      // --- MODIFICA CHIAVE QUI ---
      animate="visible" // Sostituiamo "whileInView" con "animate"
      // --------------------------
      transition={{ duration: 0.6, delay }} // Aumentato leggermente la durata per un effetto più morbido
      // Non abbiamo più bisogno del "viewport"
    >
      {children}
    </motion.div>
  );
};