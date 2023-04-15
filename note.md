# note

## volar 类型提示不正确

在项目中使用了 unplugin-auto-import, unplugin-vue-components 发现虽然生成了对应的 d.ts 但是在使用的时候类型提示全部都是 any

在 [volar](https://github.com/vuejs/language-tools/issues/2231) 发现了类似的 issue，发现可能是因为 pnpm 安装，导致  '@vue/runtime-core' 并没有在 node_modules 所以提示会有问题；

解决方法就是：使用 `declare module 'vue'` 替代 `declare module '@vue/runtime-core'`

按理来说使用 yarn 也可以解决问题

安装 '@vue/runtime-core' 作为依赖也可以解决问题

新的进展：在 unplugin-vue-component 的github 上发现了[解决方案](https://juejin.cn/post/7189812753366777915), 具体到原理可以看 [pnpm](https://pnpm.io/zh/npmrc#public-hoist-pattern)

## 如何修改 file input？

要想清空 file input，可以直接清空 input 的 value:  `input.value = ''`;

如果 file input 可以多选，我们又只需要清除选择的部分文件呢？此时不能修改 input 的 value 了，因为多选的 file input 的value 是第一个文件的 name；也就是说 value 只包含了一个文件；

所以只能修改 input 的 files，但是 files 是 FileList 类型的，只是可读性的，不能修改它的值；

所以直接对 input 的 files 重新赋值了，但是 FileList 也不能通过 new 的方式创建，不能进行初始化；这个时候可以使用 [DataTransfer](https://developer.mozilla.org/zh-CN/docs/Web/API/DataTransfer) 代替；

```js
const dataTransfer = new DataTransfer();
files.forEach(file => {
  dataTransfer.items.add(file);
})
input.value.files = dataTransfer.files;// 注意使用的是 dataTransfer.files 这个才是 FileList 类型
```

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

### vue3 如何注册事件

注册事件使用 defineEmit 方法，下面说一下 defineEmit 方法如何使用

```vue
<script setup lang='ts'>
// 这样就是声明了一个 event-name 的事件，那么父组件就可以使用 @event-name 传入事件处理函数；
const emit = defineEmit<{ (e: 'event-name', el: Element, e: Event) }>();

// 这样就可以触发事件
emit('event-name', el, e);
</script>
```
