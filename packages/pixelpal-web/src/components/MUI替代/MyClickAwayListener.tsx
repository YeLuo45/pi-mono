/**
 * MyClickAwayListener.tsx — MUI ClickAwayListener replacement
 *
 * Calls onClickAway when a click/touch event occurs outside the ref element.
 * Used for closing poppers, menus, dialogs on outside click.
 */

import { type FC, type ReactNode, useEffect, useRef } from 'react';

export interface MyClickAwayListenerProps {
  children: ReactNode;
  onClickAway: (event: MouseEvent | TouchEvent) => void;
  mouseEvent?: 'click' | 'mousedown' | 'mouseup' | false;
  touchEvent?: 'touchstart' | 'touchend' | false;
  className?: string;
}

export const MyClickAwayListener: FC<MyClickAwayListenerProps> = ({
  children,
  onClickAway,
  mouseEvent = 'click',
  touchEvent = 'touchstart',
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      onClickAway(event);
    };

    const handleTouch = (event: TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      onClickAway(event);
    };

    if (mouseEvent) {
      document.addEventListener(mouseEvent, handleClick);
    }
    if (touchEvent) {
      document.addEventListener(touchEvent, handleTouch);
    }

    return () => {
      if (mouseEvent) {
        document.removeEventListener(mouseEvent, handleClick);
      }
      if (touchEvent) {
        document.removeEventListener(touchEvent, handleTouch);
      }
    };
  }, [mouseEvent, touchEvent, onClickAway]);

  return (
    <div ref={ref} className="click-away-listener-root">
      {children}
    </div>
  );
};

export default MyClickAwayListener;