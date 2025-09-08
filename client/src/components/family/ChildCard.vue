<template>
  <div class="bg-white rounded-lg shadow p-4">
    <div class="flex items-center justify-between">
      <div>
        <h4 class="text-base font-semibold text-gray-900">
          {{ child.name || "Alumne" }}
        </h4>
        <p v-if="child.classroom" class="text-xs text-gray-500">
          Aula: {{ child.classroom }}
        </p>
      </div>
      <span class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
        ID {{ child.id }}
      </span>
    </div>
    <div class="mt-3">
      <p class="text-xs text-gray-500 mb-1">Assistència setmanal</p>
      <ul class="grid grid-cols-5 gap-1">
        <li v-for="(day, idx) in attendance" :key="idx" class="text-center">
          <span
            class="inline-block w-6 h-6 leading-6 rounded text-xs"
            :class="
              day?.present
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-500'
            "
          >
            {{ day?.label || "·" }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  child: {
    type: Object,
    required: true,
    default: () => ({ attendance: [] }),
  },
});

const attendance = computed(() =>
  Array.isArray(props.child.attendance) ? props.child.attendance : [],
);
</script>
