import { useEffect, useCallback } from 'react'
import { sceneAwarenessEngine } from '../services/scene'

export function useSceneAwareness() {
  // 页面加载时初始化为active
  useEffect(() => {
    sceneAwarenessEngine.recordAction('page_load')
  }, [])

  const recordAction = useCallback((action: string) => {
    sceneAwarenessEngine.recordAction(action)
  }, [])

  const recordError = useCallback(() => {
    sceneAwarenessEngine.recordError()
  }, [])

  const getSceneResponse = useCallback(() => {
    return sceneAwarenessEngine.getSceneResponse()
  }, [])

  const getUserState = useCallback(() => {
    return sceneAwarenessEngine.getUserState()
  }, [])

  return {
    recordAction,
    recordError,
    getSceneResponse,
    getUserState,
  }
}
