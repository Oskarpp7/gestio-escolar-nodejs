<template>
  <div class="family-dashboard min-h-screen bg-gray-50 p-4">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Dashboard Família</h1>
      <p v-if="family && family.name" class="text-gray-600 mt-1">
        Benvingut/da, {{ family.name }}
      </p>
      <p v-if="family && family.centre" class="text-sm text-gray-500">
        Centre: {{ family.centre }}
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div
        class="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"
      ></div>
      <span class="ml-3 text-gray-600">Carregant dades...</span>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
    >
      <div class="flex items-start">
        <div class="h-5 w-5 rounded-full bg-red-200 mt-0.5"></div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            Error carregant dades
          </h3>
          <p class="text-sm text-red-700 mt-1">
            {{ error }}
          </p>
          <button
            class="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
            @click="refreshData"
          >
            Tornar a intentar
          </button>
        </div>
      </div>
    </div>

    <!-- Contingut principal -->
    <div v-else-if="hasData" class="space-y-6">
      <!-- Stats ràpides -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="h-8 w-8 rounded bg-blue-100"></div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Total Fills</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ totalChildren }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="h-8 w-8 rounded bg-green-100"></div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Aquesta Setmana</p>
              <p class="text-2xl font-bold text-gray-900">-</p>
              <p class="text-xs text-gray-400">Assistència registrada</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="h-8 w-8 rounded bg-orange-100"></div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Pagaments</p>
              <p class="text-2xl font-bold text-gray-900">-</p>
              <p class="text-xs text-gray-400">Estat actualitzat</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Targetes fills -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChildCard
          v-for="child in childrenWithAttendance"
          :key="child.id"
          :child="child"
        />
      </div>

      <!-- Resum assistència setmanal -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">
            Assistència Aquesta Setmana
          </h3>
          <p class="text-sm text-gray-500">
            Resum d'assistència per tots els fills
          </p>
        </div>
        <div class="p-6">
          <WeeklyAttendanceGrid :attendance-data="weeklyAttendance" />
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="text-center py-12">
      <div class="text-gray-400">
        <div class="h-12 w-12 mx-auto mb-4 rounded-full bg-gray-200"></div>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No hi ha dades disponibles
      </h3>
      <p class="text-gray-500 mb-4">
        No s'han trobat fills associats a aquest compte.
      </p>
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        @click="refreshData"
      >
        Actualitzar Dades
      </button>
    </div>

    <!-- Botó refresc -->
    <div v-if="hasData && !loading" class="fixed bottom-6 right-6">
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        title="Actualitzar dades"
        @click="refreshData"
      >
        ↻
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useFamilyStore } from "@/stores/family";
import ChildCard from "@/components/family/ChildCard.vue";
import WeeklyAttendanceGrid from "@/components/attendance/WeeklyAttendanceGrid.vue";

const familyStore = useFamilyStore();
const {
  family,
  loading,
  error,
  totalChildren,
  childrenWithAttendance,
  hasData,
  weeklyAttendance,
} = storeToRefs(familyStore);
const { loadFamilyData, refreshData } = familyStore;

onMounted(() => {
  loadFamilyData();
});
</script>
