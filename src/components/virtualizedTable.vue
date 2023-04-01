<script setup lang="ts">
import ITable from './table.vue';
const generateColumns = (length = 10, prefix = 'column-', props?: any) =>
    Array.from({ length }).map((_, columnIndex) => ({
      ...props,
      key: `${prefix}${columnIndex}`,
      dataKey: `${prefix}${columnIndex}`,
      title: `Column ${columnIndex}`,
      width: 150,
    }))

const generateData = (
    columns: ReturnType<typeof generateColumns>,
    length = 200,
    prefix = 'row-'
) =>
    Array.from({ length }).map((_, rowIndex) => {
      return columns.reduce(
          (rowData, column, columnIndex) => {
            rowData[column.dataKey] = `Row ${rowIndex} - Col ${columnIndex}`
            return rowData
          },
          {
            id: `${prefix}${rowIndex}`,
            parentId: null,
          }
      )
    })

const columns = generateColumns(10)
const data = generateData(columns, 20)
</script>

<template>
  <i-table :columns="columns" :data="data" />
</template>