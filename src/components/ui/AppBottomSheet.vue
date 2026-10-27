<script setup lang="ts">
import { X } from '@lucide/vue'
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    description?: string
  }>(),
  {
    title: undefined,
    description: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const titleId = useId()
const descriptionId = useId()
const closeButton = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

function close() {
  emit('update:modelValue', false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
    return
  }

  if (event.key !== 'Tab' || !panel.value) {
    return
  }

  const focusable = Array.from(
    panel.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)

  if (focusable.length === 0) {
    event.preventDefault()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function cleanup() {
  document.removeEventListener('keydown', handleKeydown)
  document.body.classList.remove('overflow-hidden')
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.addEventListener('keydown', handleKeydown)
      document.body.classList.add('overflow-hidden')
      await nextTick()
      closeButton.value?.focus()
    } else {
      cleanup()
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(cleanup)
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" @click="close" />

        <section
          ref="panel"
          class="sheet-panel absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-[720px] overflow-hidden rounded-t-[2rem] bg-base-100 shadow-2xl"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :aria-label="title ? undefined : 'Panel'"
          :aria-describedby="description ? descriptionId : undefined"
        >
          <div class="mx-auto mt-3 h-1.5 w-12 rounded-full bg-base-300" aria-hidden="true" />

          <header class="flex items-start justify-between gap-4 px-5 pt-4">
            <div>
              <h2 v-if="title" :id="titleId" class="text-lg font-semibold tracking-tight">
                {{ title }}
              </h2>
              <p v-if="description" :id="descriptionId" class="mt-1 text-sm text-base-content/65">
                {{ description }}
              </p>
            </div>
            <button
              ref="closeButton"
              type="button"
              class="btn btn-ghost btn-sm h-11 min-h-11 w-11 rounded-full p-0"
              aria-label="Tutup"
              @click="close"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div
            class="max-h-[70dvh] overflow-y-auto px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <slot />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
