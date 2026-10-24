import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

// アプリが前面に戻ったら、古くなったデータを取り直す
AppState.addEventListener('change', (state) => {
  focusManager.setFocused(state === 'active');
});
