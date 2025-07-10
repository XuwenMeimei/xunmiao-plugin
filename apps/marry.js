import plugin from '../../../lib/plugins/plugin.js';

const _path = process.cwd().replace(/\\/g, '/');
const marryDataPath = `${_path}/plugins/xunmiao-plugin/data/marry_data.yaml`;

function getMarryData() {
    if (!fs.existsSync(marryDataPath)) fs.writeFileSync(marryDataPath, yaml.stringify({}));
    return yaml.parse(fs.readFileSync(marryDataPath, 'utf8')) || {};
}


export class marry extends plugin {
  constructor() {
    super({
      name: '结婚',
      dsc: '结婚娱乐模块',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#结婚$',
          fnc: 'marry'
        }
      ]
    });
  }

  async marry(e) {
    if (e.isGroup) {
        const marryData = getMarryData();
        const userId = e.user_id;
        const atUserId = e.at;

        if (!atUserId) {
            return e.reply('请@你想要结婚的人哦~', false, { at: true });
        }

        if (userId === atUserId) {
            return e.reply('你不能和自己结婚哦~', false, { at: true });
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply('啊嘞?这...这样不行啦~(害羞)', false, { at: true });
        }

        if (marryData[userId] && marryData[userId].married) {
            return e.reply('你已经结婚了哦~', false, { at: true });
        }

        if (marryData[atUserId] && marryData[atUserId].married) {
            return e.reply('对方已经结婚了哦~', false, { at: true });
        }

        return e.reply('咕咕咕', false, { at: true })
    }
    else {
        return e.reply('这个功能只能在群聊中使用哦~', false, { at: false });
    }
  }
}