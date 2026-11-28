import { ActivityList } from '../../../components/admin/ActivityList'
import { PageHeader } from '../../../components/PageHeader'
import { useTr } from '../../../hooks/useTr'
import { useAuthStore } from '../../../store/authStore'

/** UC 6.10 for every account (admin). */
export function AdminActivityPage() {
  const { tr } = useTr()
  return (
    <>
      <PageHeader title={tr('Lịch sử hoạt động', 'Activity history')} subtitle={tr('Hoạt động của mọi người dùng.', 'What every user did.')} />
      <section className="panel p-5">
        <ActivityList showUser />
      </section>
    </>
  )
}

/** UC 6.14 "View their own activity history". */
export function MyActivityPage() {
  const { tr } = useTr()
  const user = useAuthStore((state) => state.user)!
  return (
    <>
      <PageHeader title={tr('Hoạt động của tôi', 'My activity')} subtitle={tr('Những gì bạn đã làm trên Journie.', 'What you have done on Journie.')} />
      <section className="panel p-5">
        <ActivityList userId={user.id} self />
      </section>
    </>
  )
}
