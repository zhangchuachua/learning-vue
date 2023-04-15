<script lang="ts">
type BaseInput = Partial<Omit<HTMLInputElement, 'hidden | type | multiple | onclick'>>

export interface BaseUploadProps {
  appendFile?: boolean
  multiple?: boolean
  inputProps?: BaseInput
  uploading?: boolean
  files: File[] | null
}

export interface BaseUploadEmits {
  (e: 'input-click', event: Event): void
  (e: 'input', event: Event): void
  (e: 'submit', event: Event): Promise<void>
  (e: 'remove', obj: RemoveParam, event: Event): void
  (e: 'get-input', el: HTMLInputElement): void
  (e: 'append', event: Event): void
}

export interface RemoveParam {
  file: File
  index: number
}
</script>
<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { ref } from 'vue'

withDefaults(defineProps<BaseUploadProps>(), {
  multiple: false,
  uploading: false,
  appendFile: false
})

const emit = defineEmits<BaseUploadEmits>()

const input = ref<HTMLInputElement | null>(null)
const appendInput = ref<HTMLInputElement | null>(null)

function handleChoose(e: Event) {
  if (input.value) {
    // 点击按钮时，函数触发 input 的点击
    input.value?.click()
  }
  emit('input-click', e)
}

function handleUploadChange(e: Event) {
  emit('input', e)
}

function handleAppend(e: Event) {
  emit('append', e)
}

async function handleSubmit1(e: Event) {
  await emit('submit', e)
}

function handleRemove(obj: RemoveParam, e: Event) {
  // *要想清空 input file 的文件, 不能直接清空 files 属性；正确的做法是清空 value 值
  emit('remove', obj, e)
}

function handleRef(el: Element | ComponentPublicInstance | null) {
  if (el) {
    input.value = el as HTMLInputElement
    emit('get-input', el as HTMLInputElement)
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
      <input
        type="file"
        ref="appendInput"
        v-bind="inputProps"
        :multiple="multiple"
        hidden
        @input="handleAppend"
      />
      <el-row>
        <el-col :span="24">
          <el-button @click="handleChoose" :disabled="uploading"> 选择文件 </el-button>
          <el-button
            v-if="appendFile"
            @click="
              () => {
                if (appendInput) appendInput.click()
              }
            "
            >添加文件</el-button
          >
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
                class="text-sm c-#aaa flex items-center justify-between"
                v-for="(file, index) in files"
                :key="file.name"
              >
                <span class="w-90% mr-5px truncate">{{ file.name }}</span>
                <i
                  class="i-ic-twotone-remove-circle-outline transition-all duration-300 hover:i-ic-baseline-remove-circle"
                  @click="handleRemove({ file, index }, $event)"
                />
              </li>
            </ul>
          </div>
          <p v-else class="mb-0 text-0.8em c-#aaa">
            <slot name="tips"> </slot>
          </p>
        </el-col>
      </el-row>
    </div>
  </el-card>
</template>
