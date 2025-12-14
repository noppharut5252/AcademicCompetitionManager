import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Debug log to check if JS is executing
console.log('Application starting...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);