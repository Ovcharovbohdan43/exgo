import 'react-native-get-random-values';
import { initSentry } from './src/services/sentry';
import './src/i18n'; // Initialize i18n
import AppRoot from './src/AppRoot';

// Initialize Sentry as early as possible
initSentry();

export default function App() {
  return <AppRoot />;
}
