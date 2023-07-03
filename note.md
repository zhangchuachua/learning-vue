# note

## volar 类型提示不正确

在项目中使用了 unplugin-auto-import, unplugin-vue-components 发现虽然生成了对应的 d.ts 但是在使用的时候类型提示全部都是 any

在 [volar](https://github.com/vuejs/language-tools/issues/2231) 发现了类似的 issue，发现可能是因为 pnpm 安装，导致 '@vue/runtime-core' 并没有在 node_modules 所以提示会有问题；

解决方法就是：使用 `declare module 'vue'` 替代 `declare module '@vue/runtime-core'`

按理来说使用 yarn 也可以解决问题

安装 '@vue/runtime-core' 作为依赖也可以解决问题

新的进展：在 unplugin-vue-component 的 github 上发现了[解决方案](https://juejin.cn/post/7189812753366777915), 具体到原理可以看 [pnpm](https://pnpm.io/zh/npmrc#public-hoist-pattern)

更新的进展：参照 [vitePress 官方配置](https://github.com/vuejs/vitepress/blob/main/.npmrc)修改；提升所有的依赖

## 虚拟列表

### 固定高度的

比如说：一共有 1000 条数据（每条数据高度 50px），但是展示出来的只有 8 条数据（高度也就是 400px）；然后留了上下 5 条的缓冲区；

外层盒子也就是 400px；而存放数据的盒子应该是 50 * 1000；

```vue
<template>
  <div id="outer" class="overflow-auto" style="height: 400px">
    <div id="inner" :style="`height: ${data.length * 50}px`">{{...}}</div>
    </div>
</template>
```

![virtualized-list.png](virtualized-list.png)

我们第一次渲染，至少要渲染出 8(展示 8 条) + 5(上面的缓冲 5 条) + 5(下面的缓冲 5 条) = 18 条数据；

然后在 outer 开始滚动的时候，需要去监听 outer 的滚动事件，获取它的滚动高度： `e.target.scrollTop`

我们使用 `Math.floor(scrollTop / 数据的高度)` 可以获取当前在视口顶部的数据的 topIndex；比如滚动 240 时：`Math.floor(240 / 50) = 4` 那么说明已经滚动出去的有 4([0, 1, 2, 3] 因为索引从 0 开始) 条数据了；目前顶部的展示的是第 5 条数据；

然后就要去计算上缓冲区了，把当前顶部展示的 index - 5 自然就是缓冲区顶部的 index; 这个 index 也就是 start，截取数据的 start index；但是这里有一个问题：当滚动的高度不够时， startIndex 为负数，所以我们需要处理一下： `const top = Math.floor(scrollTop / baseHeight); const start = top >= buffer ? top - buffer : 0`; 

获取到 topIndex 后，就可以计算当前视口底部数据的 index 那么就是 topIndex + 7 了；为什么是 + 7 呢，因为展示的 8 条数据中已经包括了 topIndex 了，所以 + 7 就是 bottomIndex；

然后就是计算底部的缓冲区了，也很简单就是 bottomIndex + 5 即可；这就获取到了 endIndex;

于是当滚动的时候，我们就可以动态的改变 startIndex, endIndex, 然后动态的截取数据了： `const list = data.slice(startIndex, endIndex)`;

> 注意：因为动态截取数据，会导致顶部的数据消失一个，底部的数据添加一个；这样是会影响滚动的，比如说，我们滚动了 58px 然后顶部的数据消失了，就会导致滚动的距离变成 8；可以去试一下；所以在目前的代码中，很可能会出现无限触发 handleScroll 的问题；
> 
> 比如滚动了 255px 经过计算，start 应该为 1，那么顶部的数据消失，导致滚动的高度变成 205px 又触发 handleScroll 计算出 start 等于 0，顶部的数据又添加，导致滚动的高度又变成了 255px 又回触发 handleScroll 导致一直触发；
> 
> 这个问题在下一步就可以解决

---

截取数据完成，但是数据都是从上往下渲染的，一共只有 18 条数据，那么滚动的时候，会发现数据一下就被滚到上面去了；那么我们就需要把 **「数据固定到视口中」**

要固定的话，核心方法就是一个：**把内容区域一起进行平移**，平移我看 ahooks 用的是 margin-top 但是 transform 会不会更好？比较是用的 gpu，但是无论哪个，因为涉及到 dom 元素的修改，所以一定会引起 dom 树变化，导致回流重绘；

那么平移多少呢？依然应该以 startIndex 作为基准；

假设已经滚动了 500px 那么 topIndex = 10, startIndex = 5 如果以 topIndex 为基准平移，那么就是 500px 很明显并没有为缓冲区留位置；而 startIndex * 50 = 250 刚好是缓冲区的位置；

比较简单的方法，就是再使用一个盒子包裹渲染的数据；然后直接平移这个盒子就行，如下的 list div

```vue
<template>
  <div id="outer" class="overflow-auto" style="height: 400px">
    <div id="inner" :style="`height: ${data.length * 50}px`">
      <div id="list" :style="`transform: translate(0, ${startIndex * baseHeight}px)`">{{...}}</div>
    </div>
  </div>
</template>
```

假如说不允许使用盒子包裹渲染的数据，那么就只能平移 inner 盒子了；但是平移 inner 盒子其实会导致实际的滚动距离变大；比如说现在有 20 条数据也就是 1000 的高度，然后现在视口高度为 400 所以可以滚动的高度应该是 600px;

但是如果我们为 inner 添加了 translateY(300px) 那么现在可以滚动的高度也就是 900px 了；

所以「可以滚动的高度」就变成了 `(inner 高度 - 视口高度) + 平移高度`；然后如同上面的代码那样，translate 是逐渐增大的，就会导致可以滚动的高度也变大；那么就可能导致 **「出现无限滚动的情况，即使数据已经滚动完了但是依然可以向下」**

> 不管是平移 list 盒子还是平移 inner 盒子，当顶部数据消失，导致 scrollTop 变小的时候，这个平移的量正好与之抵消，也就解决了 handleScroll 无限触发的问题；

所以这个时候，我们就需要控制可以滚动的高度，适口高度无法修改，就需要修改「inner 高度」，代码如下：

```vue
<template>
  <div id="outer" class="overflow-auto" style="height: 400px">
    <div id="inner" :style="`height: ${(data.length - startIndex) * 50}px; transform: translate(0, ${startIndex * baseHeight}px)`">
      {{...}}
    </div>
  </div>
</template>
```

### 不固定高度的

参考：https://juejin.cn/post/6844903982742110216

不固定高度的难点就在于：

1. inner 盒子的高度应该如何指定
2. 滚动的时候，应该如何计算 start
3. start 计算出后，为了避免「无限触发 handleScroll 和 无限滚动」的问题，那么平移量必须消失的数据的高度一致，并且 inner 高度的缩小也必须一致；

根据参考：解决动态高度的方法一般有三种：

1. 对属性进行拓展，针对不同的 item 指定不同的高度；相当于依然是静态指定高度, 对于换行不适用； ahooks 的虚拟列表好像是这样的做法
2. 把 item 渲染到屏幕外，测量高度并缓存；不推荐，相当于渲染两次了；
3. 使用`预估高度(estimatedItemHeight)`先行渲染，然后获取真实高度并缓存；推荐这个做法，element-plus 是这样做的

---

使用预估高度的办法，需要一个对象存储所有的 item 的实际高度；比如 `position = { index: number, height: number }` height 的初始值就可以设置为 estimatedItemHeight 的值；

所以 inner 盒子的高度就是所有的 position.height 只和；然后在渲染完成后需要动态的为 position 更新为真实的 height，同时更新 inner 盒子的高度；

所以还需要一个对应的函数，在 mounted 和 updated 生命周期时进行更新；**第一个难点就解决了；**

```ts
const positions = props.data.map((item, index) => {
  height.value += baseHeight;// *初始化 inner 的高度
  return { index, height: baseHeight }// *记录 item 的高度
});

function updatePositions() {
  // rows 就是渲染出来的 row 列表
  rows.value.forEach((el: HTMLDivElement, idx) => {
    const index = el.dataset.index as string;
    const i = parseInt(index);
    const position = positions[i];
    const { height: prevHeight } = position;
    const { height: realHeight } = el.getBoundingClientRect();
    // *如果前后两次的 height 不一样的话，那么就要更新 position 的 height 和 inner 的高度；
    if (prevHeight !== realHeight) {
      position.height = realHeight;
      const diff = realHeight - prevHeight;
      height.value += diff;
    }
  })
}
```

滚动时如何计算 start 呢？其实与固定高度的差不多，也是用 scrollTop 去找；但是不再直接进行计算了，而是使用 position 对象

position 对象中存储了元素真实的高度，那么遍历 position 对象，就可以计算出当前的 index；比如说：[40, 80, 120, 40] 现在已经滚动了 200px 了，那么 40 + 80 + 120 = 240 > 200 说明现在顶部依然时第三个元素；所以 start 就应该是 2(不考虑 buffer 时)；

但是滚动事件触发的太频繁了，这个时候遍历计算，对性能影响较大；所以我们可以在获取「position 真实高度」时直接进行计算；比如说 第一个元素高度为 40，那么下一个元素的就会从 40 开始；第二个元素的高度为 80，那么下一个元素就会从 40 + 80 开始； 

position 就变为了 `[{ height: 40, top: 0 }, { height: 80, top: 40 }, { height: 120, top: 120 }, { height: 40, top: 240 }]` 这样，就不再需要进行计算了，而是去找第一个 top 小于等于(<=) scrollTop 的索引，也就是 `{height: 120, top: 120}` 找的这个过程，可以使用二分搜索完成； **第二个难点也就完成了**

那么第三个难点其实也很简单了，直接使用 start 的 position 的 top 即可;

代码如下：

```vue

<script setup lang="ts">
import {withDefaults, onMounted, onUpdated, ref, computed} from 'vue';

const props = withDefaults(defineProps<{
  data: any[],
  width: 150,
  rowHeight?: number,
  estimatedItemHeight?: number,
  buffer?: number,
}>(), {
  rowHeight: 50,
  buffer: 3
})
const isDynamic = typeof props.estimatedItemHeight === 'number';
const baseHeight = isDynamic ? props.estimatedItemHeight : props.rowHeight;
const rows = ref();// 
const height = ref(0);
const start = ref(0);
const end = computed(() => start.value + 8 + props.buffer * 2);
const translate = computed(() => positions[start.value].top);
const positions = props.data.map((item, index) => {
  height.value += baseHeight;
  return {index, height: baseHeight,}
});

function handleScroll(e: Event) {
  const target = e.target as HTMLDivElement;
  const {scrollTop} = target;
  const index = binarySearch(scrollTop);
  start.value = index >= props.buffer ? index - props.buffer : 0;
}

// *二分搜索，可以搜索目标值，也可以找到第一个大于，第一个小于的值；
function binarySearch(scrollTop = 0) {
  let l = 0;
  let r = positions.length - 1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    const {top} = positions[mid];
    if (top === scrollTop) return mid;
    if (top > scrollTop) r = mid - 1;
    else {
      l = mid + 1;
    }
  }
  return r;// 二分搜索，我们这里查找第一个小雨 scrollTop 的值
}

function updatePositions() {
  if (!isDynamic) return;
  rows.value.forEach((el: HTMLDivElement) => {
    const index = el.dataset.index as string;
    const i = parseInt(index);
    const position = positions[i];
    const {height: prevHeight} = position;
    const {height: realHeight} = el.getBoundingClientRect();
    // *如果前后两次的 height 不一样的话，那么就要更新 position 的 height 和 inner 的高度；
    if (prevHeight !== realHeight) {
      position.height = realHeight;// 纠正 row height
      const diff = realHeight - prevHeight;
      height.value += diff;// 纠正 inner height

      for (let idx = i + 1; idx < positions.length; idx++) {
        const prevP = positions[idx - 1];
        const cntP = positions[idx];
        cntP.top = prevP.top + prevP.height;// 后续的 top 都会受到影响
      }
    }
  })
}

// 挂载时触发
onMounted(updatePositions)
// DOM 更新时触发
onUpdated(updatePositions)
</script>
<template>
  <div class="overflow-auto w-full h-400px">
    <div class="" :style="`height: ${height}`" id="inner">
      <div :style="`transform: translate(0, ${translate}px)`" id="list">
        <div v-for="(row, index) in props.data.slice(start, end)" :data-index="index + start" ref="rows"></div>
      </div>
    </div>
  </div>
</template>
```

### 使用 intersectionObserve 进行优化

虚拟列表的原理是什么？

在没有缓冲区的情况下，就是顶部的数据被滚动出去了，就让它消失，填充一个 translate；然后底部添加一条新的数据即可；

而 intersectionObserve 就可以监听数据是否在视口中，当顶部不再视口中时，我们可以进行操作

但是 intersectionObserve 有问题，就是它是异步的，是宏任务, 这个观察器的优先级特别低，只有其他任务执行完成后，才会执行观察器；所以可能会出现回调没有执行的问题；所以在使用的时候需要注意是否可以接受这个问题；

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

  async function split(count: number):Promise<string> {
    const chunk = file.slice(count * maxSize, ++count * maxSize);
    if (chunk.size > 0) {
      // *最开始的想法
      // *因为 chunk.arrayBuffer 函数是一个异步函数，如果使用 await 将会阻塞下一次 split，所以开始想的是，不使用 await，而是直接使用一个 then 当 arrayBuffer 读取完成时，进行 append: chunk.arrayBuffer().then(buffer => spark.append(buffer))
      // *因为都是异步的，所以在还需要一个 await 保证所有的 chunk 都进行读取了，所以使用了 promiseList 存储读取的 promise; promise.push(chunk.arrayBuffer().then(buffer => spark.append(buffer))) 最后使用一个 Promise.all(promiseList).then(() => spark.end()) 就可以获取 hash 了；
      // *这样的好处是 chunk.arrayBuffer 不会阻塞下一次 split，相当于 split(0) 这个递归函数完成后，就已经开始读取所有的 chunk.arrayBuffer 了，并且在递归函数结束前，可能有部分 arrayBuffer 已经读取完成了；
      // *但是这样有一个问题：那就是所有的 chunk.arrayBuffer 同时读取，那么是无法保证顺序的；一旦顺序出错，就会导致 hash 错误；
      // !而且经过实测，性能并没有提升多少，对于一个 140mb 的文件，只是提升了几十 ms 所以放弃了哪个方法，直接使用了 await 的方式;
      chunks.push(chunk);
      spark.append(await chunk.arrayBuffer());
      return split(count);
    }
    return spark.end();
  }

  const hash = await split(0);

  split(0);

  // const hash = await Promise.all(promiseList).then(() => spark.end());

  return {
    hash,
    chunks,
  };
}
```

### 断点续传 + 秒传 (都需要后端配合)

所谓的秒传，其实就是在上传前，请求一下后端，查看这个文件是否上传过，如果上传过，则直接返回上传成功；

断点续传则是上传过文件，但是有一部分切片上传失败了，那么只需要上传还未上传的切片即可，于是后端返回上传成功的切片 name，前端拿到后，计算得到未上传的切片进行上传；这就是断点续传

TODO 还可以使用 http range 头实现断点续传

上传时，可以使用多线程进行上传；但是在一定要控制并发量；

### 后端实现

**后端主要参考：**

1. 文章：https://mp.weixin.qq.com/s/-iSpCMaLruerHv7717P0Wg
2. 代码：https://gist.github.com/semlinker/b211c0b148ac9be0ac286b387757e692

后端大概的实现思路为：

大文件切片上传将分为三个路由：

1. `/big-file/exist` 用于确定将要上传的文件是否已经存在与服务器端；
2. `/big-file/chunk` 用于接收上传的切片，因为服务器端并不能确定切片的数量，所以不能直接定义 multer 的文件数量，所以使用一个路由单独、重复接收切片；并且如果我们要并发上传，肯定也需要一个路由单独接收切片；
   - 注意：如果使用 koa 的话，那么使用的解析二进制文件的库是 @koa/multer，而不是 multer，我因为引错库导致报错浪费了不少时间
   - 注意：上传二进制文件肯定使用的都是 formData，并且还可以向 formData 中追加其他数据，如果在解析二进制文件时需要使用到这些数据（比如文件名，hash等），那么需要注意 formData 中数据的顺序；因为解析到文件时，在文件后面的 append 的数据是还没被解析的，也就无法使用；
   - 注意：bodyParser 根本无法解析 formData 所以在解析文件时，其实是 @koa/multer 在解析，此时解析到哪个就是哪个
3. `/big-file/merge` 上传完成时用于合并这些切片；因为是并发上传，所以服务器端并不知道何时上传完成，需要前端控制合并时机；
   - 合并文件的思路：首先肯定是定义两个变量：切片文件的路径，合成后文件的路径；然后需要使用 createWriteStream 创建一个写入流，接着就需要遍历切片文件，然后读取切片文件（可以使用读取流，也可以使用 fs.readFileSync）；读取完成后，需要将 buffer 添加到写入流中；遍历完成后，关闭写入流就可以了；还是比较简单的；

合并文件的代码：

```js
async function concatFile(sourcePath, destPath) {
  if (!fs.existsSync(sourcePath)) throw new Error(`sourcePath isn\`t a directory sourcePath: ${sourcePath}`);
  if (!fs.statSync(sourcePath).isDirectory()) throw new Error(`sourcePath isn\`t a directory sourcePath: ${sourcePath}`);

  const sorted = fs.readdirSync(sourcePath).filter((index) => { return !isNaN(index) }).sort((a, b) => a - b);

  const ws = createWriteStream(destPath);
  for (const index of sorted) {
    const chunkPath = join(sourcePath, index);
    const chunk = fs.readFileSync(chunkPath);
    await ws.write(chunk);
    fs.unlink(chunkPath, (err) => {
      if (err) throw err;
    });
  }

  ws.end().close();
}
```

其实这些操作一个路由应该也可以完成，但是分成三个耦合性更低，更不容易出错；

前端在切片和计算 hash 完成后，就请求 `/big-file/exist` 查看服务器端是否存在该文件，如果存在该文件则返回上传成功；

如果不存在该文件，服务器端将会返回已存在的切片，前端需要计算出还需要上传的切片并且上传至 `/big-file/chunk`

上传成功后，前端请求 `/big-file/merge` 要求合并切片，服务器端合并完成后，响应成功，上传成功；

#### 后端如何处理上传重复文件

据我现在已知的，要对上传的文件去重，一般可以比较：

1. 文件名
2. 文件大小
3. hash 值

其中比较 hash 值应该算是比较可靠的

所以可以在接收文件上传时，维护一个 hash 值与 filename 的映射表；hash 值将在前端或者后端进行计算；

这个映射表可以放在内存中，如果放在内存中，读取将会很快，但是如果映射表内容太多，可能会导致内存溢出，并且如果服务重启后映射表也就没有了；也可以放在数据库里面，缺点就是读取较慢；

上传文件时，将会检查是否有已存在的 hash 值，如果有的话，就表示已经有相同的文件了；

具体的做法需要视具体的需求而定，比如说，如果文件名不一样依然接受上传等；

#### nodejs 如何判断是文件还是文件夹

可以获取对应路径的 stat, 但是获取对应路径的 stat 就有三种方法，和他们对应的同步方法：

1. `fs.stat() ｜ fs.statSync()`
2. `fs.lstat() | fs.lstatSync()`
3. `fs.fstat() | fs.fstatSync()`

statSync 同步获取文件或文件夹的状态,类似的还有 lstatSnc, fstatSync

他们的区别请参考：

- [stack-overflow](https://stackoverflow.com/questions/32478698/what-is-the-different-between-stat-fstat-and-lstat-functions-in-node-js)
- [segmentfault](https://segmentfault.com/a/1190000000370264)

获取到 stat 后，就可以使用 `stat.isFile()` | `stat.isDirectory()` 判断到底是文件还是文件夹

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
