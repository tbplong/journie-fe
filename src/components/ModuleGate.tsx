import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { ModuleId } from '../api/admin'
import { useModuleEnabled } from '../api/queries'
import { useTr } from '../hooks/useTr'
import { useAuthStore } from '../store/authStore'
import { EmptyState } from './ui/primitives'

/** UC 6.3: a module the admin switched off shows a short notice instead of its page; an admin still sees the page itself. */
export function ModuleGate({ id, children }: { id: ModuleId; children: ReactNode }) {
  const { tr } = useTr()
  const enabled = useModuleEnabled(id)
  const role = useAuthStore((state) => state.user?.role)
  if (enabled || role === 'admin') return <>{children}</>
  return (
    <EmptyState
      title={tr('Tính năng đang tạm tắt', 'This feature is switched off for now')}
      body={tr('Quản trị viên đang bảo trì phần này. Bạn quay lại sau ít phút nhé.', 'The admin is working on this part. Please come back a little later.')}
      action={
        <Link to="/app" className="btn-gold">
          {tr('Về trang chủ', 'Back home')}
        </Link>
      }
    />
  )
}
