"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  useScroll,
  useInView,
  useMotionValueEvent,
} from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle2,
  MapPin,
  Code2,
  PenLine,
  Music2,
} from "lucide-react";

/* ============================================================================
   MOTION PRIMITIVES
   Shared hooks used across the page. Everything here is transform/opacity/
   clip-path only — no layout properties are animated, so scrolling never
   triggers reflow.
   ============================================================================ */

/** Desktop + fine-pointer detection. Gates cursor, parallax and spotlight. */
function useFinePointer() {
  const reduce = useReducedMotion();
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(mq.matches && !reduce);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduce]);

  return fine;
}

/**
 * Cursor-following radial light written to CSS custom properties.
 * The element only ever receives a paint change, never a layout change.
 */
function useSpotlight(enabled: boolean) {
  const frame = useRef(0);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!enabled) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.setProperty("--mx", x + "px");
        el.style.setProperty("--my", y + "px");
      });
    },
    [enabled]
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return onMouseMove;
}

/** Which section is currently under the sticky header. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/** Blur + rise reveal used for the hero sequence and section entrances. */
const blurUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const riseUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/** Parent wrapper that staggers its children on scroll entry. */
const stagger = (amount = 0.09) => ({
  hidden: {},
  visible: { transition: { staggerChildren: amount } },
});

const SC_NODES = [
  { label: "Skills", x: 20, y: 26 },
  { label: "Community", x: 80, y: 22 },
  { label: "Progress", x: 84, y: 74 },
  { label: "Connection", x: 16, y: 78 },
];

/**
 * Skill Circle product visual — an interactive node system representing the
 * product loop (skills → community → progress → connection) rather than a
 * fabricated UI screenshot. Nodes sit at fixed percentage positions and drift
 * by different amounts, which reads as depth without any 3D engine.
 */
function SkillCircleSystem({ active }: { active: boolean }) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 70, damping: 20, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 70, damping: 20, mass: 0.6 });

  const coreX = useTransform(sx, (v) => v * 8);
  const coreY = useTransform(sy, (v) => v * 8);
  const innerX = useTransform(sx, (v) => v * 16);
  const innerY = useTransform(sy, (v) => v * 16);
  const outerX = useTransform(sx, (v) => v * 24);
  const outerY = useTransform(sy, (v) => v * 24);
  const lightX = useTransform(sx, (v) => v * 40);
  const lightY = useTransform(sy, (v) => v * 40);

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className="sc-system" onMouseMove={onMove} onMouseLeave={onLeave}>
      <motion.span className="sc-light" style={{ x: lightX, y: lightY }} aria-hidden="true" />

      {/* rings drift at three depths */}
      <motion.span
        className="sc-ring sc-ring-outer"
        style={{ x: outerX, y: outerY }}
        data-active={active}
        aria-hidden="true"
      />
      <motion.span
        className="sc-ring sc-ring-inner"
        style={{ x: innerX, y: innerY }}
        data-active={active}
        aria-hidden="true"
      />

      {/* connecting paths */}
      <svg className="sc-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {SC_NODES.map((n, i) => (
          <motion.line
            key={n.label}
            x1="50"
            y1="50"
            x2={n.x}
            y2={n.y}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={active ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.25 + i * 0.13, ease: "easeOut" }}
          />
        ))}
      </svg>

      {/* nodes */}
      {SC_NODES.map((n, i) => (
        <motion.span
          key={n.label}
          className="sc-node"
          style={{
            left: n.x + "%",
            top: n.y + "%",
            x: innerX,
            y: innerY,
          }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={active ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.55, delay: 0.35 + i * 0.13, ease: [0.22, 1, 0.36, 1] }}
        >
          <i />
          {n.label}
        </motion.span>
      ))}

      {/* core */}
      <motion.span className="sc-core" style={{ x: coreX, y: coreY }}>
        <motion.strong
          initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
          animate={active ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          Skill
          <br />
          <em>Circle</em>
        </motion.strong>
      </motion.span>

      {/* progress line draws once the system is on screen */}
      <motion.div
        className="sc-progress"
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.9 }}
      >
        <small>XP PROGRESSION</small>
        <div className="sc-progress-track">
          <motion.i
            initial={{ scaleX: 0 }}
            animate={active ? { scaleX: 1 } : {}}
            transition={{ duration: 1.5, delay: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>
    </div>
  );
}

/* ============================================================================
   PROJECT MARKS
   Original vector identities drawn for each real project. Geometric and
   restrained so they sit inside the existing editorial system — no stock
   art, no invented screenshots, no cartoon shapes.
   ============================================================================ */

function MarkCipher() {
  return (
    <svg viewBox="0 0 200 140" className="project-vector">
      <g className="mv-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={"v" + i} x1={20 + i * 23} y1={16} x2={20 + i * 23} y2={124} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={"h" + i} x1={16} y1={22 + i * 24} x2={184} y2={22 + i * 24} />
        ))}
      </g>
      <g className="mv-data">
        <text x="34" y="52">0x4F</text>
        <text x="122" y="78">A7</text>
        <text x="56" y="106">9E</text>
        <text x="148" y="46">3C</text>
      </g>
      <g className="mv-core">
        <circle cx="100" cy="64" r="20" />
        <circle cx="100" cy="64" r="9" />
        <path d="M96 82h8l3 20h-14z" />
        <circle className="mv-pulse" cx="100" cy="64" r="20" />
      </g>
      <g className="mv-nodes">
        <circle cx="40" cy="34" r="3" />
        <circle cx="160" cy="34" r="3" />
        <circle cx="40" cy="106" r="3" />
        <circle cx="160" cy="106" r="3" />
      </g>
    </svg>
  );
}

function MarkRepair() {
  return (
    <svg viewBox="0 0 200 140" className="project-vector">
      <g className="mv-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={"v" + i} x1={20 + i * 23} y1={14} x2={20 + i * 23} y2={126} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={"h" + i} x1={16} y1={20 + i * 25} x2={184} y2={20 + i * 25} />
        ))}
      </g>
      <g className="mv-parts">
        <rect x="52" y="52" width="26" height="26" />
        <rect x="86" y="52" width="26" height="26" />
        <rect x="120" y="52" width="26" height="26" />
        <path className="mv-bolt" d="M78 65h8M112 65h8M99 32v20M99 78v20" />
      </g>
      <g className="mv-axis">
        <line x1="40" y1="65" x2="160" y2="65" />
        <circle cx="40" cy="65" r="2.5" />
        <circle cx="160" cy="65" r="2.5" />
      </g>
    </svg>
  );
}

function MarkLedger() {
  return (
    <svg viewBox="0 0 200 140" className="project-vector">
      <g className="mv-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={"v" + i} x1={20 + i * 23} y1={14} x2={20 + i * 23} y2={126} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={"h" + i} x1={16} y1={20 + i * 25} x2={184} y2={20 + i * 25} />
        ))}
      </g>
      <g className="mv-doc">
        <rect x="44" y="28" width="64" height="84" />
        <line x1="54" y1="46" x2="98" y2="46" />
        <line x1="54" y1="62" x2="88" y2="62" />
        <line x1="54" y1="78" x2="98" y2="78" />
        <line x1="54" y1="94" x2="80" y2="94" />
      </g>
      <g className="mv-flow">
        <path className="mv-path" d="M120 54h20a11 11 0 0 1 0 22h-12a11 11 0 0 0 0 22h18" />
        <circle className="mv-node" cx="120" cy="54" r="3.5" />
        <circle className="mv-node" cx="146" cy="98" r="3.5" />
      </g>
    </svg>
  );
}

function MarkNetwork() {
  return (
    <svg viewBox="0 0 200 140" className="project-vector">
      <g className="mv-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={"v" + i} x1={20 + i * 23} y1={14} x2={20 + i * 23} y2={126} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={"h" + i} x1={16} y1={20 + i * 25} x2={184} y2={20 + i * 25} />
        ))}
      </g>
      <g className="mv-graph">
        <path className="mv-edge" d="M44 46L70 58M44 96L70 88M156 46L130 58M156 96L130 88" />
        <circle className="mv-node" cx="44" cy="46" r="4" />
        <circle className="mv-node" cx="44" cy="96" r="4" />
        <circle className="mv-node" cx="156" cy="46" r="4" />
        <circle className="mv-node" cx="156" cy="96" r="4" />
      </g>
      <g className="mv-building">
        <rect x="70" y="44" width="60" height="62" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect key={r + "-" + c} x={78 + c * 16} y={54 + r * 16} width="9" height="9" />
          ))
        )}
        <path d="M92 106v-14h16v14" />
      </g>
    </svg>
  );
}

const MARKS: Record<MarkKey, () => React.ReactElement> = {
  cipher: MarkCipher,
  repair: MarkRepair,
  ledger: MarkLedger,
  network: MarkNetwork,
};

/**
 * Project visual. The artwork is rendered twice — a faint back layer and a
 * brighter front layer — so the mark responds to the pointer with parallax
 * depth rather than sliding flat.
 */
function ProjectVisual({
  mark,
  parallax,
}: {
  mark: MarkKey;
  parallax: boolean;
}) {
  const Mark = MARKS[mark];
  const back = useMotionValue(0);
  const front = useMotionValue(0);
  const bx = useTransform(back, (v) => v * 5);
  const by = useTransform(back, (v) => v * 5);
  const fx = useTransform(front, (v) => v * 9);
  const fy = useTransform(front, (v) => v * 9);

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!parallax) return;
    const r = e.currentTarget.getBoundingClientRect();
    back.set((e.clientX - r.left) / r.width - 0.5);
    front.set((e.clientX - r.left) / r.width - 0.5);
  };
  const onLeave = () => {
    back.set(0);
    front.set(0);
  };

  return (
    <div className="project-visual" onMouseMove={onMove} onMouseLeave={onLeave}>
      <motion.span
        className="project-visual-layer back"
        style={parallax ? { x: bx, y: by } : undefined}
        aria-hidden="true"
      >
        <Mark />
      </motion.span>
      <motion.span
        className="project-visual-layer front"
        style={parallax ? { x: fx, y: fy } : undefined}
        aria-hidden="true"
      >
        <Mark />
      </motion.span>
    </div>
  );
}

/** Subtle infinite tech marquee. Copy is drawn from real project stacks. */
function TechMarquee() {
  const row = [...marqueeTech, ...marqueeTech];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((tech, i) => (
          <span key={tech + i} className={i % 2 === 0 ? "outlined" : "filled"}>
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A single project card. Extracted into its own component so the tilt and
 * spotlight hooks are called once per card rather than inside a map loop.
 */
function ProjectCard({
  project,
  index,
  fine,
  spotlight,
}: {
  project: (typeof projects)[number];
  index: number;
  fine: boolean;
  spotlight: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  const tilt = useTilt(fine, 2.5);

  /* Real destination only: live demo when one exists, otherwise the repo.
     Never a fabricated URL. */
  const href = project.live || project.github;

  return (
    <motion.article
      className="project spotlight"
      variants={riseUp}
      data-cursor="VIEW"
      data-mode="view"
      onMouseMove={(e) => {
        spotlight(e);
        tilt.onMouseMove(e);
      }}
      onMouseLeave={tilt.onMouseLeave}
      whileHover={{ y: -6, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
      style={tilt.style}
    >
      {/* Stretched link: the whole card is clickable, while the nested GitHub
          link sits above it so it navigates independently. No nested <a>, no
          double navigation. */}
      <a
        className="project-hit"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${project.title} — open ${project.live ? "live demo" : "source on GitHub"}`}
      >
        <span className="visually-hidden">Open {project.title}</span>
      </a>

      <div className={`project-preview preview-${index + 1}`}>
        <span className="project-number">0{index + 1}</span>
        <ProjectVisual mark={project.mark} parallax={fine} />
        <span className="project-spotlight" aria-hidden="true" />
      </div>

      <div className="project-body">
        <p className="project-category">{project.category}</p>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <div className="project-stack">
          {project.stack.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="project-footer">
          <span className="project-metric">
            <CheckCircle2 size={14} /> {project.metric}
          </span>
          <div className="project-links">
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="OPEN ↗"
              data-mode="open"
            >
              GitHub <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/**
 * Optional, very thin scroll progress. 1px, low opacity, fixed at the top —
 * a quiet orientation cue rather than a loading bar.
 */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });
  return <motion.span className="scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}

const EMAIL = "abhidhautre@gmail.com";

/**
 * A mailto: link silently does nothing when the visitor has no mail client
 * registered — common on Windows without Outlook configured, and in locked
 * down or in-app browsers. So we attempt the mailto and watch for the page
 * losing focus; if that never happens the mail app never opened, and we fall
 * back to copying the address so the visitor always ends up with a way to
 * reach me.
 */
function useMailTo() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = useCallback((subject: string, body: string) => {
    const href = `mailto:${EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    let opened = false;
    const onBlur = () => {
      opened = true;
    };
    window.addEventListener("blur", onBlur, { once: true });

    window.location.href = href;

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      window.removeEventListener("blur", onBlur);
      if (opened) return;
      // no mail client took it — put the address on the clipboard instead
      try {
        await navigator.clipboard.writeText(EMAIL);
      } catch {
        /* clipboard blocked; the visible address below is still selectable */
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    }, 1400);
  }, []);

  return { open, copied };
}

/** Ambient world. Three fixed layers behind all content: a slow lime aura, a
 * barely-there grid, and film grain. All extremely low contrast — the point
 * is that the page feels alive, not that you notice the background.
 * Painted with CSS only; no canvas, no particles, no JS loop.
 */
function AmbientBackdrop() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient-aura" />
      <span className="ambient-aura ambient-aura-2" />
      <span className="ambient-grid" />
      <span className="ambient-grain" />
    </div>
  );
}

/**
 * Editorial heading that reveals word by word. Each word rises out of a clip
 * mask so the type appears to be printed rather than faded in.
 */
function RevealHeading({
  children,
  className,
  delay = 0,
  step = 0.075,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  step?: number;
}) {
  /* Own observer rather than whileInView: these headings sit inside sections
     that already run a variant tree, and a nested whileInView gets swallowed
     by the inherited "hidden" label and never fires. */
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });

  const words = String(children).split(" ");

  return (
    <span className={className} ref={ref}>
      {words.map((word, i) => (
        <span className="word-mask" key={i}>
          <motion.span
            className="word"
            initial={{ y: "112%", opacity: 0, filter: "blur(5px)" }}
            animate={
              inView
                ? { y: "0%", opacity: 1, filter: "blur(0px)" }
                : { y: "112%", opacity: 0, filter: "blur(5px)" }
            }
            transition={{
              duration: 0.78,
              delay: inView ? delay + i * step : 0,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/**
 * Magnetic pull toward the cursor. Movement is deliberately capped small so
 * the element leans toward the pointer rather than chasing it.
 */
function useMagnetic(enabled: boolean, strength = 8) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 190, damping: 18, mass: 0.45 });
  const sy = useSpring(y, { stiffness: 190, damping: 18, mass: 0.45 });
  const tx = useTransform(sx, (v) => v * strength);
  const ty = useTransform(sy, (v) => v * strength);

  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    // clamp: full strength only near the element's edges
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    x.set(Math.max(-1, Math.min(1, px * 2)));
    y.set(Math.max(-1, Math.min(1, py * 2)));
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { onMouseMove, onMouseLeave, style: enabled ? { x: tx, y: ty } : undefined };
}

/**
 * Very shallow 3D tilt for project cards. Capped at 2.5° so the grid still
 * reads as flat and editorial rather than as a 3D demo.
 */
function useTilt(enabled: boolean, max = 2.5) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 20, mass: 0.5 });
  const sry = useSpring(ry, { stiffness: 160, damping: 20, mass: 0.5 });
  const rotateX = useTransform(srx, (v) => v * -1);
  const rotateY = useTransform(sry, (v) => v * 1);

  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(Math.max(-1, Math.min(1, px * 2)) * max);
    rx.set(Math.max(-1, Math.min(1, py * 2)) * max);
  };

  const onMouseLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return {
    onMouseMove,
    onMouseLeave,
    style: enabled
      ? { rotateX, rotateY, transformPerspective: 900 }
      : { transformPerspective: 900 },
  };
}

const NAV_IDS = ["home", "featured", "about", "work", "process", "experience", "skills", "recognition", "journal", "contact"];

/**
 * The single scroll-based typography effect on the page: the italic serif
 * line drifts at a different scroll rate than the line above it. Capped at
 * 7px so it reads as depth, not distortion.
 */
function DriftEm({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [7, -7]);

  return (
    <motion.em ref={ref} style={reduce ? undefined : { y }}>
      {children}
    </motion.em>
  );
}

const PORTRAIT = "/abhishek-dhautre-portrait.jpeg";

type MarkKey = "cipher" | "repair" | "ledger" | "network";

const projects: Array<{
  title: string;
  category: string;
  description: string;
  stack: string[];
  github: string;
  live: string;
  metric: string;
  mark: MarkKey;
}> = [
  {
    title: "Private Coded Chat",
    category: "Web application · Privacy",
    description:
      "A privacy-focused real-time messaging application built around client-side encryption, disappearing messages, and a simple two-person chat experience.",
    stack: ["Next.js", "TypeScript", "Firebase", "Web Crypto API"],
    github: "https://github.com/abhishekdhautre/Private-Coded-Chat",
    live: "",
    metric: "AES-256-GCM client-side encryption",
    mark: "cipher",
  },
  {
    title: "FixIt",
    category: "Mobile application · DIY",
    description:
      "A React Native application designed to make household repair guidance easier to discover, understand, and follow.",
    stack: ["React Native", "Firebase", "Firestore"],
    github: "https://github.com/abhishekdhautre/Fixit",
    live: "",
    metric: "50+ repair guides",
    mark: "repair",
  },
  {
    title: "Faculty Expense Tracker",
    category: "Web application · Workflow",
    description:
      "A role-based expense workflow for advance requests, settlements, and reimbursements that replaced a manual process with digital validation and sync.",
    stack: ["React", "Firebase", "Firestore", "MySQL"],
    github: "https://github.com/abhishekdhautre",
    live: "",
    metric: "~60% reduction in manual effort",
    mark: "ledger",
  },
  {
    title: "Society Management App",
    category: "Mobile application · Production",
    description:
      "A resident-facing application for notices, payments, QR visitor entry and digital receipts, backed by role-based access and 20+ REST APIs.",
    stack: ["React Native", "Spring Boot", "PostgreSQL", "MongoDB"],
    github: "https://github.com/abhishekdhautre",
    live: "",
    metric: "Published on App Store + Google Play",
    mark: "network",
  },
];

/* Marquee copy — every technology below already appears in project data or
   the skills section. Nothing added for decoration. */
const marqueeTech = [
  "React",
  "React Native",
  "Firebase",
  "Firestore",
  "Java",
  "Spring Boot",
  "REST APIs",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "TypeScript",
  "JavaScript",
];

const processSteps = [
  ["01", "Idea", "A rough thought worth chasing."],
  ["02", "Understand", "Find the real problem underneath it."],
  ["03", "Design", "Work out how the pieces fit together."],
  ["04", "Build", "Frontend, backend, data — kept coherent."],
  ["05", "Test", "Break it deliberately, then make it hold."],
  ["06", "Ship", "Put it in real hands and improve it."],
];

const recognition = [
  {
    title: "Best Project Award",
    detail: "Skill Circle · MIT-ADT University",
    tag: "Award",
  },
  {
    title: "1st Place — IdeaSpark",
    detail: "Innovation Competition · MIT-ADT University",
    tag: "Award",
  },
  {
    title: "Apple Certified",
    detail: "App Development with Swift · Associate & Certified User",
    tag: "Certification",
  },
  {
    title: "AWS Academy Graduate",
    detail: "Cloud Foundations",
    tag: "Certification",
  },
  {
    title: "Microsoft Azure",
    detail: "Fundamentals · AZ-900",
    tag: "Certification",
  },
];

/* ---------------------------------------------------------------------------
   VERIFICATION NOTES — every entry above is supported by
   public/Abhishek_Dhautre_Resume.pdf (ACHIEVEMENTS / CERTIFICATIONS).
   No dates, rankings, scores or IDs have been added beyond what the resume
   states. Remove or correct any entry here if it changes.
   Best Project Award — Skill Circle, School of Computing, MIT-ADT University
   IdeaSpark 1st Place — led a 4-member team, university-level challenge
   Apple Certified — Certiport, May 2026
   AWS Academy Graduate — Cloud Foundations
   Microsoft Azure Fundamentals — AZ-900
--------------------------------------------------------------------------- */

/* Real, verified profile links only. Nothing here is inferred. */
const socials = [
  { name: "GitHub", href: "https://github.com/abhishekdhautre" },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/abhishek-dhautre" },
  { name: "X", href: "https://x.com/AbhiDhautre" },
  { name: "Medium", href: "https://medium.com/@abhidhautre" },
  { name: "Pinterest", href: "https://in.pinterest.com/abhishek_dhautre/" },
  { name: "LeetCode", href: "https://leetcode.com/u/Abhi_Dhautre/" },
  {
    name: "Spotify",
    href: "https://open.spotify.com/user/qhxmcwzsm8sbx8ac4r6x3oyj0?si=9f20b1b14c5f4958",
  },
];

/* Grouped skills. Every technology listed here appears in the resume's
   TECHNICAL SKILLS section — nothing has been added for effect. */
const skills = [
  { label: "Frontend", items: ["React.js", "JavaScript (ES6+)", "HTML5", "CSS3"] },
  { label: "Mobile", items: ["React Native", "Android", "iOS"] },
  { label: "Backend", items: ["REST APIs", "Spring Boot", "Authentication"] },
  { label: "Database", items: ["Firebase Firestore", "MySQL", "MongoDB"] },
  { label: "Cloud / Tools", items: ["AWS", "Git", "GitHub", "Vercel"] },
  { label: "Languages", items: ["Java", "Python", "JavaScript"] },
];

/**
 * Idea → Product. A vertical spine whose fill follows scroll position, with
 * each stage lighting individually as it is reached: upcoming stages stay
 * muted, the current stage turns lime, and passed stages settle off-white.
 */
function ProcessTimeline({ reduceMotion }: { reduceMotion: boolean }) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [reached, setReached] = useState(0);

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 72%", "end 65%"],
  });
  const drawn = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 30,
    mass: 0.4,
  });

  // Derive how many stages the scroll spine has passed.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const n = Math.round(v * processSteps.length);
    setReached((prev) => (prev === n ? prev : n));
  });

  return (
    <div className="process-list process-vertical" ref={listRef}>
      <span className="process-spine" aria-hidden="true" />
      <motion.span
        className="process-track process-track-fill"
        style={reduceMotion ? { scaleY: 1 } : { scaleY: drawn }}
        aria-hidden="true"
      />
      {processSteps.map(([num, title, text], i) => {
        const state = i < reached ? "done" : i === reached ? "active" : "idle";
        return (
          <motion.div
            className="process-step"
            key={num}
            data-state={state}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="process-num">{num}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Desktop-only cursor layer. A small dot follows the pointer exactly; a
 * slightly lagging ring expands over interactive elements. Elements opt in
 * via data-cursor="view" | "open" to show a label.
 */
function CursorLayer() {
  const reduceMotion = useReducedMotion();
  const fine = useFinePointer();
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState("");
  const [visible, setVisible] = useState(false);
  const [down, setDown] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const dotX = useSpring(x, { stiffness: 900, damping: 45, mass: 0.25 });
  const dotY = useSpring(y, { stiffness: 900, damping: 45, mass: 0.25 });
  const ringX = useSpring(x, { stiffness: 190, damping: 22, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 190, damping: 22, mass: 0.5 });

  useEffect(() => {
    if (!fine) return;

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const leave = () => setVisible(false);
    const press = () => setDown(true);
    const release = () => setDown(false);

    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseleave", leave);
    window.addEventListener("mousedown", press);
    window.addEventListener("mouseup", release);

    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseleave", leave);
      window.removeEventListener("mousedown", press);
      window.removeEventListener("mouseup", release);
    };
  }, [fine, x, y]);

  // Resolve the hover target once per move rather than per element listener.
  useEffect(() => {
    if (!fine) return;
    const over = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.("[data-cursor]");
      if (target) {
        setLabel(target.getAttribute("data-cursor") ?? "");
        setMode(target.getAttribute("data-mode") ?? "");
      } else {
        setLabel("");
        setMode("");
      }
    };
    document.addEventListener("mouseover", over);
    return () => document.removeEventListener("mouseover", over);
  }, [fine]);

  // Suppress the native cursor only while the custom layer is mounted.
  useEffect(() => {
    if (!fine || reduceMotion) return;
    document.body.classList.add("has-custom-cursor");
    return () => document.body.classList.remove("has-custom-cursor");
  }, [fine, reduceMotion]);

  if (!fine || reduceMotion) return null;

  return (
    <div className="cursor-layer" aria-hidden="true">
      <motion.span
        className="cursor-ring"
        style={{ x: ringX, y: ringY }}
        data-label={label}
        data-down={down}
        data-visible={visible}
        data-mode={mode}
      >
        <i>{label}</i>
      </motion.span>
      <motion.span
        className="cursor-dot"
        style={{ x: dotX, y: dotY }}
        data-visible={visible}
      />
    </div>
  );
}

export default function Home() {
  const reduceMotion = useReducedMotion();

  /* ---- subtle pointer parallax (desktop / fine pointer only) ---- */
  const [finePointer, setFinePointer] = useState(false);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const softX = useSpring(pointerX, { stiffness: 60, damping: 22, mass: 0.6 });
  const softY = useSpring(pointerY, { stiffness: 60, damping: 22, mass: 0.6 });

  const photoX = useTransform(softX, (v) => v * 3.5);
  const photoY = useTransform(softY, (v) => v * 3.5);
  const glowX = useTransform(softX, (v) => v * 15);
  const glowY = useTransform(softY, (v) => v * 15);
  const orbitX = useTransform(softX, (v) => v * 7);
  const orbitY = useTransform(softY, (v) => v * 7);
  const cardX = useTransform(softX, (v) => v * 2);
  const cardY = useTransform(softY, (v) => v * 2);
  const tagX = useTransform(softX, (v) => v * 1.6);
  const tagY = useTransform(softY, (v) => v * 1.6);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFinePointer(mq.matches && !reduceMotion);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduceMotion]);

  const handlePointer = (e: React.MouseEvent) => {
    if (!finePointer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(Math.max(-1, Math.min(1, nx * 2)));
    pointerY.set(Math.max(-1, Math.min(1, ny * 2)));
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const parallax = finePointer ? { x: cardX, y: cardY } : { x: 0, y: 0 };

  /* Magnetic primary actions — capped at 8px so they lean, not chase */
  const heroCta = useMagnetic(finePointer, 8);
  const contactCta = useMagnetic(finePointer, 10);
  const mail = useMailTo();
  const navMail = useMailTo();
  const heroMail = useMailTo();

  const activeSection = useActiveSection(NAV_IDS);
  const spotlight = useSpotlight(finePointer);

  /* Nav hides on scroll down, returns on scroll up */
  const { scrollY } = useScroll();
  const [navHidden, setNavHidden] = useState(false);
  useEffect(() => {
    let last = 0;
    return scrollY.on("change", (v) => {
      const goingDown = v > last;
      if (Math.abs(v - last) > 6) setNavHidden(goingDown && v > 320);
      last = v;
    });
  }, [scrollY]);

  /* Featured project: 4px visual drift + 2px title drift toward the cursor */
  const featRawX = useMotionValue(0);
  const featRawY = useMotionValue(0);
  const featX = useSpring(featRawX, { stiffness: 70, damping: 20, mass: 0.5 });
  const featY = useSpring(featRawY, { stiffness: 70, damping: 20, mass: 0.5 });
  const featVisualX = useTransform(featX, (v) => v * 4);
  const featVisualY = useTransform(featY, (v) => v * 4);
  const featTitleX = useTransform(featX, (v) => v * 2);
  const featTitleY = useTransform(featY, (v) => v * 2);

  const onFeaturedMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!finePointer) return;
    const r = e.currentTarget.getBoundingClientRect();
    featRawX.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    featRawY.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    spotlight(e);
  };

  const onFeaturedLeave = () => {
    featRawX.set(0);
    featRawY.set(0);
  };

  const featuredRef = useRef<HTMLElement | null>(null);
  const featuredActive = useInView(featuredRef, { amount: 0.12 });

  /** Smooth scroll that clears the sticky 80px header. */
  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    history.replaceState(null, "", id === "home" ? "" : "#" + id);
  };

  return (
    <main>
      <AmbientBackdrop />
      <CursorLayer />
      <ScrollProgress />

      <motion.nav
        className="nav shell"
        data-hidden={navHidden}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <a className="brand" href="#home" onClick={(e) => scrollTo(e, "home")} aria-label="Abhishek Dhautre home">
          <span>Abhishek</span> Dhautre
        </a>
        <div className="nav-links">
          {[
            ["Work", "work"],
            ["Experience", "experience"],
            ["About", "about"],
            ["Journal", "journal"],
            ["Connect", "contact"],
          ].map(([label, id]) => (
            <a
              key={id}
              href={"#" + id}
              data-cursor=""
              className={activeSection === id ? "is-active" : undefined}
              onClick={(e) => scrollTo(e, id)}
            >
              {label}
            </a>
          ))}
        </div>
        <a
          className="nav-button"
          href={`mailto:${EMAIL}?subject=${encodeURIComponent(
            "Hello"
          )}&body=${encodeURIComponent("Hi Abhishek,\n\n")}`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            navMail.open("Hello", "Hi Abhishek,\n\n");
          }}
          data-cursor="OPEN ↗"
          data-mode="open"
        >
          Let&apos;s talk <ArrowUpRight size={15} />
        </a>
      </motion.nav>

      {/* ============================================================
          01 — HERO
      ============================================================ */}
      <motion.section
        className="hero shell"
        id="home"
        onMouseMove={handlePointer}
        onMouseLeave={resetPointer}
      >
        <div className="hero-copy-block">
          {/* 0ms — name first, then role, then headline, copy and actions */}
          <motion.h2
            className="hero-name"
            variants={blurUp}
            initial="hidden"
            animate="visible"
          >
            Abhishek <span className="hero-name-surname">Dhautre</span>
          </motion.h2>

          <motion.p
            className="eyebrow hero-eyebrow"
            variants={blurUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
          >
            SOFTWARE DEVELOPER · PUNE, INDIA
          </motion.p>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
            }}
          >
            <motion.span className="headline-line" variants={blurUp}>
              Building software
            </motion.span>
            <motion.span className="headline-line serif" variants={blurUp}>
              people can use.
            </motion.span>
          </motion.h1>

          <motion.p
            className="hero-copy"
            variants={blurUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.65 }}
          >
            I&apos;m Abhishek, a full-stack and mobile developer who enjoys turning
            ideas into practical products from interface and backend integration
            to databases and deployment.
          </motion.p>

          <motion.div
            className="hero-actions"
            variants={blurUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.8 }}
          >
            <motion.a
              className="primary-button magnetic"
              href="#work"
              onClick={(e) => scrollTo(e, "work")}
              data-cursor=""
              data-mode="magnetic"
              {...heroCta}
            >
              View selected work <ArrowUpRight size={16} />
            </motion.a>
            <a
              className="text-button"
              href={`mailto:${EMAIL}?subject=${encodeURIComponent(
                "Hello"
              )}&body=${encodeURIComponent("Hi Abhishek,\n\n")}`}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                heroMail.open("Hello", "Hi Abhishek,\n\n");
              }}
              data-cursor="OPEN ↗"
              data-mode="open"
            >
              Get in touch
            </a>
          </motion.div>

          <motion.div
            className="availability"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.05 }}
          >
            <span />
            <strong>Open to software development opportunities</strong>
          </motion.div>
        </div>

        {/* ---------- profile photographic panel ---------- */}
        <motion.aside
          className="profile-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={parallax}
          data-cursor=""
        >
          <div className="profile-card-top">
            <span>ABHISHEK / PROFILE</span>
            <span>2026</span>
          </div>

          <motion.div
            className="portrait-frame"
            initial={{ opacity: 0, clipPath: "inset(0% 0% 100% 0%)", scale: 1.03 }}
            animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)", scale: 1 }}
            transition={{ duration: 0.95, delay: 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="portrait-media"
              style={finePointer ? { x: photoX, y: photoY } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="portrait-img"
                src={PORTRAIT}
                alt="Abhishek Dhautre photographed outdoors in a white polo shirt with sunglasses, mountains and sky behind him."
                width={1200}
                height={1600}
                fetchPriority="high"
                decoding="async"
              />
            </motion.div>

            {/* cinematic grade: warm light, darkening, vignette, grain */}
            <div className="portrait-tone" />
            <div className="portrait-warm" />
            <div className="portrait-shadow" />
            <div className="portrait-vignette" />
            <div className="portrait-grain" />

            {/* slow orbital line details */}
            <motion.div
              className="portrait-orbits"
              style={finePointer ? { x: orbitX, y: orbitY } : undefined}
              aria-hidden="true"
            >
              <span className="orbit orbit-a" />
              <span className="orbit orbit-b" />
              <span className="orbit orbit-c" />
            </motion.div>

            {/* corner brackets — editorial framing, not a 3D card */}
            <span className="bracket bracket-tl" aria-hidden="true" />
            <span className="bracket bracket-tr" aria-hidden="true" />
            <span className="bracket bracket-bl" aria-hidden="true" />
            <span className="bracket bracket-br" aria-hidden="true" />

            {/* cursor-following light */}
            <motion.span
              className="portrait-glow"
              aria-hidden="true"
              style={
                finePointer
                  ? { x: glowX, y: glowY }
                  : undefined
              }
            />

            <span className="portrait-ambient" aria-hidden="true" />
            <motion.span
              className="portrait-tag"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.35, ease: "easeOut" }}
              style={finePointer ? { x: tagX, y: tagY } : undefined}
            >
              <strong>ABHISHEK DHAUTRE</strong>
              <em>SOFTWARE DEVELOPER</em>
            </motion.span>
          </motion.div>

          <div className="profile-card-bottom">
            <div>
              <small>Based in</small>
              <strong>Pune, India</strong>
            </div>
            <div>
              <small>Education</small>
              <strong>B.Tech · IT</strong>
            </div>
            <div>
              <small>Focus</small>
              <strong>Web + Mobile</strong>
            </div>
          </div>
        </motion.aside>
      </motion.section>

      <div className="facts-bar">
        <div className="shell facts">
          <div>
            <strong>20+</strong>
            <span>REST APIs worked with</span>
          </div>
          <div>
            <strong>2</strong>
            <span>Developer internships</span>
          </div>
          <div>
            <strong>1</strong>
            <span>Published mobile product</span>
          </div>
          <div>
            <strong>2</strong>
            <span>University recognitions</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          02 — FEATURED PROJECT
      ============================================================ */}
      <motion.section
        className="featured shell"
        id="featured"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger(0.11)}
        ref={featuredRef}
        onMouseMove={onFeaturedMove}
        onMouseLeave={onFeaturedLeave}
      >
        <motion.p className="featured-index" variants={riseUp}>
          01 / FEATURED PROJECT
        </motion.p>

        <div className="featured-head">
          <motion.span className="award-chip" variants={blurUp}>
            BEST PROJECT AWARD
          </motion.span>

          <motion.h2
            className="featured-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={finePointer ? { x: featTitleX, y: featTitleY } : undefined}
          >
            <RevealHeading>Skill Circle</RevealHeading>
          </motion.h2>

          <motion.p className="featured-line" variants={riseUp}>
            An idea that became <em>a product.</em>
          </motion.p>

          <motion.p className="featured-desc" variants={riseUp}>
            Skill Circle is a peer-to-peer skill-sharing platform designed to help
            people exchange knowledge, connect with learners, publish content,
            and track progress.
          </motion.p>

          <motion.div className="featured-stack" variants={riseUp}>
            {["React", "JavaScript", "Firebase", "Firestore"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </motion.div>
        </div>

        {/* project visual — interactive node system, not a fabricated screenshot */}
        <motion.div
          className="featured-visual"
          variants={{
            hidden: { opacity: 0, clipPath: "inset(14% 0% 0% 0%)" },
            visible: {
              opacity: 1,
              clipPath: "inset(0% 0% 0% 0%)",
              transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
            },
          }}
          style={finePointer ? { x: featVisualX, y: featVisualY } : undefined}
        >
          <a
            className="featured-hit"
            href="https://skill-circle-kappa.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Skill Circle — open live demo"
            data-cursor="VIEW"
            data-mode="view"
          >
            <span className="visually-hidden">Open Skill Circle live demo</span>
          </a>
          <SkillCircleSystem active={featuredActive} />
        </motion.div>

        <motion.div className="featured-foot" variants={riseUp}>
          <div className="featured-recognition">
            <small>MIT-ADT UNIVERSITY</small>
            <span>RECOGNITION</span>
          </div>
          <div className="featured-actions">
            <a
              className="primary-button"
              href="https://skill-circle-kappa.vercel.app/"
              target="_blank"
              rel="noreferrer"
              data-cursor="OPEN ↗" data-mode="open"
            >
              View project <ArrowUpRight size={16} />
            </a>
            <a
              className="secondary-button"
              href="https://github.com/abhishekdhautre/Skill-Circle"
              target="_blank"
              rel="noreferrer"
              data-cursor="OPEN ↗" data-mode="open"
            >
              GitHub <ArrowUpRight size={15} />
            </a>
          </div>
        </motion.div>
      </motion.section>

      {/* ============================================================
          03 — ABOUT
      ============================================================ */}
      <motion.section
        className="about section"
        id="about"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={stagger(0.1)}
      >
        <div className="shell about-grid">
          <motion.div variants={blurUp}>
            <p className="eyebrow">02 / ABOUT</p>
            <h2>
              Curious enough
              <br />
              to <DriftEm>build it.</DriftEm>
            </h2>
          </motion.div>

          <motion.div className="about-text" variants={riseUp}>
            <p className="about-lead">
              I like taking an idea from a rough problem statement to something
              that can actually be used.
            </p>
            <p>
              My work sits between frontend, mobile, backend integration, and
              product thinking. I&apos;m comfortable working with databases,
              authentication, APIs, deployment, and the details that make an
              application reliable.
            </p>
            <p className="about-person">
              I like figuring out how things actually work — why a system behaves
              the way it does, where the interesting decisions were made. I&apos;ll
              pick up a tool I don&apos;t know yet and learn it properly rather than
              skim it.
            </p>
            <p className="about-person">
              Outside of development: travelling and finding places I hadn&apos;t
              heard of, reading to reset, writing occasionally on Medium, and
              collecting ideas I don&apos;t have a use for yet.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* ============================================================
          04 — SELECTED WORK
      ============================================================ */}
      <motion.section
        className="section shell"
        id="work"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.12 }}
        variants={stagger(0.1)}
      >
        <div className="section-intro">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">03 / SELECTED WORK</p>
            <h2>
              <RevealHeading>Projects that solve</RevealHeading>
              <br />
              <em className="line-reveal">
                <RevealHeading delay={0.12}>actual problems.</RevealHeading>
              </em>
            </h2>
          </motion.div>
          <motion.p variants={riseUp}>
            A few products I&apos;ve built across web, mobile, privacy, and workflow
            automation. Each one started with a practical use case.
          </motion.p>
        </div>

        <div className="project-grid">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.title}
              project={project}
              index={index}
              fine={finePointer}
              spotlight={spotlight}
            />
          ))}
        </div>
      </motion.section>

      {/* ---------- tech marquee ---------- */}
      <TechMarquee />

      {/* ============================================================
          05 — FROM IDEA TO PRODUCT
      ============================================================ */}
      <motion.section
        className="process section shell"
        id="process"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger(0.1)}
      >
        <div className="section-intro compact">
          <motion.div variants={blurUp}>
            <p className="eyebrow">04 / PROCESS</p>
            <h2>
              From idea
              <br />
              to <em>product.</em>
            </h2>
          </motion.div>
          <motion.p variants={riseUp}>
            I enjoy taking a rough idea, understanding the problem behind it,
            figuring out how the pieces fit together, and turning it into
            something people can actually use.
          </motion.p>
        </div>

        <ProcessTimeline reduceMotion={Boolean(reduceMotion)} />
      </motion.section>

      {/* ============================================================
          06 — EXPERIENCE
      ============================================================ */}
      <motion.section
        className="experience section shell"
        id="experience"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={stagger(0.1)}
      >
        <div className="section-intro compact">
          <motion.div variants={blurUp}>
            <p className="eyebrow">05 / EXPERIENCE</p>
            <h2>
              Where I&apos;ve
              <br />
              <em>worked.</em>
            </h2>
          </motion.div>
          <motion.p variants={riseUp}>
            Hands-on development experience across production mobile applications
            and university systems.
          </motion.p>
        </div>
        <div className="timeline">
          <motion.article variants={riseUp}>
            <div className="timeline-date">JUN — AUG 2026</div>
            <div>
              <h3>Software Developer Intern · Logic Works</h3>
              <p>
                Built a society-management application with React Native and Spring
                Boot, including 20+ REST APIs, JWT role authentication, payments,
                PDF/Excel receipts, QR visitor entry, rate limiting, PostgreSQL,
                MongoDB Atlas, and production deployment.
              </p>
              <span className="timeline-tag">Published on App Store + Google Play</span>
            </div>
          </motion.article>
          <motion.article variants={riseUp}>
            <div className="timeline-date">2025</div>
            <div>
              <h3>Full Stack Developer Intern · MIT-ADT University</h3>
              <p>
                Took ownership of the Faculty Expense Tracker, converting a manual
                reimbursement workflow into a digital system with automated
                validation, role-based dashboards, and real-time Firebase
                synchronization.
              </p>
            </div>
          </motion.article>
        </div>
      </motion.section>

      {/* ============================================================
          07 — SKILLS
      ============================================================ */}
      <motion.section
        className="section shell skills"
        id="skills"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={stagger(0.08)}
      >
        <div className="section-intro compact">
          <motion.div variants={blurUp}>
            <p className="eyebrow">06 / TECHNICAL SKILLS</p>
            <h2>
              A practical
              <br />
              <em>toolkit.</em>
            </h2>
          </motion.div>
          <motion.p variants={riseUp}>
            I focus on technologies I can use to take a product from interface to
            data layer and deployment.
          </motion.p>
        </div>
        <div className="skill-list">
          {skills.map((group, index) => (
            <motion.div className="skill" key={group.label} variants={riseUp}>
              <span>0{index + 1}</span>
              <strong>{group.label}</strong>
              <div className="skill-items">
                {group.items.map((item) => (
                  <span
                    className="skill-chip"
                    key={item}
                    data-cursor=""
                    data-group={group.label}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ============================================================
          08 — RECOGNITION
      ============================================================ */}
      <motion.section
        className="section recognition"
        id="recognition"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger(0.08)}
      >
        <div className="shell">
          <motion.div className="recognition-head" variants={blurUp}>
            <p className="eyebrow">07 / RECOGNITION</p>
            <h2>
              Awards &amp;
              <br />
              <em>certifications.</em>
            </h2>
          </motion.div>

          <div className="recognition-list">
            {recognition.map((item, index) => (
              <motion.div
                className="recognition-item"
                key={item.title}
                variants={riseUp}
              >
                <span className="recognition-num">0{index + 1}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <em>{item.tag}</em>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ============================================================
          09 — JOURNAL
      ============================================================ */}
      <motion.section
        className="section journal"
        id="journal"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.12 }}
        variants={stagger(0.09)}
      >
        <div className="shell">
          <div className="section-intro compact">
            <motion.div variants={blurUp}>
              <p className="eyebrow">08 / OUTSIDE THE CODE</p>
              <h2>
                A little more
                <br />
                <DriftEm>than software.</DriftEm>
              </h2>
            </motion.div>
            <motion.p variants={riseUp}>
              Travel, books, writing, music, and visual references are part of what
              keeps me curious — and that curiosity usually finds its way back into
              what I build.
            </motion.p>
          </div>
          <div className="journal-grid">
            <motion.a
              className="journal-card journal-travel spotlight"
              variants={riseUp}
              onMouseMove={spotlight}
              data-cursor="OPEN ↗" data-mode="open"
              whileTap={{ scale: 0.99 }}
              href="https://in.pinterest.com/abhishek_dhautre/"
              target="_blank"
              rel="noreferrer"
            >
              <span className="journal-icon">
                <MapPin size={18} />
              </span>
              <small>01 / EXPLORE</small>
              <h3>Places worth remembering.</h3>
              <p>
                Travel, visual references and things that make me stop and look
                twice.
              </p>
              <span className="journal-link">
                Pinterest <ArrowUpRight size={14} />
              </span>
            </motion.a>
            <motion.a
              className="journal-card spotlight"
              variants={riseUp}
              onMouseMove={spotlight}
              data-cursor="OPEN ↗" data-mode="open"
              whileTap={{ scale: 0.99 }}
              href="https://medium.com/@abhidhautre"
              target="_blank"
              rel="noreferrer"
            >
              <span className="journal-icon">
                <PenLine size={18} />
              </span>
              <small>02 / WRITE</small>
              <h3>Thoughts, occasionally written down.</h3>
              <p>
                A space for ideas, observations and things I find worth putting into
                words.
              </p>
              <span className="journal-link">
                Medium <ArrowUpRight size={14} />
              </span>
            </motion.a>
            <motion.a
              className="journal-card spotlight"
              variants={riseUp}
              onMouseMove={spotlight}
              data-cursor="OPEN ↗" data-mode="open"
              whileTap={{ scale: 0.99 }}
              href="https://leetcode.com/u/Abhi_Dhautre/"
              target="_blank"
              rel="noreferrer"
            >
              <span className="journal-icon">
                <Code2 size={18} />
              </span>
              <small>03 / THINK</small>
              <h3>Still solving the hard problems.</h3>
              <p>
                Problem solving is one of the ways I keep sharpening the engineering
                side.
              </p>
              <span className="journal-link">
                LeetCode <ArrowUpRight size={14} />
              </span>
            </motion.a>
            <motion.a
              className="journal-card spotlight"
              variants={riseUp}
              onMouseMove={spotlight}
              data-cursor="OPEN ↗" data-mode="open"
              whileTap={{ scale: 0.99 }}
              href="https://open.spotify.com/user/qhxmcwzsm8sbx8ac4r6x3oyj0?si=9f20b1b14c5f4958"
              target="_blank"
              rel="noreferrer"
            >
              <span className="journal-icon">
                <Music2 size={18} />
              </span>
              <small>04 / LISTEN</small>
              <h3>Good software needs good soundtracks.</h3>
              <p>
                Music is one of the quieter ways I reset, focus and find
                inspiration.
              </p>
              <span className="journal-link">
                Spotify <ArrowUpRight size={14} />
              </span>
            </motion.a>
          </div>

          {/* ---------- 10 — SOCIALS ---------- */}
          <motion.div
            className="social-network"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={stagger(0.08)}
          >
            <motion.p className="social-network-label" variants={riseUp}>
              09 / ELSEWHERE ON THE INTERNET
            </motion.p>
            <div className="social-network-links">
              {socials.map((s) => (
                <motion.a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="social-link"
                  variants={riseUp}
                  data-cursor="OPEN ↗" data-mode="open"
                >
                  <span className="social-link-name">{s.name}</span>
                  <ArrowUpRight size={18} />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ============================================================
          11 — CONTACT
      ============================================================ */}
      <motion.section
        className="contact"
        id="contact"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger(0.1)}
      >
        <div className="shell contact-inner">
          <motion.p className="eyebrow" variants={riseUp}>
            10 / CONTACT
          </motion.p>
          <motion.h2 variants={blurUp}>
            Let&apos;s build
            <br />
            <em>something useful.</em>
          </motion.h2>
          <motion.p variants={riseUp}>
            I&apos;m currently open to software development roles, collaborations,
            and interesting products.
          </motion.p>

          <motion.div className="contact-actions" variants={riseUp}>
            <motion.a
              className="contact-cta"
              href={`mailto:${EMAIL}?subject=${encodeURIComponent(
                "Project enquiry"
              )}&body=${encodeURIComponent(
                "Hi Abhishek,\n\nI'd like to talk about a project.\n\n"
              )}`}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                // keep default navigation (opens the mail app when present)
                // and run the fallback check alongside it
                e.preventDefault();
                mail.open(
                  "Project enquiry",
                  "Hi Abhishek,\n\nI'd like to talk about a project.\n\n"
                );
              }}
              data-cursor=""
              data-mode="magnetic"
              {...contactCta}
            >
              <span className="contact-cta-text">
                {mail.copied ? "Email copied" : "Get in touch"}{" "}
                <ArrowUpRight size={22} />
              </span>
              <small>{EMAIL}</small>
            </motion.a>

            <a
              className="secondary-button"
              href="/Abhishek_Dhautre_Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="OPEN ↗" data-mode="open"
            >
              View resume <ArrowUpRight size={15} />
            </a>
          </motion.div>

          {mail.copied && (
            <motion.p
              className="contact-note"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              role="status"
            >
              No mail app is set up on this device — I&apos;ve copied{" "}
              <strong>{EMAIL}</strong> to your clipboard instead.
            </motion.p>
          )}
          <motion.div className="socials" variants={riseUp}>
            {socials.map((s) => (
              <a key={s.name} href={s.href} target="_blank" rel="noreferrer" data-cursor="OPEN ↗" data-mode="open">
                {s.name}
              </a>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <footer className="footer shell">
        <span>© 2026 Abhishek Dhautre</span>
        <span>Software Developer · Pune, India</span>
        <a href="#home" className="back-to-top" onClick={(e) => scrollTo(e, "home")}>
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </footer>
    </main>
  );
}