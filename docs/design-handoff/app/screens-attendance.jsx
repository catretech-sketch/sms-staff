// screens-attendance.jsx — Attendance check-in/out with geo-fence + confetti
// Exports: AttendanceScreen
(function () {
  const { useState, useEffect, useRef } = React;

  function GeoRadar({ t, role, gps, inRange }) {
    // gps: 'locating' | 'ready'
    const locating = gps === 'locating';
    const dotColor = inRange ? t.success : t.danger;
    // position of "you" dot relative to centre
    const pos = inRange ? { x: 14, y: -10 } : { x: 64, y: 40 };
    return (
      <div style={{ position: 'relative', height: 188, flexShrink: 0, borderRadius: 24, overflow: 'hidden',
        background: t.dark ? 'radial-gradient(circle at 50% 45%, #143028, #0C1B16)' : 'radial-gradient(circle at 50% 45%, #E9F3EE, #DCEAE3)',
        border: `1px solid ${t.line}` }}>
        {/* concentric fence rings */}
        {[150, 108, 66].map((d, k) => (
          <div key={k} style={{ position: 'absolute', left: '50%', top: '46%', width: d, height: d, marginLeft: -d/2, marginTop: -d/2,
            borderRadius: '50%', border: `1.5px ${k === 0 ? 'dashed' : 'solid'} ${inRange ? t.success : t.danger}${k === 0 ? '66' : '2e'}`,
            background: k === 2 ? (inRange ? t.success + '22' : t.danger + '22') : 'transparent' }} />
        ))}
        {/* sweep */}
        {locating && <div className="sm-sweep" style={{ position: 'absolute', left: '50%', top: '46%', width: 150, height: 150, marginLeft: -75, marginTop: -75, borderRadius: '50%',
          background: `conic-gradient(from 0deg, transparent 0deg, ${role.accent}44 40deg, transparent 80deg)` }} />}
        {/* centre = duty post */}
        <div style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 30, height: 30, borderRadius: 11, background: role.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 14px -4px ${role.accent}` }}>
            <Icon name="pin" size={17} color="#fff" strokeWidth={2} />
          </div>
        </div>
        {/* you */}
        {!locating && <div className="sm-pop" style={{ position: 'absolute', left: `calc(50% + ${pos.x}px)`, top: `calc(46% + ${pos.y}px)`, transform: 'translate(-50%,-50%)' }}>
          <span style={{ position: 'absolute', inset: -7, borderRadius: '50%', background: dotColor + '33' }} className="sm-pulse" />
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: dotColor, border: '3px solid #fff', boxShadow: `0 2px 8px ${dotColor}` }} />
        </div>}
        {/* label chip */}
        <div style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderRadius: 100,
          background: t.dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)' }}>
          <Icon name="gps" size={16} color={locating ? t.warn : dotColor} strokeWidth={2} style={locating ? { animation: 'sm-spin 1.4s linear infinite' } : {}} />
          <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 12.5, color: t.ink }}>
            {locating ? tr('att_locating') : inRange ? tr('att_inZone') : tr('att_away')}
          </span>
        </div>
        {!locating && <div style={{ position: 'absolute', right: 12, bottom: 12, fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 11, color: t.inkSoft }}>
          ±{inRange ? '6' : '14'} m
        </div>}
      </div>
    );
  }

  function BigButton({ t, role, app, gps, inRange }) {
    const ref = useRef(null);
    const [busy, setBusy] = useState(false);
    const ci = app.checkedIn;
    const disabled = gps !== 'ready' || (!ci && !inRange);
    const color = ci ? t.danger : role.accent;
    const press = () => {
      if (disabled || busy) return;
      setBusy(true);
      setTimeout(() => {
        if (!ci) { app.checkIn(); burstConfetti(ref.current, [role.accent, t.gold, t.success, '#fff']); }
        else app.checkOut();
        setBusy(false);
      }, 650);
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!disabled && !busy && <>
            <span className="sm-pulse" style={{ position: 'absolute', width: 184, height: 184, borderRadius: '50%', border: `2px solid ${color}55` }} />
            <span className="sm-pulse" style={{ position: 'absolute', width: 184, height: 184, borderRadius: '50%', border: `2px solid ${color}55`, animationDelay: '1s' }} />
          </>}
          <button ref={ref} onClick={press} disabled={disabled}
            style={{ width: 184, height: 184, borderRadius: '50%', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative',
              background: disabled ? t.sunken : `radial-gradient(circle at 38% 30%, ${color}, ${color}cc)`,
              boxShadow: disabled ? 'none' : `0 22px 48px -14px ${color}, inset 0 2px 6px rgba(255,255,255,0.3)`,
              transform: busy ? 'scale(0.93)' : 'scale(1)', transition: 'transform .4s cubic-bezier(.2,.8,.2,1), background .3s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {busy ? <span className="sm-ckspin" style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />
              : <Icon name={ci ? 'logout' : 'gps'} size={48} color={disabled ? t.inkFaint : '#fff'} strokeWidth={1.8} />}
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 19, color: disabled ? t.inkFaint : '#fff', letterSpacing: -0.3 }}>
              {busy ? '' : ci ? tr('att_checkOut') : tr('att_checkIn')}
            </span>
          </button>
        </div>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 13.5, color: t.inkSoft, textAlign: 'center', maxWidth: 250 }}>
          {gps !== 'ready' ? tr('att_gettingLoc') : ci ? tr('att_onDutySince', { time: app.checkInTime, elapsed: app.elapsed }) : inRange ? tr('att_holdSteady') : tr('att_mustInside')}
        </div>
      </div>
    );
  }

  function LogRow({ t, icon, label, time, color, last }) {
    return (
      <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: color + '1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={17} color={color} strokeWidth={2} />
          </div>
          {!last && <div style={{ width: 2, flex: 1, minHeight: 22, background: t.line, marginTop: 4 }} />}
        </div>
        <div style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: t.ink }}>{label}</div>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, color: t.inkSoft, fontWeight: 600 }}>{time}</div>
        </div>
      </div>
    );
  }

  function AttendanceScreen({ t, app, role }) {
    const [gps, setGps] = useState('locating');
    const [inRange, setInRange] = useState(true);
    useEffect(() => { const id = setTimeout(() => setGps('ready'), 1500); return () => clearTimeout(id); }, []);

    return (
      <div className="sm-screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bg, overflow: 'hidden' }}>
        <Header t={t} title={tr('att_title')} sub="Greenfield Public School" onBack={() => app.go('home')}
          right={<IconBtn t={t} name="refresh" onClick={() => { setGps('locating'); setTimeout(() => setGps('ready'), 1200); }} />} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 120px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <GeoRadar t={t} role={role} gps={gps} inRange={inRange} />
          {/* demo toggle for range */}
          <div style={{ display: 'flex', background: t.sunken, borderRadius: 14, padding: 4 }}>
            {[[tr('att_inRange'), true], [tr('att_outRange'), false]].map(([lbl, val]) => (
              <button key={lbl} onClick={() => setInRange(val)} style={{ flex: 1, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: inRange === val ? t.surface : 'transparent', color: inRange === val ? t.ink : t.inkSoft,
                fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 13, boxShadow: inRange === val ? t.shadow : 'none', transition: 'all .2s' }}>{lbl}</button>
            ))}
          </div>
          <div style={{ padding: '14px 0 6px' }}><BigButton t={t} role={role} app={app} gps={gps} inRange={inRange} /></div>
          <Card t={t}>
            <SectionLabel t={t}>{tr('att_todayLog')}</SectionLabel>
            {app.checkedIn
              ? <LogRow t={t} icon="check" label={tr('att_checkedIn')} time={tr('att_inZoneAt', { time: app.checkInTime })} color={t.success} last />
              : <LogRow t={t} icon="clock" label={tr('att_notYet')} time={tr('att_shiftStarts')} color={t.inkFaint} last />}
          </Card>
        </div>
      </div>
    );
  }

  window.AttendanceScreen = AttendanceScreen;
})();
