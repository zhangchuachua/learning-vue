<template>
  <el-card :class="[dragging ? 'b-amber' : 'b-dashed']">
    <div class="flex-center flex-col" @dragenter="handleDragEnter" @dragleave="handleDragLeave" @drop="handleDrop"
      @dragover="handleDragOver">
      <input type="file" name="file" class="hidden" ref="input" @input="handleInput" />
      <i class="i-ion-md-cloud-upload text-80px"></i>
      <p>
        大文件上传drag in to
        <button class="p-0 bg-transparent b-none c-blue-6 text-1em cursor-pointer" @click="handleClick">
          upload
        </button>
      </p>
    </div>
    <el-button-group>
      <el-button type="danger" @click="handleEmpty">清空</el-button>
      <el-button type="primary" @click="handleSubmit">上传</el-button>
    </el-button-group>
    <ul v-if="files && files.length">
      <li v-for="(file, index) in files" :key="file.name" class="text-sm c-#aaa flex items-center justify-between">
        <span class="w-90% mr-5px truncate">{{ file.name }}</span>
        <i class="i-ic-twotone-remove-circle-outline transition-all duration-300 hover:i-ic-baseline-remove-circle"
          @click="handleRemove({ file, index })" />
      </li>
    </ul>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import SparkMD5 from 'spark-md5'
import { bitToMb } from '@/utils/utils'
import http, { upload } from '@/utils/axios'
import type { ExistResponse } from '@/types/response'

// TODO 使用 range 完成一次断点续传

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

  for (let i of bigFileList) {
    const { hash, chunks } = await bigFileSplit(i);
    // *在进行上传之前，请求 API 判断之前是否已经上传过相同的文件，如果上传过，那么服务器端将直接返回上传成功，这就是秒传；
    const { data: { status, data } } = await http.post<ExistResponse>('/upload/big-file/exist', { hash, filename: i.name, })

    if (status === 'success') {
      const { isExist } = data;

      if (isExist) {
        console.log('exist');
        continue;
      } else if (Array.isArray(chunks) && chunks.length) {
        // TODO 断点续传
      } else {
        // TODO 完整的切片上传
      }
    }
  }

}

async function bigFileSplit(file: File) {
  // *针对大文件就需要进行切片处理；
  // *主要有两种切法：一是固定切片数量，二是固定切片大小；
  // *切法也主要视情况而定：切片数量太大因为 js 是单线程会导致切片缓慢；切片体积太大会导致上传时间太长；  但是切片数量这个问题可以使用 webWorker 新开一个线程进行切片操作；于是在这里我选择固定切片体积；
  // *还可以再切片的同时去获取二进制数据，然后计算 hash 因为获取二进制数据这一部分是异步的，所以可以优化性能
  // 使用 webWorker 需要新建 js 文件，为了方便这里没有使用 webWorker
  const maxSize = 1 * 1024 * 1000
  const spark = new SparkMD5.ArrayBuffer();
  const chunks: Blob[] = [];
  const promiseList: Promise<any>[] = [];

  async function split(count: number): Promise<string> {
    const chunk = file.slice(count * maxSize, ++count * maxSize);
    if (chunk.size > 0) {
      // *最开始的想法
      // *因为 chunk.arrayBuffer 函数是一个异步函数，如果使用 await 将会阻塞下一次 split，所以开始想的是，不使用 await，而是直接使用一个 then 当 arrayBuffer 读取完成时，进行 append: chunk.arrayBuffer().then(buffer => spark.append(buffer))
      // *因为都是异步的，所以在还需要一个 await 保证所有的 chunk 都进行读取了，所以使用了 promiseList 存储读取的 promise; promise.push(chunk.arrayBuffer().then(buffer => spark.append(buffer))) 最后使用一个 Promise.all(promiseList).then(() => spark.end()) 就可以获取 hash 了；
      // *这样的好处是 chunk.arrayBuffer 不会阻塞下一次 split，相当于 split(0) 这个递归函数完成后，就已经开始读取所有的 chunk.arrayBuffer 了，并且在递归函数结束前，可能有部分 arrayBuffer 已经读取完成了；
      // *但是这样有一个问题：那就是所有的 chunk.arrayBuffer 同时读取，那么是无法保证顺序的；一旦顺序出错，就会导致 hash 错误；
      // !而且经过实测，性能并没有提升多少，对于一个 140mb 的文件，只是提升了几十 ms 所以放弃了哪个方法，直接使用了 await 的方式;
      chunks.push(chunk);
      spark.append(await chunk.arrayBuffer());
      return split(count);
    }
    return spark.end();
  }

  const hash = await split(0);

  split(0);

  // const hash = await Promise.all(promiseList).then(() => spark.end());

  return {
    hash,
    chunks,
  };
}

// TODO 完成多线程的 chunk 上传； chunk 上传应该注意线程池，最多不要超过 6 个；formData 中除了二进制外，还应该携带 hash 与 index 不然后端无法进行拼接；
async function chunksUpload({ hash, chunks }: Awaited<ReturnType<typeof bigFileSplit>>) {

}
</script>
