import { useEffect, useRef } from 'react';

export const DEV_SESSION_URL = 'https://claude.ai/code/session_01UBnSCHvqWuuuw5ZDrsGRTB';

export interface MenuItem {
  label: string;
  hint?: string;
  pressed?: boolean;
  disabled?: boolean;
  onSelect: () => unknown;
}

interface MenuElement extends HTMLElement {
  items: MenuItem[];
  status: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'ai-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { chat?: string; research?: string; brand?: string };
    }
  }
}

/**
 * כפתור הלוגו היחיד בסרגל (ai-menu.js מ-AppOfApp-GH). האפליקציה של עיריית אשדוד, ולכן brand="ashdod".
 * כל פעולות העריכה והמערכת נמצאות רק בתוכו.
 */
export default function AIMenu({ items, status }: { items: MenuItem[]; status?: string }) {
  const ref = useRef<MenuElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.items = items;
    el.status = status ?? '';
  }, [items, status]);
  return <ai-menu ref={ref} brand="ashdod" chat={DEV_SESSION_URL} />;
}
