// screens-work.jsx — Roster, Leave, Tasks
// Exports: RosterScreen, LeaveScreen, TasksScreen
(function () {
  const { useState, useEffect, useRef } = React;

  // ─────────────────────────── ROSTER ───────────────────────────
  const WEEK = [
    { d: 'Mon', dk: 'day_mon', n: 2, on: true, sk: 'shift_morning', time: '7:30 – 3:30', nk: 'note_pickup' },
    { d: 'Tue', dk: 'day_tue', n: 3, on: true, sk: 'shift_morning', time: '7:30 – 3:30', nk: 'note_pickup' },
    { d: 'Wed', dk: 'day_wed', n: 4, on: true, sk: 'shift_split', time: '7:30 – 11 · 1 – 4', nk: 'note_maint' },
    { d: 'Thu', dk: 'day_thu', n: 5, on: true, sk: 'shift_morning', time: '7:30 – 3:30', nk: 'note_pickup' },
    { d: 'Fri', dk: 'day_fri', n: 6, on: true, sk: 'shift_morning', time: '7:30 – 3:30', nk: 'note_pickup' },
    { d: 'Sat', dk: 'day_sat', n: 7, on: true, sk: 'shift_half', time: '8:00 – 12:30', nk: 'note_exam' },
    { d: 'Sun', dk: 'day_sun', n: 8, on: false, sk: 'shift_off', time: '__rest__', nk: 'note_weeklyOff' },
  ];

  function RosterScreen({ t, app, role }) {
    const [sel, setSel] = useState(0);
    const [on, setOn] = useState(false);
    useEffect(() => { const r = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(r); }, []);
    const day = WEEK[sel];
    return (
      <div className="sm-screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bg, overflow: 'hidden' }}>
        <Header t={t} title={tr('ros_title')} sub={tr('ros_sub')} />
        {/* week strip */}
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 14px', overflowX: 'auto' }}>
          {WEEK.map((w, k) => {
            const active = k === sel, today = k === 0;
            return (
              <button key={w.d} onClick={() => setSel(k)} style={{ flex: '0 0 auto', width: 50, padding: '11px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: active ? role.accent : (w.on ? t.surface : t.sunken), boxShadow: active ? `0 10px 20px -8px ${role.accent}` : (w.on ? t.shadow : 'none'),
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all .2s' }}>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 11, color: active ? 'rgba(255,255,255,0.8)' : t.inkSoft }}>{tr(w.dk)}</span>
                <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17, color: active ? '#fff' : (w.on ? t.ink : t.inkFaint) }}>{w.n}</span>
                <span style={{ width: 6, height: 6, borderRadius: 6, background: active ? '#fff' : (w.on ? role.accent : 'transparent') }} />
                {today && <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 8, color: active ? '#fff' : role.accent, letterSpacing: 0.4 }}>{tr('ros_today')}</span>}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card t={t} raised style={{ background: day.on ? `linear-gradient(150deg, ${role.accent}, ${role.accent}cc)` : t.surface, ...useStagger(on, 0) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 12, color: day.on ? 'rgba(255,255,255,0.8)' : t.inkSoft, letterSpacing: 1 }}>{tr(day.dk)} · {tr('mon_jun_s')} {day.n}</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 24, color: day.on ? '#fff' : t.ink, marginTop: 5 }}>{tr(day.sk)}</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 15, background: day.on ? 'rgba(255,255,255,0.2)' : t.sunken, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={day.on ? 'clock' : 'coffee'} size={24} color={day.on ? '#fff' : t.inkSoft} strokeWidth={1.8} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 16 }}>
              <div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: day.on ? 'rgba(255,255,255,0.7)' : t.inkSoft, fontWeight: 700, letterSpacing: 0.4 }}>{tr('ros_hours')}</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: day.on ? '#fff' : t.ink, marginTop: 2 }}>{day.time === '__rest__' ? tr('rest') : day.time}</div>
              </div>
              <div style={{ width: 1, background: day.on ? 'rgba(255,255,255,0.25)' : t.line }} />
              <div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: day.on ? 'rgba(255,255,255,0.7)' : t.inkSoft, fontWeight: 700, letterSpacing: 0.4 }}>{tr('ros_note')}</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: day.on ? '#fff' : t.ink, marginTop: 2 }}>{tr(day.nk)}</div>
              </div>
            </div>
          </Card>
          <div style={useStagger(on, 1)}>
            <SectionLabel t={t}>{tr('ros_glance')}</SectionLabel>
            <Card t={t} pad={6}>
              {WEEK.map((w, k) => (
                <div key={w.d} onClick={() => setSel(k)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px', borderRadius: 14, cursor: 'pointer', background: k === sel ? t.sunken : 'transparent' }}>
                  <div style={{ width: 40, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 11, color: t.inkSoft }}>{tr(w.dk)}</div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: w.on ? t.ink : t.inkFaint }}>{w.n}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: w.on ? t.ink : t.inkFaint }}>{tr(w.sk)}</div>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: t.inkSoft, fontWeight: 600 }}>{w.time === '__rest__' ? tr('rest') : w.time}</div>
                  </div>
                  {w.on ? <span style={{ width: 9, height: 9, borderRadius: 9, background: role.accent }} /> : <Pill t={t} tone="neutral">{tr('ros_off')}</Pill>}
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────── LEAVE ───────────────────────────
  const BAL = [
    { typeK: 'lv_casual', used: 6, total: 12, color: '#0E5C4A', tone: 'brand' },
    { typeK: 'lv_sick', used: 4, total: 8, color: '#DA5347', tone: 'danger' },
    { typeK: 'lv_earned', used: 1, total: 15, color: '#E0922F', tone: 'warn' },
  ];
  const TIMELINE = [
    { labelK: 'tl_submitted', subK: 'tl_submitted_sub', done: true },
    { labelK: 'tl_review', subK: 'tl_review_sub', done: true },
    { labelK: 'tl_principal', subK: 'tl_principal_sub', done: false, active: true },
    { labelK: 'tl_approved', subK: 'tl_approved_sub', done: false },
  ];

  function LeaveScreen({ t, app, role }) {
    const [on, setOn] = useState(false);
    useEffect(() => { const r = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(r); }, []);
    const doneCount = TIMELINE.filter(s => s.done).length;
    return (
      <div className="sm-screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bg, overflow: 'hidden' }}>
        <Header t={t} title={tr('lv_title')} sub={tr('lv_sub')} onBack={() => app.go('home')}
          right={<IconBtn t={t} name="plus" bg={role.accent} tint="#fff" onClick={() => {}} />} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 11, ...useStagger(on, 0) }}>
            {BAL.map(b => {
              const left = b.total - b.used;
              return (
                <Card t={t} key={b.typeK} pad={14} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Ring value={left / b.total} size={58} stroke={7} color={t.dark ? (b.tone === 'brand' ? t.primary : b.color) : b.color} t={t}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 18, color: t.ink }}>{left}</span>
                    </Ring>
                  </div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 13.5, color: t.ink, marginTop: 10 }}>{tr(b.typeK)}</div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: t.inkSoft, fontWeight: 600 }}>{tr('lv_used', { u: b.used, t: b.total })}</div>
                </Card>
              );
            })}
          </div>

          <Btn t={t} kind="soft" full icon="plus" accent={role.accent} onClick={() => {}} style={{ ...useStagger(on, 1) }}>{tr('lv_request')}</Btn>

          {/* active request with timeline */}
          <div style={useStagger(on, 2)}>
            <SectionLabel t={t}>{tr('lv_active')}</SectionLabel>
            <Card t={t}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17, color: t.ink }}>{tr('lv_casual2')}</div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, color: t.inkSoft, fontWeight: 600, marginTop: 2 }}>{tr('lv_reason')}</div>
                </div>
                <Pill t={t} tone="warn" icon="clock">{tr('status_pending')}</Pill>
              </div>
              {/* progress bar */}
              <div style={{ height: 5, borderRadius: 5, background: t.sunken, marginBottom: 18, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 5, background: t.warn, width: on ? `${(doneCount / TIMELINE.length) * 100}%` : '0%', transition: 'width 1s cubic-bezier(.3,.8,.3,1) .3s' }} />
              </div>
              {TIMELINE.map((s, k) => (
                <div key={k} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: s.done ? t.success : s.active ? t.warnSoft : t.sunken, border: s.active ? `2px solid ${t.warn}` : 'none' }}>
                      {s.done ? <Icon name="check" size={14} color="#fff" strokeWidth={3} />
                        : s.active ? <span className="sm-blink" style={{ width: 8, height: 8, borderRadius: 8, background: t.warn }} />
                        : <span style={{ width: 7, height: 7, borderRadius: 7, background: t.inkFaint }} />}
                    </div>
                    {k < TIMELINE.length - 1 && <div style={{ width: 2, height: 26, background: s.done ? t.success : t.line, marginTop: 2 }} />}
                  </div>
                  <div style={{ paddingBottom: 8, flex: 1 }}>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: s.done || s.active ? t.ink : t.inkFaint }}>{tr(s.labelK)}</div>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: t.inkSoft, fontWeight: 600 }}>{tr(s.subK)}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          <div style={useStagger(on, 3)}>
            <SectionLabel t={t}>{tr('lv_history')}</SectionLabel>
            <Card t={t} pad={6}>
              {[['hist1', '24 May', 'success', 'status_approved'], ['hist2', '2 May', 'success', 'status_approved'], ['hist3', '18 Apr', 'danger', 'status_rejected']].map(([title, date, tone, st], k) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: t.sunken, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="gift" size={19} color={t.inkSoft} strokeWidth={1.9} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 13.5, color: t.ink }}>{tr(title)}</div>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11.5, color: t.inkSoft, fontWeight: 600 }}>{date}</div>
                  </div>
                  <Pill t={t} tone={tone}>{tr(st)}</Pill>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────── TASKS ───────────────────────────
  function TaskCard({ t, role, task, onComplete }) {
    const [dx, setDx] = useState(0);
    const [drag, setDrag] = useState(false);
    const [gone, setGone] = useState(false);
    const start = useRef(0);
    const W = 300;
    const onDown = e => { setDrag(true); start.current = e.clientX - dx; e.currentTarget.setPointerCapture(e.pointerId); };
    const onMove = e => { if (!drag) return; setDx(Math.max(0, Math.min(W, e.clientX - start.current))); };
    const onUp = () => {
      setDrag(false);
      if (dx > W * 0.55) { setDx(W); setGone(true); setTimeout(onComplete, 280); }
      else setDx(0);
    };
    const prog = Math.min(1, dx / (W * 0.55));
    return (
      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', maxHeight: gone ? 0 : 200, marginBottom: gone ? 0 : 10,
        opacity: gone ? 0 : 1, transition: gone ? 'max-height .3s ease, opacity .3s ease, margin .3s ease' : 'none' }}>
        {/* complete track behind */}
        <div style={{ position: 'absolute', inset: 0, background: t.success, display: 'flex', alignItems: 'center', paddingLeft: 22, borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, transform: `scale(${0.7 + prog * 0.3})`, opacity: 0.4 + prog * 0.6 }}>
            <Icon name="check" size={26} color="#fff" strokeWidth={3} />
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>{prog >= 1 ? tr('tsk_release') : tr('tsk_slide')}</span>
          </div>
        </div>
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ position: 'relative', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 20, padding: 16, touchAction: 'pan-y', cursor: 'grab',
            transform: `translateX(${dx}px)`, transition: drag ? 'none' : 'transform .32s cubic-bezier(.2,.8,.2,1)', boxShadow: t.shadow }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: task.priority === 'high' ? t.dangerSoft : t.sunken, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={task.icon} size={23} color={task.priority === 'high' ? t.danger : t.inkSoft} strokeWidth={1.9} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15.5, color: t.ink, letterSpacing: -0.2 }}>{tr(task.tkey)}</div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, color: t.inkSoft, fontWeight: 600, marginTop: 3 }}>{task.whereK ? tr(task.whereK) : task.where} · {tr(task.tmKey)}</div>
              <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                <Pill t={t} tone={task.priority === 'high' ? 'danger' : 'warn'}>{task.priority === 'high' ? tr('prio_urgent') : tr('prio_today')}</Pill>
                <Pill t={t} tone="neutral" icon="user">{tr(task.byKey)}</Pill>
              </div>
            </div>
            <Icon name="chevron" size={18} color={t.inkFaint} />
          </div>
        </div>
      </div>
    );
  }

  function TasksScreen({ t, app, role }) {
    const pend = app.tasks.filter(x => !x.done);
    const done = app.tasks.filter(x => x.done);
    return (
      <div className="sm-screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bg, overflow: 'hidden' }}>
        <Header t={t} title={tr('tsk_title')} sub={tr('tsk_sub', { n: pend.length })} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 120px' }}>
          {/* progress banner */}
          <Card t={t} style={{ marginBottom: 16, background: `linear-gradient(150deg, ${role.accent}, ${role.accent}cc)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Ring value={app.tasks.length ? done.length / app.tasks.length : 0} size={56} stroke={7} color="#fff" track="rgba(255,255,255,0.25)" t={t}>
                <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff' }}>{done.length}/{app.tasks.length}</span>
              </Ring>
              <div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 18, color: '#fff' }}>{pend.length === 0 ? tr('tsk_allDone') : tr('tsk_toGo', { n: pend.length })}</div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 2 }}>{pend.length === 0 ? tr('tsk_greatWork') : tr('tsk_keepUp')}</div>
              </div>
            </div>
          </Card>

          {pend.length === 0 && done.length === 0 ? null : null}
          {pend.map(task => <TaskCard key={task.id} t={t} role={role} task={task} onComplete={() => app.completeTask(task.id)} />)}

          {pend.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ width: 84, height: 84, borderRadius: 26, background: t.successSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Icon name="check" size={42} color={t.success} strokeWidth={2.4} />
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 19, color: t.ink }}>{tr('tsk_inboxZero')}</div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13.5, color: t.inkSoft, fontWeight: 600, marginTop: 4 }}>{tr('tsk_noPending')}</div>
            </div>
          )}

          {done.length > 0 && <>
            <SectionLabel t={t}>{tr('tsk_completed')}</SectionLabel>
            {done.map(task => (
              <Card t={t} key={task.id} pad={14} style={{ marginBottom: 10, opacity: 0.7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: t.successSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={20} color={t.success} strokeWidth={2.6} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: t.ink, textDecoration: 'line-through', textDecorationColor: t.inkFaint }}>{tr(task.tkey)}</div>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: t.inkSoft, fontWeight: 600 }}>{tr('tsk_completedNow')}</div>
                  </div>
                </div>
              </Card>
            ))}
          </>}
        </div>
      </div>
    );
  }

  Object.assign(window, { RosterScreen, LeaveScreen, TasksScreen });
})();
