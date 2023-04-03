<script setup lang="ts">
import type { Column } from "element-plus";
import { computed, onMounted, onUpdated, ref, withDefaults } from "vue";

interface TableData {
  id: string | number;

  [key: string]: number | undefined | null | string;
}

const props = withDefaults(defineProps<{
  columns: Column[],
  data: TableData[],
  estimatedItemSize?: number,
  width: number,
  rowHeight?: number,
  buffer?: number
}>(), {
  width: 150,
  rowHeight: 50,
  buffer: 3
});
const isDynamic = typeof props.estimatedItemSize === 'number' && !Number.isNaN(props.estimatedItemSize);
const rowHeight = isDynamic ? props.estimatedItemSize : props.rowHeight;
const width = props.columns.length * props.width;

const height = ref(0);
const start = ref(0);
const rows = ref<HTMLDivElement[]>();

const end = computed(() => start.value + 8 + props.buffer * 2);
const translate = computed(() => {
  return positionList[start.value].top
})

const positionList = props.data.map((item, index) => {
  height.value += rowHeight;
  return {
    index,
    width: props.width,
    height: rowHeight,
    top: index * rowHeight,
  }
})

function handleScroll(e: Event) {
  const target = e.target as HTMLDivElement;
  const { scrollTop } = target;
  const index = binarySearch(scrollTop);
  start.value = index >= props.buffer ? index - props.buffer : 0;
}

function binarySearch(scrollTop = 0) {
  let l = 0;
  let r = positionList.length - 1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    const { top } = positionList[mid];
    if(top === scrollTop) return mid;
    if (top > scrollTop) r = mid - 1;
    else {
      l = mid + 1;
    }
  }
  return r;// 二分搜索，我们这里查找第一个小雨 scrollTop 的值
}

function updated() {
  if (!isDynamic) return;
  console.log('updated')
  rows.value?.forEach((node) => {
    const { index: i } = node.dataset;
    const index = parseInt(i as string);
    const item = positionList[index];
    const { height: prevHeight } = item;
    const { height: realRowHeight } = node.getBoundingClientRect();
    if (prevHeight !== realRowHeight) {
      item.height = realRowHeight;
      const diff = realRowHeight - prevHeight;
      height.value += diff;
      for (let i = index + 1; i < positionList.length; i++) {
        const prev = positionList[i - 1];
        const position = positionList[i];
        position.top = prev.top + prev.height;
      }
    }
  })
}

onMounted(updated)

onUpdated(updated)
</script>

<template>
  <div class="w-full h-full flex flex-col-reverse relative justify-end" role="table">
    {{ start }} {{ end }}
    <div class="w-full h-400px overflow-auto" @scroll="handleScroll">
      <div class="will-change-transform"
           :style="`width: ${width}px; height: ${height}px;`"
           role="rowgroup">
        <div :style="`transform: translate(0, ${translate}px)`">
          <div class="flex b-b b-b-solid box-border" v-for="(row, index) in props.data.slice(start, end)" role="row"
               :key="row.id" :data-index="start + index" ref="rows">
            <div role="cell" class="" :style="`width: ${props.width}px;`"
                 v-for="col in props.columns" :key="col.key">
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