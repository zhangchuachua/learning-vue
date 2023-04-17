<script setup lang="ts"></script>

<template>
  <el-row :gutter="20">
    <el-col :span="8">
      <upload-single></upload-single>
    </el-col>
    <el-col :span="8">
      <upload-multi></upload-multi>
    </el-col>
    <el-col :span="8"><upload-base64></upload-base64></el-col>
  </el-row>
  <el-divider></el-divider>
  <el-row :gutter="20">
    <el-col :span="8"><upload-drag></upload-drag></el-col>
    <el-col :span="8"><upload-big-file></upload-big-file></el-col>
    <el-col :span="8">6</el-col>
  </el-row>
</template>
