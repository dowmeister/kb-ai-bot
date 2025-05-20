import React from 'react';
import ReactDOM from 'react-dom/client';
import './web/index.css';
import App from './web/app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);