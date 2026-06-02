// ui.jsx — shared UI primitives. All take `t` (theme tokens).
// Exports: StatusBar, GestureBar, Btn, IconBtn, Card, Avatar, RolePill, Pill,
//          Ring, Skeleton, Header, SectionLabel, burstConfetti
(function () {
  const { useState, useRef } = React;

  function StatusBar({ t, tint }) {
    const c = tint || t.ink;
    return (
      <div style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', flexShrink: 0, position: 'relative', zIndex: 5 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: c, fontFamily: 'Manrope, sans-serif', letterSpacing: 0.2 }}>8:42</span>
        <div style={{ position: 'absolute', left: '50%', top: 9, transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: 100, background: '#05100c' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: c }}>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M1 7l2-2a6.5 6.5 0 0 1 10 0l2 2" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="9.5" r="1.2" fill={c}/></svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><rect x="0.5" y="6.5" width="3" height="4" rx="1" fill={c}/><rect x="4.5" y="4" width="3" height="6.5" rx="1" fill={c}/><rect x="8.5" y="1.5" width="3" height="9" rx="1" fill={c}/><rect x="12.5" y="6.5" width="2.5" height="4" rx="1" fill={c} opacity="0.4"/></svg>
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none"><rect x="1" y="1.5" width="19" height="9" rx="2.5" stroke={c} strokeWidth="1.3" opacity="0.5"/><rect x="2.8" y="3.3" width="13" height="5.4" rx="1.2" fill={c}/><rect x="21" y="4" width="1.6" height="4" rx="0.8" fill={c} opacity="0.5"/></svg>
        </div>
      </div>
    );
  }

  function GestureBar({ t, tint }) {
    return (
      <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 120, height: 4.5, borderRadius: 3, background: tint || t.ink, opacity: 0.28 }} />
      </div>
    );
  }

  function Btn({ t, kind = 'primary', children, onClick, full, icon, iconRight, accent, style, disabled }) {
    const [press, setPress] = useState(false);
    const palette = {
      primary: { bg: accent || t.primary, fg: t.onPrimary, bd: 'transparent' },
      gold:    { bg: t.gold, fg: '#3A2A06', bd: 'transparent' },
      soft:    { bg: t.dark ? 'rgba(255,255,255,0.08)' : (accent ? accent + '1f' : t.sunken), fg: accent || t.ink, bd: 'transparent' },
      ghost:   { bg: 'transparent', fg: t.ink, bd: t.lineStrong },
      danger:  { bg: t.dangerSoft, fg: t.danger, bd: 'transparent' },
    }[kind];
    return (
      <button onClick={onClick} disabled={disabled}
        onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)} onPointerLeave={() => setPress(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          width: full ? '100%' : 'auto', height: 54, padding: '0 22px', borderRadius: 16,
          background: palette.bg, color: palette.fg, border: `1.5px solid ${palette.bd}`,
          fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 16, letterSpacing: 0.1, whiteSpace: 'nowrap',
          cursor: 'pointer', opacity: disabled ? 0.45 : 1,
          transform: press ? 'scale(0.96)' : 'scale(1)',
          transition: 'transform .14s cubic-bezier(.2,.8,.2,1), box-shadow .2s',
          boxShadow: kind === 'primary' || kind === 'gold' ? '0 8px 22px -8px ' + (accent || (kind === 'gold' ? t.gold : t.primary)) + '88' : 'none',
          ...style,
        }}>
        {icon && <Icon name={icon} size={20} color={palette.fg} strokeWidth={2.1} />}
        {children}
        {iconRight && <Icon name={iconRight} size={20} color={palette.fg} strokeWidth={2.1} />}
      </button>
    );
  }

  function IconBtn({ t, name, onClick, tint, bg, size = 44, badge }) {
    const [press, setPress] = useState(false);
    return (
      <button onClick={onClick} onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)} onPointerLeave={() => setPress(false)}
        style={{ position: 'relative', width: size, height: size, borderRadius: 14, border: 'none', cursor: 'pointer',
          background: bg || (t.dark ? 'rgba(255,255,255,0.07)' : t.surface), color: tint || t.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: bg ? 'none' : t.shadow, transform: press ? 'scale(0.9)' : 'scale(1)', transition: 'transform .14s' }}>
        <Icon name={name} size={size * 0.46} color={tint || t.ink} strokeWidth={1.9} />
        {badge && <span style={{ position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 9, background: t.danger, border: `2px solid ${t.surface}` }} />}
      </button>
    );
  }

  function Card({ t, children, style, onClick, pad = 18, raised }) {
    const [press, setPress] = useState(false);
    return (
      <div onClick={onClick}
        onPointerDown={() => onClick && setPress(true)} onPointerUp={() => setPress(false)} onPointerLeave={() => setPress(false)}
        style={{ background: t.surface, borderRadius: 22, padding: pad, border: `1px solid ${t.line}`,
          boxShadow: raised ? t.shadowLg : t.shadow, cursor: onClick ? 'pointer' : 'default',
          transform: press ? 'scale(0.985)' : 'scale(1)', transition: 'transform .16s, box-shadow .2s', ...style }}>
        {children}
      </div>
    );
  }

  function Avatar({ t, name = '', accent, size = 44, src }) {
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return (
      <div style={{ width: size, height: size, borderRadius: size * 0.34, flexShrink: 0,
        background: `linear-gradient(140deg, ${accent || t.primary}, ${accent || t.primary}cc)`,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: size * 0.36,
        boxShadow: `0 6px 16px -6px ${accent || t.primary}99` }}>
        {initials}
      </div>
    );
  }

  function RolePill({ t, role, big }) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: big ? '8px 14px' : '5px 11px', whiteSpace: 'nowrap',
        borderRadius: 100, background: t.dark ? role.accent + '26' : role.accentSoft, color: t.dark ? role.accent : '#000',
        fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: big ? 14 : 12.5 }}>
        <Icon name={role.icon} size={big ? 18 : 15} color={role.accent} strokeWidth={2} />
        <span style={{ color: t.dark ? t.ink : '#2a2018' }}>{tr('role_' + role.key)}</span>
      </span>
    );
  }

  function Pill({ t, children, tone = 'neutral', icon }) {
    const map = {
      neutral: { bg: t.sunken, fg: t.inkSoft },
      success: { bg: t.successSoft, fg: t.success },
      warn:    { bg: t.warnSoft, fg: t.warn },
      danger:  { bg: t.dangerSoft, fg: t.danger },
      gold:    { bg: t.goldSoft, fg: t.dark ? t.gold : '#9A6B0E' },
      brand:   { bg: t.dark ? 'rgba(51,191,159,0.15)' : '#0E5C4A14', fg: t.primary },
    }[tone];
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 100,
        background: map.bg, color: map.fg, fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 12.5 }}>
        {icon && <Icon name={icon} size={14} color={map.fg} strokeWidth={2.2} />}
        {children}
      </span>
    );
  }

  function Ring({ value = 0, size = 64, stroke = 7, color, track, t, children }) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track || t.sunken} strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color || t.primary} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.3,.8,.3,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
      </div>
    );
  }

  function Skeleton({ t, w = '100%', h = 14, r = 8, style }) {
    return <div className="sm-shimmer" style={{ width: w, height: h, borderRadius: r, background: t.sunken, ...style }} />;
  }

  function SectionLabel({ t, children, right }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 2px 12px' }}>
        <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17, color: t.ink, letterSpacing: -0.2 }}>{children}</span>
        {right}
      </div>
    );
  }

  function Header({ t, title, sub, onBack, right, tint }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 18px 14px' }}>
        {onBack && <IconBtn t={t} name="back" onClick={onBack} bg={t.dark ? 'rgba(255,255,255,0.07)' : t.surface} tint={tint || t.ink} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 21, color: tint || t.ink, letterSpacing: -0.4, lineHeight: 1.1 }}>{title}</div>
          {sub && <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13.5, color: t.inkSoft, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
        </div>
        {right}
      </div>
    );
  }

  // DOM confetti burst centred on an element
  function burstConfetti(el, colors) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const host = el.closest('.sm-screen') || document.body;
    const hostRect = host.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - hostRect.left;
    const cy = rect.top + rect.height / 2 - hostRect.top;
    const N = 26;
    for (let i = 0; i < N; i++) {
      const p = document.createElement('div');
      const sz = 6 + Math.random() * 7;
      p.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${sz}px;height:${sz*0.5}px;border-radius:2px;background:${colors[i % colors.length]};pointer-events:none;z-index:60;will-change:transform,opacity;`;
      host.appendChild(p);
      const ang = (Math.PI * 2 * i) / N + (Math.random() - 0.5);
      const dist = 70 + Math.random() * 90;
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 30;
      const rot = (Math.random() - 0.5) * 720;
      p.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px,${dy + 120}px) rotate(${rot}deg)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
    }
  }

  Object.assign(window, { StatusBar, GestureBar, Btn, IconBtn, Card, Avatar, RolePill, Pill, Ring, Skeleton, SectionLabel, Header, burstConfetti });
})();
