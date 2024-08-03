import { createRoot } from 'react-dom/client';
import { Settings } from '../components/Settings';
import '@picocss/pico/css/pico.min.css';

const container = document.getElementById('app') as HTMLDivElement;
const root = createRoot(container);

root.render(<Settings />);
