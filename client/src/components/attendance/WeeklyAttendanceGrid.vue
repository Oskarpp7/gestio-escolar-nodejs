<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th
            class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            Fill
          </th>
          <th
            v-for="day in days"
            :key="day"
            class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {{ day }}
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-for="(records, childId) in attendanceData" :key="childId">
          <td class="px-3 py-2 text-sm text-gray-700">#{{ childId }}</td>
          <td
            v-for="(record, idx) in normalize(records)"
            :key="idx"
            class="px-3 py-2 text-center"
          >
            <span :class="record?.present ? 'text-green-700' : 'text-gray-400'">
              ●
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  attendanceData: {
    type: Object,
    required: true,
    default: () => ({}),
  },
});

const days = ["Dl", "Dt", "Dc", "Dj", "Dv"];
const normalize = (records) =>
  Array.isArray(records)
    ? records.slice(0, 5)
    : new Array(5).fill({ present: false });
</script>
