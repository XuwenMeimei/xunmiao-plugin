import path from 'path'
import lodash from 'lodash'
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
    },
    configInfo: {
      schemas: [
      ],
      getConfigData () {
        let config = lodash.omit(cfg.merged, 'jwt')
        return config
      },
      setConfigData (data, { Result }) {
        let config = {}
        for (let [keyPath, value] of Object.entries(data)) {
          lodash.set(config, keyPath, value)
        }
        config = lodash.merge({}, cfg.merged, config)
        cfg.config.reader.setData(config)
        return Result.ok({}, '保存成功~')
      }
    }
  }
}
