<script setup lang="ts">
import { ref, getCurrentInstance } from 'vue'
import { bitToMb } from '@/utils/utils'

const instance = getCurrentInstance()

const upload1 = ref<HTMLInputElement>()
const files1 = ref<File[] | null>(null)
const uploading = ref<boolean>(false)

function handleChoose1() {
  if (upload1.value) {
    upload1.value?.click()
  }
}

function handleUploadChange1(e: Event) {
  const target = e.target as HTMLInputElement
  let tempFiles = null
  if (target.files) tempFiles = Array.from(target.files)
  if (tempFiles) {
    if (tempFiles.some((file) => bitToMb(file.size) > 2)) {
      instance?.proxy?.$message.error('文件体积超过限制！')
    } else files1.value = tempFiles
  }
}

async function handleSubmit1() {
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
      instance?.proxy?.$message.success(`可以通过 ${data.path} 访问图片`)
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
</script>

<template>
  <el-row :gutter="20">
    <el-col :span="8">
      <el-card>
        <template #header>
          <div class="font-700">单一文件上传</div>
        </template>
        <div>
          <input
            ref="upload1"
            type="file"
            name="single-file"
            id="single-file"
            accept="image/png, image/jpeg, image/gif"
            hidden
            @input="handleUploadChange1"
          />
          <el-row>
            <el-col :span="24">
              <el-button @click="handleChoose1"> 选择文件 </el-button>
              <el-button
                type="success"
                @click="handleSubmit1"
                :disabled="!files1"
                :loading="uploading"
              >
                上传到服务器
              </el-button>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="24">
              <div v-if="files1 && files1.length">
                <ul>
                  <li class="text-sm c-#aaa" v-for="file in files1" :key="file.name">
                    {{ file.name }}
                  </li>
                </ul>
              </div>
              <p v-else class="mb-0 text-0.8em c-#aaa">
                只能上传 png, jpeg, jpg 格式文件，且文件大小必须在 2M 以内
              </p>
            </el-col>
          </el-row>
        </div>
      </el-card>
    </el-col>
    <el-col :span="8">2</el-col>
    <el-col :span="8">3</el-col>
  </el-row>
</template>
