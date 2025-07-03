import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 支持锅巴
export function supportGuoba () {
  return {
    pluginInfo: {
      name: 'xunmiao-plugin',
      title: 'Xunmiao-Plugin',
      description: '寻喵酱的娱乐插件，提供了许多有趣的功能。',
      author: [
        '@NekoXuwen'
      ],
      authorLink: [
        'https://github.com/XuwenMeimei'
      ],
      link: 'https://github.com/XuwenMeimei/xunmiao-plugin',
      isV3: true,
      isV2: false,
      showInMenu: 'auto',
      icon: 'mdi:stove',
      iconColor: '#d19f56',
      iconPath: path.join(__dirname, 'res/icon.png')    
    }
  }
}
