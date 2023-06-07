# note

## volar 类型提示不正确

在项目中使用了 unplugin-auto-import, unplugin-vue-components 发现虽然生成了对应的 d.ts 但是在使用的时候类型提示全部都是 any

在 [volar](https://github.com/vuejs/language-tools/issues/2231) 发现了类似的 issue，发现可能是因为 pnpm 安装，导致 '@vue/runtime-core' 并没有在 node_modules 所以提示会有问题；

解决方法就是：使用 `declare module 'vue'` 替代 `declare module '@vue/runtime-core'`

按理来说使用 yarn 也可以解决问题

安装 '@vue/runtime-core' 作为依赖也可以解决问题

新的进展：在 unplugin-vue-component 的 github 上发现了[解决方案](https://juejin.cn/post/7189812753366777915), 具体到原理可以看 [pnpm](https://pnpm.io/zh/npmrc#public-hoist-pattern)

更新的进展：参照 [vitePress 官方配置](https://github.com/vuejs/vitepress/blob/main/.npmrc)修改；提升所有的依赖

## 如何修改 file input？

要想清空 file input，可以直接清空 input 的 value: `input.value = ''`;

如果 file input 可以多选，我们又只需要清除选择的部分文件呢？此时不能修改 input 的 value 了，因为多选的 file input 的 value 是第一个文件的 name；也就是说 value 只包含了一个文件；

所以只能修改 input 的 files，但是 files 是 FileList 类型的，只是可读性的，不能修改它的值；

所以直接对 input 的 files 重新赋值了，但是 FileList 也不能通过 new 的方式创建，不能进行初始化；这个时候可以使用 [DataTransfer](https://developer.mozilla.org/zh-CN/docs/Web/API/DataTransfer) 代替；

```js
const dataTransfer = new DataTransfer()
files.forEach((file) => {
  dataTransfer.items.add(file)
})
input.value.files = dataTransfer.files // 注意使用的是 dataTransfer.files 这个才是 FileList 类型
```

## 后端如何对上传的文件进行去重

> 前端也可以计算 hash 值，具体前端还是后端去生成 hash 值视实际情况而定；

因为没有做过后端，只能参考 GPT 的回答：

在 Node.js 后端中对上传的文件进行去重，可以采用以下步骤：

获取上传的文件的内容或者哈希值，可以使用 Node.js 内置的 crypto 模块计算文件的哈希值。也可以使用 spark-md5

将哈希值保存到数据库中或者其他持久化存储中，作为唯一标识符。

在上传新文件之前，先查询数据库或者其他持久化存储中是否已经存在相同的哈希值，如果存在，则说明该文件已经上传过，可以直接忽略；如果不存在，则可以继续上传。

如果需要在上传过程中实现去重，可以在上传文件之前先检查文件名或者文件大小是否与已上传的文件相同，如果相同，则可以直接忽略，否则继续上传。

需要注意的是，如果两个文件的内容相同，则它们的哈希值也相同。因此，使用哈希值对文件进行去重是一种可靠的方法。但是，如果两个文件的内容不同，但是哈希值相同的情况也是存在的（被称为哈希碰撞），因此需要选择一个哈希算法，以确保哈希碰撞的概率尽可能小。

---

在 Node.js 中，我们可以通过计算上传文件的哈希值并与数据库中存储的哈希值进行比较来实现文件去重。以下是一个简单的示例，展示了如何使用 Node.js 和 Express 处理上传的文件并进行去重：

1. 安装必要的 npm 包：

```bash
npm install express multer crypto
```

这将安装 Express（一个流行的 Node.js Web 框架）、Multer（一个用于处理 multipart/form-data 的中间件，通常用于上传文件）和 Crypto（一个 Node.js 核心模块，用于处理哈希和加密）。

2. 创建一个名为 `app.js` 的文件，并添加以下代码：

```javascript
// 导入所需的模块
const express = require('express')
const multer = require('multer')
const crypto = require('crypto')
const fs = require('fs')

// 初始化 Express 应用
const app = express()

// 初始化 Multer，配置临时文件存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })

// 模拟一个数据库，用于存储文件哈希值
const fileHashDatabase = new Set()

// 用于计算文件哈希值的函数
function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (data) => {
      hash.update(data)
    })

    stream.on('end', () => {
      resolve(hash.digest('hex'))
    })

    stream.on('error', (error) => {
      reject(error)
    })
  })
}

// 处理文件上传的路由
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path
    const fileHash = await calculateFileHash(filePath)

    if (fileHashDatabase.has(fileHash)) {
      fs.unlinkSync(filePath)
      res.status(409).send('文件已存在，已执行去重操作')
    } else {
      fileHashDatabase.add(fileHash)
      res.status(200).send('文件上传成功')
    }
  } catch (error) {
    res.status(500).send('服务器发生错误')
  }
})

// 启动服务器
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
```

这个示例中，我们使用 Multer 处理上传的文件，并将其存储在 `./uploads` 目录中。然后，我们使用 `calculateFileHash` 函数计算文件的 SHA-256 哈希值。接着，我们检查哈希值是否已存在于 `fileHashDatabase` 中（一个简单的 Set 数据结构用来模拟数据库）。如果哈希值已存在，我们删除文件并返回一个 409 状态码，表示文件已存在。否则，我们将哈希值添加到数据库中，并返回 200 状态码，表示文件上传成功。

要运行此示例，请确保在项目根目录下创建一个名为 `uploads` 的文件夹，然后运行 `node app.js`。你可以使用 Postman 或类似工具测试文件上传和去重功能。

## node 中的路径全局变量有哪些？

1. process.cwd() 当前项目的根目录, 绝对路径
2. \_\_dirname：当前文件所在的目录，绝对路径
3. \_\_filename: 当前文件的路径，包含文件名，绝对路径

## 后端如何转 base64

node 转换 base64 只需要使用 `Buffer.from(base64, 'base64')` 即可转换为二进制；随后就可以使用 `fs.writeFileSync(path, img)` 存储

但是有一个注意的点：在使用 Buffer 转换之前需要先把 `data:image/png;base64` 这样的一段去掉才可以；

## 如何读取上传的文件

要读取上传的文件可以使用 [FileReader](https://developer.mozilla.org/zh-CN/docs/Web/API/FileReader)

```js
fileList.forEach((file) => {
  // 创建实例
  // *注意一个 fileReader 只能读取一个 file
  const fileReader = new FileReader()
  // *读取 file 的内容，并且输出为 DataURL 也就是 base64
  // *不仅可以输出为 base64 还可以输出为其他类型
  fileReader.readAsDataURL(file);
  // *读取的过程是一个异步操作，所以，需要使用回调函数进行监听；可以使用 Promise 进行封装
  fileReader.onload = function () {
    // *再回调函数中可以使用 this.result 进行访问
    console.log(this.result);
  }
})
```

## 上传进度

如果使用 XMLHttpRequest 及其封装的库（比如 axios），那么将会原生支持 progress 事件，因为 XMLHttpRequest 就有 [onprogress](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestUpload/progress_event) 事件；

注意：XMLHttpRequest 有一个 upload 属性，我们需要为 upload 绑定 progress 事件才可以监听到上传的进度：

```js
const xhr =  new XMLHttpRequest();
xhr.open(...)
// *这才是监听上传的进度；
xhr.upload.onprogress = function() {...};
// *这是监听下载的进度
xhr.onprogress = function () {...};
```

fetch 原生上是不支持 onprogress 事件的；但是可以进行[模拟](https://segmentfault.com/a/1190000008484070)，使用 Response.body.getReader().read();

> 注意：不确定这样是否是正确的上传文件的进度，response 已经回来了，所以应该是读取响应的进度？
>
> 不是特别清楚，如果有监听上传进度的需求还是使用 XMLHttpRequest 好一些；

```js
fetch(...).then(response => {
  // https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStream/getReader
  const reader = response.body.getReader();

  // https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStreamDefaultReader
  // *read 返回一个 Promise，提供对下一个 chunk 的访问权限；可以简单的理解为， read 将会一块一块去读取；done 表示是否读取完成， value 表示读取的块；这样就可以模拟出 progress；
  reader.read().then(({ done, value }) => {...})
})
```

## 拖拽上传

其实很简单，首先介绍几个事件

1. dragEnter: 拖拽文件进入对应的元素时触发，可以用于为元素添加样式，比如拖拽文件进入时，处于激活样式
2. dragLeave: 拖拽文件离开对应元素时触发，可以用于移除激活状态
3. dragOver: 当拖拽文件在对应元素内部时将会一直触发 dragOver 事件，即使我们没有移动鼠标；
4. drop：丢下文件时触发；

其中某些元素被拖拽进入浏览器时，会触发浏览器的默认行为，比如说 pdf，图片文件在拖拽进入浏览器时，会使用浏览器查看这些文件；

而要阻止这样的默认行为，需要 over 和 drop 两个事件同时 e.preventDefault;

重点：如何获取到拖拽的文件

**拖拽事件的 e 是 [DragEvent](https://developer.mozilla.org/en-US/docs/Web/API/DragEvent) 事件内部有一个 dataTransfer，是 [DataTransfer](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer) 的实例，它有一个 files 属性，拖拽的文件就被放在这个属性中**

可以使用 e.dataTransfer.files 进行访问， files 属性是一个 FileList 的实例；input 上传文件时的 files 属性也是一个 FileList

> 注意：如果使用 `console.log(e) | console.log(e.dataTransfer)` 然后再去控制台中点击进入 files 进行查看，是看不到拖拽文件的；但是可以使用 `console.log(e.dataTransfer.files)` 查看；
>
> 推测是因为：files 只在拖拽时和丢下那一瞬间存在，丢下之后，将会重新赋值，所以查看不到；

---

实现拖拽期间的样式效果；

在拖拽文件到指定元素时，为元素添加一个样式；比如说，边框变成实线，且颜色变成 `c-amber`

其实很简单，就声明一个 `dragging` 在拖拽进入时，赋值为 `true` 离开或放下时赋值为 false 即可；但是有一个问题：那就是如果进入了子元素，那么就会首先触发子元素的 `dragenter` 事件，然后冒泡给父元素的 `dragenter` 事件，接着触发父元素的 `dragleave` 事件；所以就不能直接在 `dragleave` 事件中将 `dragging` 赋值为 `false`；因为会先触发子元素的 `dragenter` 所以我们可以搞一个 `dragenter dragleave` 的计数器，进入就 +1 离开就 -1，具体代码如下

解决后的具体代码如下:

```ts
const dragging = ref<boolean>(false);
// 计数器，drag 的层级
const enterCount = ref<number>(0);
function handleDragEnter() {
  enterCount.value += 1
  dragging.value = true
}

function handleDragLeave() {
  enterCount.value -= 1
  if (enterCount.value <= 0) dragging.value = false
}
```

## 多文件上传

多文件上传，主要有两种方法：

1. 多个文件分别使用一个请求，循环请求一个接口
2. 将多个文件放在一个 formData 中，只使用一个请求

具体使用哪种方法，应该视情况而定；

使用一个请求的好处：

1. 节约服务器性能
2. 当文件数量不多，文件大小也不大时，处理速度很快

使用多个请求的好处：

1. 可以添加更多请求参数，丰富请求；因为单个文件使用单个请求，所以请求时可以添加其他的与文件对应的请求
2. 当文件数量较多时，可以使用多个请求分批进行上传
3. 当文件大小较大时，可以将大文件进行切片，分批上传；避免请求时间太长，请求失败导致的问题；提高上传的可靠性

## 大文件上传

参考

1. [转转](https://juejin.cn/post/7110121072032219166)
2. [可以作为额外的知识点-使用 wasm 优化切片和计算 hash 值的速度](https://juejin.cn/post/7221003401996091429)

---

**大文件上传主要有三个重点：**

### 格式校验

可以使用魔数进行校验，魔数通常是一些常数，这些常数被用来表示一些特定的含义，比如文件的类型；对于某些类型文件的头部的字节序列是固定的，我们可以比较这几个字节，从而判断文件类型；但是需要注意，使用魔数判断类型不是完全正确的，比如：文件头部的字节被修改了；或者是两种不同的文件使用了相同的魔数；都会造成判断的类型有误；

### 文件切片

文件切片很好实现，直接使用 Blob 对象上的 slice 函数即可，因为 File 是 Blob 的子类，所以 File 对象也可以直接使用 slice, slice 与 Array 和 String 的 slice 一样，需要两个参数：`start & end`;

大概的流程是：

- 首先确定需要拆分的 size, 假如需要拆分为 1mb 大小的 Blob 那么 `size = 1 * 1024 * 1000;`
- 然后计算 `count = Math.ceil(fileSize / size)` 然后就可以进入循环分割 file: `array.push(file.slice(count * size, (count + 1) * size))`
- 最后即可获得分割的 Blob 列表；

> 注意：一个大文件的分片可能也会相当的耗费性能，所以可以使用 webWorker 在后台进行分片这是一个优化的策略；

在进行切片的同时也可以计算 hash 因为计算 hash 需要读取切片的二进制数据，读取二进制数据是一个异步的过程，并且将一个大文件拆分问小文件进行读取和计算，反而会优化性能。

```ts
async function bigFileSplit(file: File) {
  // *针对大文件就需要进行切片处理；
  // *主要有两种切法：一是固定切片数量，二是固定切片大小；
  // *切法也主要视情况而定：切片数量太大因为 js 是单线程会导致切片缓慢；切片体积太大会导致上传时间太长；  但是切片数量这个问题可以使用 webWorker 新开一个线程进行切片操作；于是在这里我选择固定切片体积；
  // *还可以再切片的同时去获取二进制数据，然后计算 hash 因为获取二进制数据这一部分是异步的，所以可以优化性能
  // 使用 webWorker 需要新建 js 文件，为了方便这里没有使用 webWorker
  const maxSize = 1 * 1024 * 1000
  const spark = new SparkMD5.ArrayBuffer();
  const chunks: Blob[] = [];
  const promiseList: Promise<any>[] = [];

  function split(count: number) {
    const chunk = file.slice(count * maxSize, ++count * maxSize);
    if (chunk.size > 0) {
      chunks.push(chunk);
      // !arrayBuffer 是异步操作，如果直接使用 await 的话，将会阻塞下一个 split
      // !于是我将这里的 Promise 全部放到一个数组中，然后在下面使用 Promise.all 等待所有的 append 完成，这样即将异步和同步分开了，即代表了 split 完成，可以直接 end 了；不再需要计算分片的数量 count 了

      // !注意，我这里是直接添加了 then, 那么在读取成功后，就会直接 append, 不用等到 all 的时候再循环 append；这里的 then 虽然没有返回值，并不会影响到 Promise.all 这一块就需要用到 Promise 的源码了；
      // !then 没有返回值，所以相当于是一个 Promise { undefined }; 并且 Promise.all 即使传入的不是 Promise 它内部也会尽量转换为 Promise, 比如 Promise.all([1]) 就会转换为 Promise { 1 }
      promiseList.push(chunk.arrayBuffer().then((arrayBuffer) => spark.append(arrayBuffer)))
      split(count);
    }
  }

  split(0);

  const hash = await Promise.all(promiseList).then(() => spark.end());

  return {
    hash,
    chunks,
  };
}
```

### 断点续传 + 秒传 (都需要后端配合)

所谓的秒传，其实就是在上传前，请求一下后端，查看这个文件是否上传过，如果上传过，则直接返回上传成功；

断点续传则是上传过文件，但是有一部分切片上传失败了，那么只需要上传还未上传的切片即可，于是后端返回上传成功的切片 name，前端拿到后，计算得到未上传的切片进行上传；这就是断点续传

上传时，可以使用多线程进行上传；但是在一定要控制并发量；
  
TODO 需要探索后端如何拼接切片文件

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
<script setup lang="ts">
// https://github.com/vuejs/language-tools/issues/1232
// *如果在 setup 中这样写是会报错的；可以使用两种方法解决
type BaseInput = Omit<HTMLInputElement, 'type | hidden'>

const props = defineProps<BaseInput>()
</script>

<script lang="ts">
// 第一种方法, 使用一个 <script lang='ts'> 标签专门定义类型
type BaseInput = Omit<HTMLInputElement, 'type | hidden'>
</script>

<script setup lang="ts">
const props = defineProps<BaseInput>()
</script>

<!-- 第二种方法就是，在 tsconfig.json 中关闭 "declaration": true  -->
```

### vue 如何转发将子组件上的 ref 转发到真实 dom 上？

vue 的 props 不能声明 ref，ref 作为保留字

```vue
<!-- 第一种方法，不进行转发暴露出去 -->
<script setup lang="ts">
import { ref } from 'vue'

const inputRef = ref<HTMLInputElement | null>(null)

// 暴露出去的属性，父组件可以通过子组件的实例访问
defineExpose({
  inputRef
})
</script>

<template>
  <input ref="inputRef" />
</template>

<!-- 第二种方法 使用 ref 函数, 注意，不能直接修改 props 里面的属性，所以不能直接 props.inputRef.value = el; -->
<script lang="ts">
interface Props {
  getInput: (el: HTMLInputElement) => void
}
</script>
<script setup lang="ts">
const props = defineProps<Props>()
function handleRef(el: Element | ComponentPublicInstance | null) {
  if (el) {
    props.getInput(el as HTMLInputElement)
  }
}
</script>

<template>
  <input :ref="handleRef" />
</template>
```

### vue 的 props 如何使用 ...rest

props 是不能解构的，所以也就不能直接使用 ...rest 可以用下面这样的方法曲线救国

```vue
<template>
  <!-- 就相当于 react 中的 {...rest} -->
  <input type="file" v-bind="inputProps" />
</template>

<script lang="ts">
type BaseInput = Omit<HTMLInputElement, 'hidden | file'>
</script>
<script setup lang="ts">
const props = defineProps<{
  inputRef: Ref<UnwrapRef<HTMLInputElement | null>>
  inputProps: BaseInput
}>()
</script>
```

### vue3 如何注册事件

注册事件使用 defineEmit 方法，下面说一下 defineEmit 方法如何使用

```vue
<script setup lang="ts">
// 这样就是声明了一个 event-name 的事件，那么父组件就可以使用 @event-name 传入事件处理函数；
const emit = defineEmit<{ (e: 'event-name', el: Element, e: Event) }>()

// 这样就可以触发事件
emit('event-name', el, e)
</script>
```
