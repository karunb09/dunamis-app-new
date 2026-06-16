import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import "./index.css";
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);
