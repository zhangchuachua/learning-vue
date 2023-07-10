<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref, watchEffect } from 'vue'

const isDark = ref(true)

watchEffect(() => {
  if (isDark.value === true) document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
})
</script>

<template>
  <div class="w-full">
    <el-container class="min-h-100vh">
      <el-header class="b-b-#ccc b-b b-b-solid">
        <el-row class="h-60px items-center">
          <el-col :span="4" :offset="20">
            <el-switch v-model="isDark" class="ml-2" active-text="暗黑模式" inactive-text="普通模式"
              style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949" />
          </el-col>
        </el-row>
      </el-header>
      <el-container>
        <el-aside width="200px">
          <el-menu :router="true" class="h-full select-none">
            <el-sub-menu index="1">
              <template #title>
                <span>Navigator One</span>
              </template>
              <el-sub-menu index="1-4">
                <template #title>item four</template>
                <el-menu-item index="1-4-1">item one</el-menu-item>
              </el-sub-menu>
            </el-sub-menu>
            <el-menu-item index="virtualized-table">
              <span>虚拟化列表</span>
            </el-menu-item>
            <el-menu-item index="el-virtualized">
              <span>el-虚拟化列表</span>
            </el-menu-item>
            <el-menu-item index="upload-files">
              <span>上传大文件</span>
            </el-menu-item>
            <el-menu-item index="download-files">
              <span>下载大文件</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        <el-main>
          <RouterView />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>
