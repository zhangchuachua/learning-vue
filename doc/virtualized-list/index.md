## note

### 虚拟列表

#### 固定高度的

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

#### 不固定高度的

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