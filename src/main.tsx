import {createRoot} from 'react-dom/client'
import App from './app/App'
import SupperVR from './app/SupperVR'
import './style.css'

const view = new URLSearchParams(location.search).get('view')
const Page = view === 'supper180' ? SupperVR : App

createRoot(document.getElementById('root')!).render(<Page/>)
