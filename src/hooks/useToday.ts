import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayLocal, type CalendarDate } from '@/domain/birthdays';

/** Today's local date; updates at midnight and when the app returns to the foreground. */
export function useToday(): CalendarDate {
  const [today, setToday] = useState(todayLocal);

  useEffect(() => {
    const refresh = () =>
      setToday((prev) => {
        const next = todayLocal();
        return prev.year === next.year && prev.month === next.month && prev.day === next.day ? prev : next;
      });
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(refresh, msToMidnight + 1000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [today]);

  return today;
}
