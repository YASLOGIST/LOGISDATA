"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowDown, Network, ShieldCheck } from "lucide-react";
import { auditMetrics, presentationCopy } from "@/lib/data";
import { text } from "@/lib/i18n";
import { DURATION, transition } from "@/lib/motion";
import { SECTIONS } from "@/lib/sections";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCounter } from "@/components/MetricCounter";
import type { SectionProps } from "./types";

export function HeroSection({ language, active, reduced }: SectionProps) {
  const copy = presentationCopy.hero;
  const dim = (value: number) => (active ? 1 : value);

  return (
    <section
      id={SECTIONS[0].domId}
      className="presentation-section section-hero snap-start"
      aria-labelledby="hero-title"
    >
      <div className="section-inner hero-inner">
        <motion.div
          className="hero-copy"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: dim(0.86), y: active || reduced ? 0 : 8 }}
          transition={transition(DURATION.slow, { reduced })}
        >
          <div className="eyebrow-row">
            <span className="eyebrow-mark" aria-hidden="true" />
            <span className="eyebrow">{text(copy.eyebrow, language)}</span>
          </div>
          <h1 id="hero-title" className="hero-title">
            {text(copy.title, language)}
          </h1>
          <p className="hero-subhead">{text(copy.subhead, language)}</p>
          <div className="hero-byline">
            <div className="byline-avatar" aria-hidden="true">AY</div>
            <div>
              <p className="byline-primary">{copy.presenter}</p>
              <p className="byline-secondary">
                {text(copy.byline, language)} <span className="separator" aria-hidden="true">{"//"}</span>{" "}
                {text(copy.registrationLabel, language)} {copy.registration}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="hero-visual-meta"
          initial={reduced ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: dim(0.7), x: active || reduced ? 0 : 5 }}
          transition={transition(DURATION.slow, { reduced, delay: 0.12 })}
        >
          <div className="aast-lockup">
            <div className="aast-logo-space">
              <div className="aast-logo-badge">
                <Image
                  src="/aast-logo.png"
                  alt="Arab Academy for Science, Technology and Maritime Transport"
                  width={46}
                  height={45}
                  className="aast-logo-image"
                  sizes="46px"
                />
              </div>
              <span className="aast-logo-label" aria-hidden="true">AAST</span>
            </div>
            <div className="aast-meta">
              <span>{text(copy.controlLabel, language)}</span>
              <span>{text(copy.date, language)}</span>
            </div>
          </div>
          <GlassCard className="network-status" tone="amber">
            <div className="status-icon" aria-hidden="true"><Network size={16} strokeWidth={1.7} /></div>
            <div>
              <p className="status-kicker">{text(copy.networkLabel, language)}</p>
              <p className="status-value">{text(copy.metricSource, language)}</p>
            </div>
            <span className="status-pulse" aria-hidden="true" />
          </GlassCard>
          <p className="hero-model-note">{text(copy.modelNote, language)}</p>
        </motion.div>

        <motion.ul
          className="hero-metrics-grid"
          initial={reduced ? false : { opacity: 0, y: 26 }}
          animate={{ opacity: dim(0.8), y: active || reduced ? 0 : 10 }}
          transition={transition(DURATION.cinematic, { reduced, delay: 0.2 })}
        >
          {auditMetrics.map((metric) => (
            <li key={metric.id}>
              <GlassCard tone={metric.tone} className="hero-metric-card">
                <MetricCounter metric={metric} language={language} reduced={reduced} />
              </GlassCard>
            </li>
          ))}
        </motion.ul>

        <div className="hero-footer-line">
          <div className="verified-line">
            <ShieldCheck size={14} aria-hidden="true" /> <span>{text(copy.labLabel, language)}</span>
          </div>
          <div className="scroll-cue" aria-hidden="true">
            <span>{text(presentationCopy.nav.scrollHint, language)}</span>
            <ArrowDown size={15} />
          </div>
        </div>
      </div>
    </section>
  );
}
