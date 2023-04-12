<script lang="ts">
type BaseInput = Omit<HTMLInputElement, 'hidden | type | multiple'>

export interface BaseUploadProps {
  multiple?: boolean
  inputProps?: BaseInput
  uploading?: boolean
  files: File[] | null
}

export interface BaseUploadEmits {
  inputClick?: (e: Event) => void
  input?: (e: Event) => void
  submit?: (e: Event) => Promise<void>
  remove?: (obj: RemoveParam, e: Event) => void
  getInput?: (el: HTMLInputElement) => void
}

interface RemoveParam {
  file: File
  index: number
}
</script>
<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { ref } from 'vue'

withDefaults(defineProps<BaseUploadProps>(), {
  multiple: false,
  uploading: false
})

const { input: emitInput, getInput, inputClick, submit, remove } =
  defineEmits<BaseUploadEmits>()

const input = ref<HTMLInputElement | null>(null)

function handleChoose(e: Event) {
  if (input.value) {
    // 点击按钮时，函数触发 input 的点击
    input.value?.click()
  }
  if (inputClick) inputClick(e)
}

function handleUploadChange(e: Event) {
  if (emitInput) {
    emitInput(e)
  }
}

async function handleSubmit1(e: Event) {
  if (submit) {
    await submit(e)
  }
}

function handleRemove(obj: RemoveParam, e: Event) {
  // *要想清空 input file 的文件, 不能直接清空 files 属性；正确的做法是清空 value 值
  if (remove) remove(obj, e)
}

function handleRef(el: Element | ComponentPublicInstance | null) {
  if (el) {
    input.value = el as HTMLInputElement
    if (getInput) getInput(el as HTMLInputElement)
  }
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="font-700"><slot name="header"></slot></div>
    </template>
    <div>
      <input
        v-bind="inputProps"
        :multiple="multiple"
        :ref="handleRef"
        type="file"
        hidden
        @input="handleUploadChange"
      />
      <el-row>
        <el-col :span="24">
          <el-button @click="handleChoose" :disabled="uploading"> 选择文件 </el-button>
          <el-button type="success" @click="handleSubmit1" :disabled="!files" :loading="uploading">
            上传到服务器
          </el-button>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="24">
          <div v-if="files && files.length">
            <ul>
              <li
                class="text-sm c-#aaa flex items-center"
                v-for="(file, index) in files"
                :key="file.name"
              >
                <span>{{ file.name }}</span>
                <i
                  class="i-ic-twotone-remove-circle-outline ml-1em transition-all duration-300 hover:i-ic-baseline-remove-circle"
                  @click="handleRemove({ file, index }, $event)"
                />
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
</template>
