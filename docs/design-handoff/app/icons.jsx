// icons.jsx — line icon set. <Icon name size color strokeWidth />
// Exports to window: Icon
(function () {
  const P = {
    home:    <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V9.5"/>,
    calendar:<g><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v3.5M16 3v3.5"/></g>,
    clock:   <g><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></g>,
    tasks:   <g><path d="M4 6.5l1.6 1.6L9 4.7M4 13l1.6 1.6L9 11.2M4 19.3l1.6 1.6L9 17.5"/><path d="M12.5 6.2h7.5M12.5 12.6h7.5M12.5 19h7.5"/></g>,
    user:    <g><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></g>,
    bus:     <g><rect x="4" y="4" width="16" height="13" rx="2.5"/><path d="M4 11h16M8 4v7M16 4v7"/><circle cx="8" cy="20" r="1.4"/><circle cx="16" cy="20" r="1.4"/></g>,
    pot:     <g><path d="M5 10h14M6 10v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6"/><path d="M19 11.5h1.5a1.5 1.5 0 0 1 0 3H19M9 7c0-1.5 1.5-1.5 1.5-3M13.5 7c0-1.5 1.5-1.5 1.5-3"/></g>,
    shield:  <path d="M12 3 5 6v5.5c0 4.5 3 7.7 7 9.5 4-1.8 7-5 7-9.5V6l-7-3Z"/>,
    leaf:    <g><path d="M5 19c0-8 6-13 14-13 0 8-5 14-13 14"/><path d="M5 19c2.5-4.5 5.5-7 9.5-9"/></g>,
    broom:   <g><path d="M14.5 4 9 9.5M9.5 10.5l4 4"/><path d="M8.5 11.5 4 16c-1 1-1 3 0 4s3 1 4 0l4.5-4.5"/><path d="M13.5 10l3.5-3.5a2 2 0 0 0 0-3"/></g>,
    bell:    <g><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15L6 17Z"/><path d="M10 21.5a2.3 2.3 0 0 0 4 0"/></g>,
    doc:     <g><path d="M6.5 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 20V5a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="M13 3.5V9h5"/></g>,
    pin:     <g><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></g>,
    gps:     <g><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/><circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/></g>,
    chevron: <path d="M9 5l7 7-7 7"/>,
    back:    <path d="M15 5l-7 7 7 7"/>,
    plus:    <path d="M12 5v14M5 12h14"/>,
    check:   <path d="M4.5 12.5 9.5 17.5 20 6.5"/>,
    x:       <path d="M6 6l12 12M18 6 6 18"/>,
    sun:     <g><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8"/></g>,
    moon:    <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z"/>,
    logout:  <g><path d="M14 7V5.5A1.5 1.5 0 0 0 12.5 4h-7A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h7a1.5 1.5 0 0 0 1.5-1.5V17"/><path d="M9 12h11m0 0-3-3m3 3-3 3"/></g>,
    phone:   <path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 6a2 2 0 0 1 2-2Z"/>,
    gift:    <g><rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M4 13h16M12 9v11"/><path d="M12 9S10.5 4 8 4.5 9 9 12 9Zm0 0s1.5-5 4-4.5S15 9 12 9Z"/></g>,
    sparkle: <path d="M12 3l1.8 5.7L19.5 10l-5.7 1.8L12 17.5l-1.8-5.7L4.5 10l5.7-1.8L12 3Z"/>,
    fire:    <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.5.5-2.5 1.2-3.3C8.5 10 9 11 9 11s-.5-4 3-8Z"/>,
    drop:    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>,
    flag:    <g><path d="M6 21V4M6 5h10l-2 3.5L16 12H6"/></g>,
    arrowR:  <path d="M5 12h14m0 0-5-5m5 5-5 5"/>,
    refresh: <g><path d="M4 12a8 8 0 0 1 13.5-5.8L20 8M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.5 5.8L4 16M4 20v-4h4"/></g>,
    camera:  <g><path d="M4 8.5h3l1.5-2h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.2"/></g>,
    route:   <g><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M6 8.2v3.3a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4"/></g>,
    alert:   <g><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.2v.3"/></g>,
    play:    <path d="M7 4.5 19 12 7 19.5V4.5Z"/>,
    stop:    <rect x="6" y="6" width="12" height="12" rx="2.5"/>,
    settings:<g><circle cx="12" cy="12" r="3"/><path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M19 5l-1.5 1.5M6.5 17.5 5 19M19 19l-1.5-1.5M6.5 6.5 5 5"/></g>,
    globe:   <g><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 2.5 14.7 0 17M12 3.5c-2.5 2.3-2.5 14.7 0 17"/></g>,
    star:    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"/>,
    coffee:  <g><path d="M5 8h12v5a5 5 0 0 1-10 0V8Z"/><path d="M17 9h1.5a1.5 1.5 0 0 1 0 3H17M6 20h11"/></g>,
    heart:   <path d="M12 20s-7-4.6-7-9.6A4 4 0 0 1 12 7a4 4 0 0 1 7 3.4c0 5-7 9.6-7 9.6Z"/>,
  };

  function Icon({ name, size = 24, color = 'currentColor', strokeWidth = 1.8, style }) {
    const g = P[name] || P.sparkle;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        style={style} aria-hidden="true">
        {g}
      </svg>
    );
  }
  window.Icon = Icon;
})();
