import { useUiStore } from '../store/uiStore'

/** What a button in one of Journie's tips does: open Discover already filtered for the moment. */
export type DiAction = 'indoor' | 'food' | 'cafe'

export function applyDiAction(action: DiAction) {
  const { setDiscover } = useUiStore.getState()
  if (action === 'indoor') setDiscover({ indoorOnly: true })
  if (action === 'food') setDiscover({ categories: ['food'] })
  if (action === 'cafe') setDiscover({ categories: ['cafe'], indoorOnly: true })
}
