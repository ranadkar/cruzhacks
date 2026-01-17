import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Analytics } from '@vercel/analytics/react'
import './index.scss'
import App from './Routes.tsx'
import { store } from './lib/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <Analytics />
      <App />
    </Provider>
  </StrictMode>,
)
