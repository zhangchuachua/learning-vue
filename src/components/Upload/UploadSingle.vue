<script setup lang="ts">
import { ref, getCurrentInstance } from 'vue'
import { bitToMb } from '@/utils/utils'
import { ElMessage } from 'element-plus';

const instance = getCurrentInstance()
const input = ref<HTMLInputElement | null>()
const files1 = ref<File[] | null>(null)
const uploading = ref<boolean>(false)

function handleUploadChange1(e: Event) {
  const target = e.target as HTMLInputElement
  let tempFiles = null
  // 将 fileList 转换为数组
  if (target.files) tempFiles = Array.from(target.files)
  if (tempFiles) {
    if (tempFiles.some((file) => bitToMb(file.size) > 2)) {
      // 如果文件体积超过限制，那么就报错信息
      ElMessage.error('文件体积超过限制！')
      // 并且清空 input 的 value
      target.value = ''
    } else files1.value = tempFiles
  }
}

async function handleSubmit1() {
  console.log('submit');
  
  uploading.value = true
  const formData = new FormData()
  files1.value?.forEach((item) => {
    formData.set('img', item)
  })
  try {
    // *上传单文件，直接把 formData 放到 data 的位置就可以了
    const res = await instance?.proxy?.$http.post<{ status: number; path: string }>(
      '/upload/single',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    )
    if (res && res.data) {
      const { data } = res
      ElMessage.success(`可以通过 ${data.path} 访问图片`)
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message)
    }

    throw e
  } finally {
    uploading.value = false
  }
}

function handleRemove() {
  files1.value = null
  // *要想清空 input file 的文件, 不能直接清空 files 属性；正确的做法是清空 value 值
  if (input.value) input.value.value = ''
}

function getInput(el: HTMLInputElement) {
  input.value = el
}
</script>

<template>
  <base-upload
    :files="files1"
    :uploading="uploading"
    :multiple="false"
    @input="handleUploadChange1"
    @submit="handleSubmit1"
    @remove="handleRemove"
    @get-input="getInput"
  >
    <template #header>单文件上传</template>
    <template #tips>只能上传 png, jpeg, jpg 格式文件，且文件大小必须在 2M 以内</template>
  </base-upload>
</template>
