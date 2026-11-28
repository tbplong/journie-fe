import { useTr } from '../../hooks/useTr'
import type { AccountStatus } from '../../store/authStore'

/** Active, blocked or waiting for the invite to be accepted. */
export function StatusBadge({ status }: { status?: AccountStatus }) {
  const { tr } = useTr()
  const look = { active: ['bg-firuze/15 text-jade-ink', tr('Hoạt động', 'Active')], blocked: ['bg-pomegranate/12 text-pomegranate', tr('Đã khoá', 'Blocked')], invited: ['bg-sun/20 text-sun-ink', tr('Chờ kích hoạt', 'Invited')] }[status ?? 'active']
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[0.68rem] font-bold ${look[0]}`}>{look[1]}</span>
}
