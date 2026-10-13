import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, X } from 'lucide-react';
import type { TutorialStep } from './tutorialSteps';
import './tutorial.css';

interface TutorialOverlayProps {
  mode: 'welcome' | 'tour';
  steps: TutorialStep[];
  onStart: () => void;
  onStartFeature: (feature: string) => void;
  onSkip: () => void;
  onClose: (completed: boolean) => void;
  onNavigate: (tab: NonNullable<TutorialStep['tab']>) => void;
}

interface Rect { top: number; left: number; width: number; height: number; }

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ mode, steps, onStart, onStartFeature, onSkip, onClose, onNavigate }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);
  const active = steps[index];

  const locate = useCallback(() => {
    if (mode !== 'tour' || !active?.target) { setRect(null); setMissing(false); return; }
    const primary = document.querySelector<HTMLElement>(active.target);
    const mobileFallback = active.tab ? document.querySelector<HTMLElement>(`#bottom-nav-${active.tab}`) : null;
    const target = primary && primary.offsetParent !== null ? primary : mobileFallback;
    if (!target || target.offsetParent === null || target.getAttribute('aria-hidden') === 'true') {
      setRect(null); setMissing(true); return;
    }
    const bounds = target.getBoundingClientRect();
    setRect({ top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height });
    setMissing(false);
  }, [active, mode]);

  useEffect(() => {
    if (mode !== 'tour' || !active) return;
    if (active.tab) onNavigate(active.tab);
    let attempts = 0;
    let timer: number | undefined;
    const findTarget = () => {
      const primary = active.target ? document.querySelector<HTMLElement>(active.target) : null;
      const mobileFallback = active.tab ? document.querySelector<HTMLElement>(`#bottom-nav-${active.tab}`) : null;
      const target = primary && primary.offsetParent !== null ? primary : mobileFallback;
      if (target && target.offsetParent !== null) {
        target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
        timer = window.setTimeout(locate, 160);
      } else if (attempts++ < 12) {
        timer = window.setTimeout(findTarget, 100);
      } else {
        setRect(null); setMissing(true);
      }
    };
    timer = window.setTimeout(findTarget, 60);
    return () => { if (timer) window.clearTimeout(timer); };
  }, [mode, active, onNavigate, locate]);

  useLayoutEffect(() => {
    if (mode !== 'tour') return;
    const update = () => locate();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [mode, locate]);

  useEffect(() => {
    if (mode !== 'tour') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose(false);
      if (event.key === 'ArrowRight') advance(1);
      if (event.key === 'ArrowLeft') advance(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const advance = (direction: number) => {
    const next = index + direction;
    if (next < 0) return;
    if (next >= steps.length) { setRect(null); setIndex(steps.length); return; }
    setIndex(next);
  };

  if (mode === 'welcome') return <div className="sw-tour-backdrop" role="presentation">
    <section className="sw-tour-card sw-tour-welcome" role="dialog" aria-modal="true" aria-labelledby="sw-tour-title">
      <button className="sw-tour-close" aria-label="Close tutorial welcome" onClick={onSkip}><X size={20}/></button>
      <div className="sw-tour-icon"><GraduationCap size={28}/></div>
      <p className="sw-tour-eyebrow">ALTECH STOCKWISE</p>
      <h2 id="sw-tour-title">Welcome to StockWise</h2>
      <p>Take a quick guided tour of your store dashboard, products, inventory and sales tools. You can leave at any time and restart it from Help &amp; Tutorials.</p>
      <div className="sw-tour-actions">
        <button className="sw-tour-secondary" onClick={onSkip}>Skip for now</button>
        <button className="sw-tour-primary" onClick={onStart}>Start tutorial <ChevronRight size={17}/></button>
      </div>
      <div className="sw-tour-quick-start">
        <span>Or jump straight to a feature</span>
        <div>
          {['Products', 'Inventory', 'Sales / POS', 'Customers', 'Reports', 'Settings'].map((feature) => (
            <button key={feature} type="button" onClick={() => onStartFeature(feature)}>{feature}</button>
          ))}
        </div>
      </div>
    </section>
  </div>;

  if (!active) return <div className="sw-tour-backdrop" role="presentation"><section className="sw-tour-card" role="dialog" aria-modal="true">
    <button className="sw-tour-close" aria-label="Close tutorial" onClick={() => onClose(true)}><X size={20}/></button>
    <div className="sw-tour-icon"><CheckCircle2 size={28}/></div><h2>You're ready to get started</h2><p>You have reached the end of the StockWise introduction. Explore at your own pace, and return to Help &amp; Tutorials whenever you need a refresher.</p>
    <button className="sw-tour-primary sw-tour-full" onClick={() => onClose(true)}>Finish tour <CheckCircle2 size={17}/></button>
  </section></div>;

  const cardStyle: React.CSSProperties = rect ? {
    top: rect.top + rect.height + 14 + 230 > window.innerHeight ? 'auto' : Math.min(window.innerHeight - 260, rect.top + rect.height + 14),
    bottom: rect.top + rect.height + 14 + 230 > window.innerHeight ? 16 : 'auto',
    left: Math.max(12, Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 332)),
  } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return <div className="sw-tour-layer" role="presentation">
    <div className="sw-tour-shade" />
    {rect && <div className="sw-tour-spotlight" aria-hidden="true" style={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 }} />}
    <section className="sw-tour-card sw-tour-step-card" style={cardStyle} role="dialog" aria-modal="true" aria-labelledby="sw-tour-step-title">
      <button className="sw-tour-close" aria-label="Close tutorial" onClick={() => onClose(false)}><X size={20}/></button>
      <div className="sw-tour-progress"><span>{active.feature}</span><span>{index + 1} of {steps.length}</span></div>
      <div className="sw-tour-progress-track"><span style={{ width: ((index + 1) / steps.length * 100) + '%' }}/></div>
      <h2 id="sw-tour-step-title">{active.title}</h2>
      <p>{missing ? 'This area is not currently available in this layout or for your account. You can continue to the next topic.' : active.description}</p>
      <div className="sw-tour-actions">
        <button className="sw-tour-secondary" onClick={() => onClose(false)}>Skip tour</button>
        <div className="sw-tour-nav">
          <button className="sw-tour-icon-button" aria-label="Previous step" disabled={index === 0} onClick={() => advance(-1)}><ChevronLeft size={19}/></button>
          <button className="sw-tour-primary" onClick={() => advance(1)}>{index === steps.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={17}/></button>
        </div>
      </div>
    </section>
  </div>;
};
