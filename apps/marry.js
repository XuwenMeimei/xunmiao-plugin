import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import yaml from 'yaml';

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
    }
    const marryData = getMarryData();
    const userId = e.user_id;
    const atUserId = e.at;
    let message = e.message;

    console.log(e.msg);
    console.log(message);
    console.log(userId);
    console.log(atUserId);

        if (message.some(item => item.qq === 'all')) {
          return e.reply([segment.at(userId), '不可以这样！']);
        }

        if (message.filter(item => item.type === 'at').length > 1) {
          return e.reply([segment.at(userId), '不能同时和两个人结婚哦~']);
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), '啊嘞?这...这样不行啦~(害羞)']);
        }

        if (!atUserId) {
            return e.reply([segment.at(userId), '请@你想要结婚的人哦~']);
        }

        if (userId == atUserId) {
            return e.reply([segment.at(userId), '你不能和自己结婚哦~']);
        }

        if (marryData[userId] && marryData[userId].married) {
            return e.reply([segment.at(userId), '你已经结婚了哦~']);
        }

        if (marryData[atUserId] && marryData[atUserId].married) {
            return e.reply([segment.at(userId), '对方已经结婚了哦~']);
        }

        if (!marryData[userID].married) {
            
        }
    }
  }