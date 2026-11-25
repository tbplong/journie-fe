import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getAdminStats } from '../../api/admin'
import { DashboardView } from '../../components/admin/DashboardView'
import { PageHeader } from '../../components/PageHeader'
import { DeviceOnlyNote } from '../../components/ui/DeviceOnlyNote'
import { useDashboardFilters } from '../../hooks/useDashboardFilters'
import { useTr } from '../../hooks/useTr'

/** UC 4.3 "View general dashboard" for the platform admin. */
export function AnalyticsPage() {
  const { tr } = useTr()
  const f = useDashboardFilters()
  const stats = useQuery({ queryKey: ['admin-stats', f.filters], queryFn: () => getAdminStats(f.filters) })
  return (
    <>
      <PageHeader title={tr('Tổng quan hệ thống', 'System dashboard')} subtitle={tr('Người dùng, lịch trình, tìm kiếm và đổi lịch trên toàn hệ thống.', 'Users, itineraries, searches and replanning across the system.')} />
      {/* The phone tab bar has room for five; the admin pages left out of it are reached from here */}
      <nav aria-label={tr('Trang quản trị khác', 'More admin pages')} className="-mt-4 mb-5 flex flex-wrap gap-2 lg:hidden">
        <Link to="/app/admin/data" className="btn-ghost btn-sm">
          {tr('Dữ liệu & mô hình', 'Data & model')}
        </Link>
        <Link to="/app/admin/businesses" className="btn-ghost btn-sm">
          {tr('Doanh nghiệp', 'Businesses')}
        </Link>
        <Link to="/app/admin/activity" className="btn-ghost btn-sm">
          {tr('Lịch sử hoạt động', 'Activity')}
        </Link>
        <Link to="/app/discover" className="btn-ghost btn-sm">
          {tr('Dữ liệu điểm đến', 'Places data')}
        </Link>
      </nav>
      <DeviceOnlyNote feature="admin-stats" className="-mt-4 mb-4">
        {tr('Máy chủ chưa có API thống kê, nên số liệu dưới đây tính từ dữ liệu trên trình duyệt này.', 'The server has no stats API yet, so these numbers come from the data in this browser.')}
      </DeviceOnlyNote>
      <DashboardView scope="admin" f={f} stats={stats.data} loading={stats.isLoading} error={stats.error} />
    </>
  )
}
