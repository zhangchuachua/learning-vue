<template>
  <el-card :class="[dragging ? 'b-amber' : 'b-dashed']">
    <div
      class="flex-center flex-col"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @dragover="handleDragOver"
    >
      <input type="file" name="file" class="hidden" ref="input" @input="handleInput" />
      <i class="i-ion-md-cloud-upload text-80px"></i>
      <p>
        大文件上传drag in to
        <button
          class="p-0 bg-transparent b-none c-blue-6 text-1em cursor-pointer"
          @click="handleClick"
        >
          upload
        </button>
      </p>
    </div>
    <el-button-group>
      <el-button type="danger" @click="handleEmpty">清空</el-button>
      <el-button type="primary" @click="handleSubmit">上传</el-button>
    </el-button-group>
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
import { ref, watchEffect } from 'vue'
import SparkMD5 from 'spark-md5'
import { bitToMb } from '@/utils/utils'
import { upload } from '@/utils/axios'
import { isFirefox } from 'element-plus/es/utils'

const input = ref<HTMLInputElement | null>(null)
const files = ref<File[] | null>(null)
const dragging = ref<boolean>(false)

watchEffect(() => {
  console.log(files.value)
})

function handleClick() {
  if (!input.value) return
  input.value.click()
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) files.value = (files.value || []).concat(Array.from(target.files))

  target.value = ''
}

const enterCount = ref<number>(0)
function handleDragEnter() {
  enterCount.value += 1
  dragging.value = true
}

function handleDragLeave() {
  enterCount.value -= 1
  if (enterCount.value <= 0) dragging.value = false
}

// !注意，要想把图片拖到浏览器中而不引起浏览器默认行为，需要在 dragOver 和 drop 两个事件中都 preventDefault() 才可以
function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function handleDrop(e: DragEvent) {
  console.log('drop')
  dragging.value = false
  e.preventDefault()
  // !注意，要想拿到拖拽进来的文件，那么就必须要直接用 e.dataTransfer.files 去拿；如果先打印 e 或者 e.dataTransfer 然后再去控制台里面看，是看不到拖拽进来的文件的，可能是因为该对象已经更新了；
  if (e.dataTransfer?.files)
    files.value = (files.value || []).concat(Array.from(e.dataTransfer.files))
}

function handleRemove({ index }: { file: File; index: number }) {
  if (!files.value) return
  files.value.splice(index, 1)
}

function handleEmpty() {
  if (input.value) input.value.value = ''
  if (files.value) files.value = null
}

async function handleSubmit() {
  if (!files.value) return
  const bigFileList: File[] = []
  const smallFileList: File[] = []
  files.value.forEach((file) => {
    const mb = bitToMb(file.size)
    if (mb > 20) bigFileList.push(file)
    else smallFileList.push(file)
  })

  // 对小文件直接转换 hash 直接上传
  // const smallFormData = new FormData();
  // for (let file of smallFileList) {
  //   const spark = new SparkMD5.ArrayBuffer();
  //   const arrayBuffer = await file.arrayBuffer();
  //   spark.append(arrayBuffer);
  //   const hash = spark.end();
  //   smallFormData.append('file', file, hash);
  // }

  bigFileList.forEach(bigFile => {
    console.log(bigFileSplit(bigFile));
  })
  
}

function bigFileSplit(file: File): Blob[] {
  // *针对大文件就需要进行切片处理；
  // *主要有两种切法：一是固定切片数量，二是固定切片大小；
  // *切法也主要视情况而定：切片数量太大因为 js 是单线程会导致切片缓慢；切片体积太大会导致上传时间太长；  但是切片数量这个问题可以使用 webWorker 新开一个线程进行切片操作；于是在这里我选择固定切片体积；
  // 使用 webWorker 需要新建 js 文件，为了方便这里没有使用 webWorker
  const maxSize = 1 * 1024 * 1000
  // 计算切片的数量
  const count = file.size / maxSize;
  // File 有一个 slice 方法，可以进行切片
  const chunks: Blob[] = [];
  for (let i = 0; i < count; i++) {
    chunks.push(file.slice(i * maxSize, (i + 1) * maxSize));
  }
  return chunks;
}
</script>
