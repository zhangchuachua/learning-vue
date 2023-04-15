<template>
  <base-upload
    :files="files"
    :uploading="uploading"
    :input-props="{ accept: 'image/*' }"
    :multiple="true"
    @input="handleInput"
    @submit="handleSubmit"
    @remove="handleRemove"
    @get-input="getInput"
  >
    <template #header>单文件上传</template>
    <template #tips>只能上传 png, jpeg, jpg 格式文件，且文件大小必须在 2M 以内</template>
  </base-upload>
</template>

<script setup lang="ts">
import { bitToMb, createFileList } from '@/utils/utils'
import instance from '@/utils/axios'
import { ref } from 'vue'
import type { RemoveParam } from './BaseUpload.vue'

const input = ref<HTMLInputElement | null>(null)
const files = ref<File[] | null>(null)
const uploading = ref<boolean>(false)

function getInput(el: HTMLInputElement) {
  input.value = el
}

function handleInput() {
  if (!input.value || !input.value.files) return

  const tempFiles = Array.from(input.value.files)

  const standardFile = tempFiles.filter((file) => bitToMb(file.size) <= 2)
  if (standardFile.length < tempFiles.length) {
    const fileList = createFileList(standardFile)
    input.value.files = fileList
    files.value = standardFile
    ElMessage.error('该文件超出大小限制！')
  } else {
    files.value = tempFiles
    console.log(input.value!.files, input.value!.value)
  }
}

async function handleSubmit() {
  if (!input.value?.files || !files.value) return

  await new Promise<{ filename: string; base64: string }[]>((resolve) => {
    const base64List: { filename: string; base64: string }[] = []
    files.value!.forEach((file) => {
      const temp = new FileReader()
      temp.readAsDataURL(file)
      temp.onload = function () {
        const len = base64List.push({
          filename: file.name,
          base64: encodeURIComponent(this.result as string)
        })
        if (len === files.value!.length) resolve(base64List)
      }
    })
  })
    .then((list) => {
      return instance.post<{
        status: 0
        path: string | string[] | undefined
      }>('/upload/base64', list, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    })
    .then(({ data }) => {
      console.log(data)
    })
    .catch((e) => {
      ElMessage.error(e.message)
    })
}

function handleRemove(obj: RemoveParam) {
  const { index } = obj
  if (files.value) {
    files.value.splice(index, 1)
    input.value!.files = createFileList(files.value)
  }
}
</script>
