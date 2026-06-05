import { ref, onMounted, onUnmounted } from 'vue'

/** 响应式判断是否移动端（窗口宽度 < breakpoint） */
export function useMobile(breakpoint = 768) {
  const isMobile = ref(window.innerWidth < breakpoint)
  const onResize = () => {
    isMobile.value = window.innerWidth < breakpoint
  }
  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))
  return { isMobile }
}
