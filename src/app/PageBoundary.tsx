import { Component, type ReactNode } from 'react'
import { useTr } from '../hooks/useTr'

/** A page that throws while rendering shows a reload button instead of blanking the app; the shell stays, and another page mounts a fresh boundary. */
export class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? <PageCrash /> : this.props.children
  }
}

function PageCrash() {
  const { tr } = useTr()
  return (
    <div role="alert" className="panel mx-auto mt-10 max-w-lg px-6 py-12 text-center">
      <h1 className="h-display text-2xl text-forest">{tr('Trang này gặp sự cố', 'This page ran into a problem')}</h1>
      <p className="mt-2 text-sm text-ink/60">{tr('Tải lại trang thường sẽ ổn thôi.', 'Reloading the page usually fixes it.')}</p>
      <button type="button" className="btn-gold mt-6" onClick={() => window.location.reload()}>
        {tr('Tải lại trang', 'Reload the page')}
      </button>
    </div>
  )
}
