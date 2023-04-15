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
