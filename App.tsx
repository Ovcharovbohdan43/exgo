import 'react-native-get-random-values';
import { initSentry } from './src/services/sentry';
import AppRoot from './src/AppRoot';

// Initialize Sentry as early as possible
initSentry();

export default function App() {
  return <AppRoot />;
}
