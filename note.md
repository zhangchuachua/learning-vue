# note

## vue3 不知道的点

### 定义全局变量

vue3 不能再使用 prototype 把变量或方法挂载到 vue 上了，但是可以这样挂载

```js
const app = createApp(App);
// *这样就可以进行挂载了
app.config.globalProperties.$http = axios;
app.use(...)
app.mount('#app');
```

但是如果使用 typescript 需要手动添加 globalProperties 的类型

```ts
declare module 'vue' {
  interface ComponentCustomProperties {
    $http: typeof import('axios')['default']
    $message: typeof import('element-plus/es')['ElMessage']
  }
}
```

### vue3 + typescript 在 setup 中定义类型时报错怎么办？

```vue
<script setup lang='ts'>
// https://github.com/vuejs/language-tools/issues/1232
// *如果在 setup 中这样写是会报错的；可以使用两种方法解决
type BaseInput = Omit<HTMLInputElement, 'type | hidden'>

const props = defineProps<BaseInput>();
</script>

<script lang='ts'>
// 第一种方法, 使用一个 <script lang='ts'> 标签专门定义类型
type BaseInput = Omit<HTMLInputElement, 'type | hidden'>
</script>

<script setup lang='ts'>
const props = defineProps<BaseInput>();
</script>

<!-- 第二种方法就是，在 tsconfig.json 中关闭 "declaration": true  -->
```

### vue 如何转发将子组件上的 ref 转发到真实 dom 上？

vue 的 props 不能声明 ref，ref 作为保留字

```vue
<!-- 第一种方法，不进行转发暴露出去 -->
<script setup lang='ts'>
import { ref } from 'vue';

const inputRef = ref<HTMLInputElement| null>(null);

// 暴露出去的属性，父组件可以通过子组件的实例访问
defineExpose({
  inputRef
})
</script>

<template>
<input ref="inputRef" />
</template>

<!-- 第二种方法 使用 ref 函数, 注意，不能直接修改 props 里面的属性，所以不能直接 props.inputRef.value = el; -->
<script lang='ts'>
interface Props {
  getInput: (el: HTMLInputElement) => void
}
</script>
<script setup lang="ts">
const props = defineProps<Props>();
function handleRef(el: Element | ComponentPublicInstance | null) {
  if(el) {
    props.getInput(el as HTMLInputElement); 
  }
}
</script>

<template>
<input :ref='handleRef' />
</template>
```

### vue 的 props 如何使用 ...rest

props 是不能解构的，所以也就不能直接使用 ...rest 可以用下面这样的方法曲线救国

```vue

<template>
  <!-- 就相当于 react 中的 {...rest} -->
  <input type="file" v-bind="inputProps">
</template>

<script lang="ts">
type BaseInput = Omit<HTMLInputElement, 'hidden | file'>
</script>
<script setup lang="ts">
const props = defineProps<{ inputRef: Ref<UnwrapRef<HTMLInputElement | null>>, inputProps: BaseInput }>()
</script>
```
