import React from 'react';
import { Link } from 'react-router-dom';
import AppMark from './AppMark';
import AIMenu, { type MenuItem } from './AIMenu';

export interface NavTab { label: string; to: string; current: boolean }

interface Props {
  tabs?: NavTab[];
  search?: { value: string; onChange: (v: string) => void; placeholder: string };
  menuItems: MenuItem[];
  status?: string;
}

/** סרגל קבוע: שם ואייקון לבית, ניווט תוכן, חיפוש, וכפתור לוגו אחד. */
export default function TopBar({ tabs = [], search, menuItems, status }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link to="/" className="brand" aria-label="שכונה 360°, דף הבית">
          <AppMark />
          <span>שכונה <bdi className="num" style={{ fontWeight: 600 }}>360°</bdi></span>
        </Link>
        <nav className="tabs" aria-label="ניווט">
          {tabs.map(t => (
            <Link key={t.to} to={t.to} className="tab" aria-current={t.current ? 'page' : undefined}>{t.label}</Link>
          ))}
        </nav>
        {search ? (
          <div className="search" role="search">
            <svg className="glass" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input
              ref={inputRef}
              className="field"
              type="search"
              value={search.value}
              onChange={e => search.onChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') search.onChange(''); }}
              onFocus={e => e.currentTarget.select()}
              placeholder={search.placeholder}
              aria-label="חיפוש מדד"
            />
            <button className="x" type="button" aria-label="ניקוי החיפוש" title="ניקוי" onClick={() => { search.onChange(''); inputRef.current?.focus(); }}>×</button>
          </div>
        ) : <span />}
        <AIMenu items={menuItems} status={status} />
      </div>
    </header>
  );
}
