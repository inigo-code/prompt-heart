import { useMemo } from 'react';

import { useActivity } from '@/profile/ActivityProvider';
import { insights, isoDate } from '@/profile/insights';
import { useHistory } from '@/store/HistoryProvider';
import { usePromptStore } from '@/store/PromptStore';

/** The profile's numbers, worked out from this phone's prompts, versions and copy log. */
export function useInsights() {
  const { prompts, folders } = usePromptStore();
  const history = useHistory();
  const { days } = useActivity();
  const today = isoDate(new Date());
  return useMemo(() => insights(prompts, folders, history.all, days, today), [prompts, folders, history.all, days, today]);
}
