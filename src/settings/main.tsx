import React from 'react'
import ReactDOM from 'react-dom/client'
import { BlueprintsProvider } from '@/shared/context/BlueprintsContext'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BlueprintsProvider>
      <App />
    </BlueprintsProvider>
  </React.StrictMode>,
)
