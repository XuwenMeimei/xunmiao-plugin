import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'


const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')

const templatePath = path.join(dataDir, 'user_data.template.yaml')
const userDataPath = path.join(dataDir, 'user_data.yaml')

// 新增背包数据文件和模板
const invTemplatePath = path.join(dataDir, 'inv_data.template.yaml')
const invDataPath = path.join(dataDir, 'inv_data.yaml')

// 初始化 user_data.yaml
if (!fs.existsSync(userDataPath)) {
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, userDataPath)
    console.log('从模板复制了 user_data.yaml')
  } else {
    console.warn('未找到模板文件：', templatePath)
  }
}

// 初始化 inv_data.yaml
if (!fs.existsSync(invDataPath)) {
  if (fs.existsSync(invTemplatePath)) {
    fs.copyFileSync(invTemplatePath, invDataPath)
    console.log('从模板复制了 inv_data.yaml')
  } else {
    // 没有模板则创建空文件
    fs.writeFileSync(invDataPath, '')
    console.log('创建了空的 inv_data.yaml')
  }
}

logger.info('---------^_^---------')
logger.info('主人！寻喵酱打卡上班啦！')
logger.info('---------------------')


const files = fs.readdirSync('./plugins/xunmiao-plugin/apps').filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
    ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status != 'fulfilled') {
    logger.error(`载入插件时错误`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}
export { apps }