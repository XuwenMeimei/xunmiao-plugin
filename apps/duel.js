import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs';
import yaml from 'yaml';

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;

export class duel extends plugin {
  constructor() {
    super({
      name: '寻喵决斗',
      dsc: '寻喵决斗功能',
      event: 'message',
      priority: 5000,
      rule: [
        {
            reg: '^#决斗(.*)$',
            fnc: 'duel'
        }
      ]
    })
  }

  async duel(e) {
    if (e.isGroup) {
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        let userData = yaml.parse(fileContent) || {};

        const user_id2 = e.at;

        if (!userData[e.user_id]) {
            userData[e.user_id] = {
              coins: 0
            };
        }
        if (!userData[user_id2]) {
            userData[user_id2] = {
              coins: 0
            };
        }

        const {coins: coins_id1} = userData[e.user_id];
        const {coins: coins_id2} = userData[user_id2];

        console.log(e.user_id);
        console.log(user_id2);

        let botqq = '2582312528';

        if (user_id2 == botqq) {
            return e.reply('你不能和我决斗哦~', false, { at:true });
        }

        if (e.user_id == user_id2) {
            return e.reply('你不能与自己进行决斗哦~', false, { at:true });
        }

        if (coins_id1 <= 29) {
            return e.reply('你的喵喵币不够哦，无法与他人决斗~', false, { at:true });
        }
        if (coins_id2 <= 29) {
            return e.reply('他的喵喵币不够哦，无法与他决斗~', false, { at:true });
        }

        let i = Math.floor(Math.random() * 100);
        let Duelcoins = Math.floor(Math.random() * 30);

        if (i <= 50) {
            e.reply(`你输了! 你损失了${Duelcoins}个喵喵币
他获得了${Duelcoins}个喵喵币`, false, { at:true });

            userData[user_id2].coins += Duelcoins;
            userData[e.user_id].coins -= Duelcoins;
        } else {
            e.reply(`你赢了! 你获得了${Duelcoins}个喵喵币
他损失了${Duelcoins}个喵喵币`, false, { at:true });

            userData[user_id2].coins -= Duelcoins;
            userData[e.user_id].coins += Duelcoins;
        }

        fs.writeFileSync(dataPath, yaml.stringify(userData));
    }
  }
}
