<template>
  <el-card class="!b-dashed">
    <div class="flex-center flex-col" @drop="handleDrop" @dragover="handleDragOver">
      <input type="file" name="file" multiple class="hidden" ref="input" @input="handleInput" />
      <i class="i-ion-md-cloud-upload text-80px"></i>
      <p>
        drag in to
        <button
          class="p-0 bg-transparent b-none c-blue-6 text-1em cursor-pointer"
          @click="handleClick"
        >
          upload
        </button>
      </p>
    </div>
    <ul v-if="files && files.length">
      <li
        v-for="(file, index) in files"
        :key="file.name"
        class="text-sm c-#aaa flex items-center justify-between"
      >
        <span class="w-90% mr-5px truncate">{{ file.name }}</span>
        <i
          class="i-ic-twotone-remove-circle-outline transition-all duration-300 hover:i-ic-baseline-remove-circle"
          @click="handleRemove({ file, index })"
        />
      </li>
    </ul>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const input = ref<HTMLInputElement | null>(null)
const files = ref<File[] | null>(null)

function handleClick() {
  if (!input.value) return
  input.value.click()
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) files.value = (files.value || []).concat(Array.from(target.files))
  console.log(target.files)

  target.value = ''
}

// !注意，要想把图片拖到浏览器中而不引起浏览器默认行为，需要在 dragOver 和 drop 两个事件中都 preventDefault() 才可以
function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  // !注意，要想拿到拖拽进来的文件，那么就必须要直接用 e.dataTransfer.files 去拿；如果先打印 e 或者 e.dataTransfer 然后再去控制台里面看，是看不到拖拽进来的文件的，可能是因为该对象已经更新了；
  if (e.dataTransfer?.files)
    files.value = (files.value || []).concat(Array.from(e.dataTransfer.files))
}

function handleRemove({ index }: { file: File; index: number }) {
  if (!files.value) return
  files.value.splice(index, 1)
}
</script>
