<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import { bitToMb, createFileList, validFile } from '@/utils/utils'
import { upload } from '@/utils/axios'
import type { RemoveParam } from './BaseUpload.vue'
import { ElMessage } from 'element-plus'

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

function handleAppend(e: Event) {
  const target = e.target as HTMLInputElement
  const tempFiles = Array.from((target as HTMLInputElement).files || [])
  const validatedFiles = tempFiles.filter((file) => validFile(file, { size: { less: 2 } }))

  if (validatedFiles.length && input.value) {
    const res = (files.value || []).concat(validatedFiles)
    input.value.files = createFileList(res)
    files.value = res
  }

  target.value === ''
}

const instance = getCurrentInstance()

async function handleSubmit() {
  if (!instance || !files.value) return
  uploading.value = true
  const formData = new FormData()
  files.value?.forEach((item) => {
    formData.append('img', item)
  })
  // *
  try {
    const { data } = await upload('/upload/multiple', formData)

    if (data.status === 0) throw Error('upload error please retry!')

    ElMessage.success('upload')
  } catch (e) {
    if (e instanceof Error) ElMessage.error(e.message)
  } finally {
    uploading.value = false
  }
}

function handleRemove(obj: RemoveParam) {
  const { index } = obj
  if (files.value) {
    files.value.splice(index, 1)
    input.value!.files = createFileList(files.value)
    console.log(input.value!.files, input.value!.value)
  }
}
</script>

<template>
  <base-upload
    :multiple="true"
    :files="files"
    :uploading="uploading"
    :input-props="{ accept: 'image/*' }"
    :append-file="true"
    @get-input="getInput"
    @input="handleInput"
    @submit="handleSubmit"
    @remove="handleRemove"
    @append="handleAppend"
  >
    <template #header>多文件上传</template>
    <template #tips>只能上传图片，且大小不能超过 2 M</template>
  </base-upload>
</template>
