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

const longText =
    'Quaerat ipsam necessitatibus eum quibusdam est id voluptatem cumque mollitia.'
const midText = 'Corrupti doloremque a quos vero delectus consequatur.'
const shortText = 'Eius optio fugiat.'

const generateData = (
    columns: ReturnType<typeof generateColumns>,
    length = 200,
    prefix = 'row-'
) =>
    Array.from({ length }).map((_, rowIndex) => {
      return columns.reduce(
          (rowData, column, columnIndex) => {
            let s = 'Row ';
            if(rowIndex % 2 === 0) s = longText;
            if(rowIndex % 7 === 0) s = midText;
            rowData[column.dataKey] = `${s} ${rowIndex} - Col ${columnIndex}`
            return rowData
          },
          {
            id: `${prefix}${rowIndex}`,
            parentId: null,
          }
      )
    })

const columns = generateColumns(10)
const data = generateData(columns, 1000)
</script>

<template>
  <i-table :columns="columns" :data="data" :estimated-item-size="40" :width="150" />
</template>