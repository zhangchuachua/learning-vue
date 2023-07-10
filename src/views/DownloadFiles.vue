<template>
  <el-table v-if="list" :data="list">
    <el-table-column prop="filename" label="文件名"></el-table-column>
    <el-table-column prop="path" label="路径"></el-table-column>
    <el-table-column label="操作" :width="200">
      <template #default="scope">
        <el-button link type="primary" @click="handleStreamDownload(scope.row)">流下载</el-button>
        <el-button link type="primary" @click="handleRangDownload(scope.row)">范围下载</el-button>
        <el-button link type="danger" @click="handleRemove(scope.row)">删除</el-button>
      </template>
    </el-table-column>
  </el-table>

  <div>
    <video ref="video" controls></video>
  </div>
</template>

<script lang="ts">
interface Files {
  filename: string;
  path: string;
}
interface DownloadListResponse {
  success: boolean;
  files: Files[];
}
</script>
<script setup lang="ts">
// TODO 完成下载大文件部分；下载大文件可以：流传输，range 范围切片传输；参考：https://juejin.cn/post/7005347768491311134 https://juejin.cn/post/6844903800252137480 https://juejin.cn/post/7219140831365857317
import http from '@/utils/axios';
import { ref, onBeforeMount, onMounted } from 'vue';

const list = ref<Files[] | null>(null);
const video = ref<HTMLVideoElement | null>(null);

onMounted(() => {
  console.log(video.value);

})

onBeforeMount(() => {
  http.get<DownloadListResponse>('/download/list').then(({ data }) => {
    list.value = data.files;
  })
})

async function handleStreamDownload(obj: Files) {
  const url = new URL('http://localhost:5174/download/stream');
  url.searchParams.append('path', obj.path);
  // window.open(url.href);
  fetch(url).then(response => {
    // 将文件转化而 blob
    return response.blob();
    // 然后使用该 blob 创建一个 ObjectURL
  }).then(blob => URL.createObjectURL(blob)).then(url => {
    console.log('objUrl', url);
    // 就可以使用这个 ObjectURL 呈现这个元素了，如下，如果是图片的话，使用 img 即可
    video.value?.setAttribute('src', url);
  })
}

function handleRangDownload(obj: Files) {
  console.log(obj.filename);
}

function handleRemove(obj: Files) {
  console.log(obj);

}
</script>
