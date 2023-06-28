export function bitToMb(bit: number): number {
  return bit / 1024 / 1000
}

export function createFileList(files: File[]) {
  const dataTransfer = new DataTransfer()

  files.forEach((file) => {
    dataTransfer.items.add(file)
  })

  return dataTransfer.files
}

interface Limit {
  equal?: number
  greater?: number
  less?: number
}

interface ValidFilesParam {
  size?: Limit
}

export function validFile(file: File, valid: ValidFilesParam): boolean {
  const v = Object.entries(valid)
  let flag = true
  v.forEach(([key, value]) => {
    switch (key) {
      case 'size': {
        const { size } = file
        const mb = bitToMb(size)
        if (typeof value.equal === 'number' && flag) flag = value.equal === mb
        if (typeof value.greater === 'number' && flag) flag = mb > value.greater
        if (typeof value.less === 'number' && flag) flag = mb < value.less
        break
      }
      default:
    }
  })

  return flag
}

// !效果与 Promise.all 类似，如果全部都是 Fullfilled 的话，那么返回对应的 response 数组；
// !如果有一个是 Rejected 的话，将会按照顺序，等待对应的 Promise reject 后变成 Rejected 的状态。
export function asyncPool<T, D, Fn extends (arg: T) => Promise<D>>(poolLimit: number, array: T[], iteratorFn: Fn): Promise<D[]> {
  if (poolLimit === 0) throw new Error('poolLimit must be greater than 0');
  const clonedArray = [...array];
  const allAsync: Promise<D>[] = [];
  const executing = new Set();

  // 通过递归的方式遍历
  function enqueue(): Promise<void> {
    const item = clonedArray.shift();
    if (item) {
      const promise = iteratorFn(item);
      allAsync.push(promise);
      if (executing.size < poolLimit) {
        const p = promise.then(() => { executing.delete(p) });
        executing.add(p);
        // *executing.size < 限制时，继续递归
        return enqueue();
      } else {
        // *executing.size >= 限制时，需要等待最快的完成才能继续；
        // !此时如果有一个 Rejected 那就不会继续执行 enqueue，将会被抛出去；不必在这里进行处理
        return Promise.race(executing).then(() => enqueue());
      }
    }
    // !此时并不是所有的 Promise 都执行完成了，所以在函数结尾添加了一个 Promise.all(allAsync) 
    // !对已经执行完成的 Promise 不受影响，将会等待未结束的 Promise 完成，并且将会返回对应的 **response 数组**；
    // item 不存在时，说明已经遍历完成了，直接返回 Promise.resolve();
    return Promise.resolve();
  }

  return enqueue().then(() => Promise.all(allAsync))
}
