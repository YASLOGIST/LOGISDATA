"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowDown, Network, ShieldCheck } from "lucide-react";
import { auditMetrics, presentationCopy } from "@/lib/data";
import { text } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCounter } from "@/components/MetricCounter";

interface HeroSectionProps {
  language: Language;
  active: boolean;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection({ language, active }: HeroSectionProps) {
  const copy = presentationCopy.hero;
  return (
    <section id="section-1" className="presentation-section section-hero snap-start" aria-labelledby="hero-title">
      <div className="section-inner hero-inner">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: active ? 1 : 0.86, y: active ? 0 : 8 }}
          transition={{ duration: 0.8, ease }}
        >
          <div className="eyebrow-row">
            <span className="eyebrow-mark" />
            <span className="eyebrow">{text(copy.eyebrow, language)}</span>
          </div>
          <h1 id="hero-title" className="hero-title">
            {text(copy.title, language)}
          </h1>
          <p className="hero-subhead">{text(copy.subhead, language)}</p>
          <div className="hero-byline">
            <div className="byline-avatar">AY</div>
            <div>
              <p className="byline-primary">{copy.presenter}</p>
              <p className="byline-secondary">
                {text(copy.byline, language)} <span className="separator">{"//"}</span> Reg. {copy.registration}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="hero-visual-meta"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: active ? 1 : 0.7, x: active ? 0 : 5 }}
          transition={{ duration: 0.8, delay: 0.12, ease }}
        >
          <div className="aast-lockup">
            <div className="aast-logo-space" aria-label="Arab Academy for Science, Technology and Maritime Transport">
              <div className="aast-logo-badge">
                <Image src="/aast-logo.png" alt="AAST" width={46} height={45} className="aast-logo-image" />
              </div>
              <span className="aast-logo-label">AAST</span>
            </div>
            <div className="aast-meta">
              <span>{text(copy.controlLabel, language)}</span>
              <span>{text(copy.date, language)}</span>
            </div>
          </div>
          <GlassCard className="network-status" tone="amber">
            <div className="status-icon"><Network size={16} strokeWidth={1.7} /></div>
            <div>
              <p className="status-kicker">{text(copy.networkLabel, language)}</p>
              <p className="status-value">{text(copy.metricSource, language)}</p>
            </div>
            <span className="status-pulse" />
          </GlassCard>
          <p className="hero-model-note">{text(copy.modelNote, language)}</p>
        </motion.div>

        <motion.div
          className="hero-metrics-grid"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: active ? 1 : 0.8, y: active ? 0 : 10 }}
          transition={{ duration: 0.9, delay: 0.2, ease }}
        >
          {auditMetrics.map((metric) => (
            <GlassCard key={metric.id} tone={metric.tone} className="hero-metric-card">
              <MetricCounter metric={metric} language={language} />
            </GlassCard>
          ))}
        </motion.div>

        <div className="hero-footer-line">
          <div className="verified-line"><ShieldCheck size={14} /> <span>{text(copy.labLabel, language)}</span></div>
          <div className="scroll-cue"><span>{text(presentationCopy.nav.scrollHint, language)}</span><ArrowDown size={15} /></div>
        </div>
      </div>
    </section>
  );
}
