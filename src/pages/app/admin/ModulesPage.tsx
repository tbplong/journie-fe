import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setModuleEnabled, type ModuleId, type SystemModule } from '../../../api/admin'
import { keys, useModules } from '../../../api/queries'
import { PageHeader } from '../../../components/PageHeader'
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet'
import { DeviceOnlyNote } from '../../../components/ui/DeviceOnlyNote'
import { Skeleton, Switch } from '../../../components/ui/primitives'
import { useTr } from '../../../hooks/useTr'
import { toast } from '../../../store/toastStore'

const ABOUT: Record<ModuleId, { vi: string; en: string; bodyVi: string; bodyEn: string; api: string }> = {
  planner: { vi: 'Lập lịch trình bằng AI', en: 'AI itinerary planner', bodyVi: 'Đọc yêu cầu, chọn địa điểm và chia theo ngày.', bodyEn: 'Reads the request, picks places and splits them by day.', api: 'POST /chat, /retrieval, /routing' },
  recommend: { vi: 'Gợi ý địa điểm', en: 'Place recommendations', bodyVi: 'Danh sách nơi hợp với yêu cầu, lưu thành bộ sưu tập.', bodyEn: 'Places that fit a request, saved as sets.', api: 'POST /chat, /retrieval' },
  discover: { vi: 'Khám phá', en: 'Discover', bodyVi: 'Tìm kiếm và lọc địa điểm.', bodyEn: 'Search and filter places.', api: 'POST /retrieval' },
  live: { vi: 'Theo dõi chuyến đi & đổi lịch', en: 'Trip tracking & replanning', bodyVi: 'Vị trí, sự cố và đề xuất đổi lịch khi đang đi.', bodyEn: 'Location, incidents and replan proposals while travelling.', api: '/routing' },
  sets: { vi: 'Bộ sưu tập địa điểm', en: 'POI sets', bodyVi: 'Tạo, sửa, xoá bộ sưu tập.', bodyEn: 'Create, edit and delete sets.', api: '/poi-sets' },
  sharing: { vi: 'Chia sẻ lịch trình', en: 'Itinerary sharing', bodyVi: 'Liên kết chỉ-xem cho lịch trình.', bodyEn: 'View-only links for itineraries.', api: '/trips/{id}/share' },
}

/** UC 6.1 "View system modules", with disable (UC 6.3) and enable (UC 6.4) on each. */
export function ModulesPage() {
  const { tr, language } = useTr()
  const client = useQueryClient()
  const modules = useModules()
  const [turningOff, setTurningOff] = useState<SystemModule | null>(null)
  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: ModuleId; enabled: boolean }) => setModuleEnabled(id, enabled),
    onMutate: async ({ id, enabled }) => {
      await client.cancelQueries({ queryKey: keys.modules })
      const previous = client.getQueryData<SystemModule[]>(keys.modules)
      client.setQueryData<SystemModule[]>(keys.modules, (list) => list?.map((entry) => (entry.id === id ? { ...entry, enabled } : entry)))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(keys.modules, context.previous)
      toast('danger', tr('Chưa đổi được trạng thái', 'Could not change it'))
    },
    // Told from what was asked, not from the answer, so an empty 204 from the server still reads right
    onSuccess: (_module, { id, enabled }) => {
      setTurningOff(null)
      toast(enabled ? 'success' : 'info', enabled ? tr('Đã bật lại phân hệ', 'Module switched on') : tr('Đã tắt phân hệ', 'Module switched off'), tr(ABOUT[id].vi, ABOUT[id].en))
    },
    onSettled: () => client.invalidateQueries({ queryKey: keys.modules }),
  })

  return (
    <>
      <PageHeader title={tr('Phân hệ hệ thống', 'System modules')} subtitle={tr('Tắt tạm một phân hệ khi bảo trì; người dùng sẽ thấy thông báo thay vì trang lỗi.', 'Switch a module off for maintenance; people see a notice instead of a broken page.')} />
      <DeviceOnlyNote feature="modules" className="-mt-4 mb-4">
        {tr('Máy chủ chưa có API phân hệ, nên bật/tắt chỉ có tác dụng trên trình duyệt này và máy chủ chưa chặn các API tương ứng.', 'The server has no modules API yet, so switching only applies in this browser and the server does not block the matching APIs.')}
      </DeviceOnlyNote>
      {modules.isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs">
              <tr>
                <th scope="col" className="px-4 py-2">{tr('Phân hệ', 'Module')}</th>
                <th scope="col" className="hidden px-3 py-2 lg:table-cell">API</th>
                <th scope="col" className="hidden px-3 py-2 sm:table-cell">{tr('Trạng thái', 'Status')}</th>
                <th scope="col" className="hidden px-3 py-2 md:table-cell">{tr('Cập nhật', 'Updated')}</th>
                <th scope="col" className="px-4 py-2 text-right">{tr('Bật / tắt', 'On / off')}</th>
              </tr>
            </thead>
            <tbody>
              {/* A module this page does not know yet has no switch here */}
              {(modules.data ?? []).filter((module) => module.id in ABOUT).map((module) => {
                const about = ABOUT[module.id]
                return (
                  <tr key={module.id}>
                    <td className="px-4 py-2">
                      <span className="block font-semibold text-ink">{tr(about.vi, about.en)}</span>
                      <span className="block text-xs text-ink/60">{tr(about.bodyVi, about.bodyEn)}</span>
                      <span className={`mt-0.5 block text-xs font-semibold sm:hidden ${module.enabled ? 'text-jade-ink' : 'text-pomegranate'}`}>{module.enabled ? tr('Đang bật', 'On') : tr('Đang tắt', 'Off')}</span>
                    </td>
                    <td className="hidden px-3 py-2 font-mono text-xs text-ink/60 lg:table-cell">{about.api}</td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      <span className="console-level" data-level={module.enabled ? 'ok' : 'act'}>
                        {module.enabled ? tr('Đang bật', 'On') : tr('Đang tắt', 'Off')}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 text-xs text-ink/60 md:table-cell">{module.updatedAt ? new Date(module.updatedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '–'}</td>
                    <td className="px-4 py-2 text-right">
                      <Switch checked={module.enabled} onChange={(on) => (on ? toggle.mutate({ id: module.id, enabled: true }) : setTurningOff(module))} label={tr(`Bật/tắt ${about.vi}`, `Switch ${about.en} on or off`)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmSheet
        open={!!turningOff}
        onClose={() => setTurningOff(null)}
        danger
        busy={toggle.isPending}
        title={tr('Tắt phân hệ này?', 'Switch this module off?')}
        description={tr('Người dùng sẽ không dùng được tính năng này cho tới khi bạn bật lại.', 'People cannot use this feature until you switch it back on.')}
        confirmLabel={tr('Tắt', 'Switch off')}
        onConfirm={() => turningOff && toggle.mutate({ id: turningOff.id, enabled: false })}
      >
        {turningOff && <p className="text-sm font-semibold">{tr(ABOUT[turningOff.id].vi, ABOUT[turningOff.id].en)}</p>}
      </ConfirmSheet>
    </>
  )
}
