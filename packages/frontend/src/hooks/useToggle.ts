import { ref } from 'vue'

export function useToggle(initialValue: boolean) {
  const isOn = ref(initialValue)

  function toggle(value: boolean) {
    isOn.value = value
  }
  function setIsOn() {
    isOn.value = true
  }
  function setIsOff() {
    isOn.value = false
  }

  return { isOn, toggle, setIsOn, setIsOff }
}
