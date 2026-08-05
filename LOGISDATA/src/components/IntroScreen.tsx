"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, ShieldCheck } from "lucide-react";

interface IntroScreenProps {
  onEnter: () => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function IntroScreen({ onEnter }: IntroScreenProps) {
  return (
    <motion.div
      className="intro-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.015 }}
      transition={{ duration: 0.65, ease }}
    >
      <div className="intro-grid" aria-hidden="true" />
      <div className="intro-glow intro-glow-a" aria-hidden="true" />
      <div className="intro-glow intro-glow-b" aria-hidden="true" />

      <motion.div
        className="intro-card"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.12, ease }}
      >
        <div className="intro-logo-frame">
          <Image
            src="/aast-logo.png"
            alt="Arab Academy for Science, Technology and Maritime Transport"
            width={104}
            height={103}
            className="intro-logo"
            priority
          />
        </div>

        <p className="intro-university-ar">الأكاديمية العربية للعلوم والتكنولوجيا والنقل البحري</p>
        <p className="intro-university-en">Arab Academy for Science, Technology &amp; Maritime Transport</p>

        <span className="intro-divider" />

        <p className="intro-eyebrow">
          <ShieldCheck size={13} />
          <span>Executive Supply Chain &amp; Data Audit Presentation</span>
        </p>

        <div className="intro-credit">
          <p className="intro-credit-line">
            <span className="intro-credit-key">BY</span>
            <span className="intro-credit-colon">:</span>
            <span className="intro-credit-value">AHMED YASSER ALI</span>
          </p>
          <p className="intro-credit-line">
            <span className="intro-credit-key">REG</span>
            <span className="intro-credit-colon">:</span>
            <span className="intro-credit-value" dir="ltr">211010269</span>
          </p>
        </div>

        <button type="button" className="intro-enter-btn" onClick={onEnter}>
          <span>Enter Control Room</span>
          <ArrowRight size={16} />
        </button>
      </motion.div>

      <p className="intro-footer-note">AAST // EXECUTIVE DATA LAB — CONTROL ROOM ACCESS</p>
    </motion.div>
  );
}
