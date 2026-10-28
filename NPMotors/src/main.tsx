import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      {/* Transparent so the app shell keeps its own background */}
      <FluentProvider theme={webLightTheme} style={{ backgroundColor: 'transparent' }}>
        <App />
      </FluentProvider>
    </Provider>
  </StrictMode>,
)
