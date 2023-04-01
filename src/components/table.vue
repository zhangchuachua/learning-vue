<script setup lang="ts">
import type { Column } from "element-plus";
import { computed, ref } from "vue";

interface TableData {
  [key: string]: number | undefined | null | string;
}

const props = defineProps<{ columns: Column[], data: TableData[], }>()

console.log(props.data, props.columns);

const baseWidth = 150;
const baseHeight = 50;
const width = props.columns.length * baseWidth;
const height = props.data.length * baseHeight;
const start = ref(0);
const end = ref(16);
const buffer = 4;
const t = computed(() => start.value >= buffer ? start.value - buffer : 0)

function handleScroll(e: Event) {
  const target = e.target as HTMLDivElement;
  const { scrollTop } = target;
  const temp = Math.floor(scrollTop / baseHeight)
  start.value = temp >= buffer ? temp - buffer : 0;
  end.value = start.value + 8 + buffer * 2;
  console.log(scrollTop)
}
</script>

<template>
  <div class="w-full h-full flex flex-col-reverse relative justify-end" role="table">
    {{ t }} {{ start }} {{ end }}
    <div class="w-full h-400px overflow-auto" @scroll="handleScroll">
      <div class="will-change-transform"
           :style="`width: ${width}px; height: ${(props.data.length - start) * baseHeight}px; transform: translate(0, ${start * baseHeight}px)`"
           role="rowgroup">
        <div >
          <div class="flex b-b b-b-solid box-border" v-for="row in props.data.slice(start, end)" role="row" :key="row.id">
            <div role="cell" class="" :style="`width: ${baseWidth}px; height: ${baseHeight}px`" v-for="col in props.columns" :key="col.key">
              {{ row[col.dataKey] }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex b-b b-b-solid box-border" role="rowgroup">
      <div class="font-500 lh-3em text-center" v-for="col in props.columns" :key="col.key"
           :style="`width: ${col.width}px`" role="row">
        <div role="cell">{{ col.title }}</div>
      </div>
    </div>
  </div>
</template>