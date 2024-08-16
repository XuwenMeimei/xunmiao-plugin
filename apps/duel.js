import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs';
import yaml from 'yaml';

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;

const cooldowns = {};

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
        const now = Date.now();
        const cooldownTime = 60 * 1000;

        if (cooldowns[e.user_id]) {
            const timePassed = now - cooldowns[e.user_id];
            const timeLeft = cooldownTime - timePassed;
            if (timeLeft > 0) {
                const secondsLeft = Math.ceil(timeLeft / 1000);
                return e.reply(`你需要等待${secondsLeft}秒后才能再次发起决斗哦~`, false, { at: true });
            }
        }

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

        const { coins: coins_id1 } = userData[e.user_id];
        const { coins: coins_id2 } = userData[user_id2];

        let message = e.message;

      const regex = /#决斗\s*(\d+)$/;
      const match = e.msg.match(regex);

        console.log(message);
        console.log(e.user_id);
        console.log(user_id2);

        if (message.some(item => item.qq === 'all')) {
          return e.reply('6', false, { at: true });
        }

        if (message.filter(item => item.type === 'at').length > 1) {
          return e.reply('不能同时与多个人决斗哦~', false, { at: true });
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply('你不能与我进行决斗哦~', false, { at: true });
        }

        if(!user_id2){
          return e.reply('请@你想要决斗的人哦~', false, { at: true });
        }

        if (e.user_id == user_id2) {
            return e.reply('你不能与自己进行决斗哦~', false, { at: true });
        }

        if (coins_id1 <= 0) {
            return e.reply('你的喵喵币不够哦，无法与他人决斗~', false, { at: true });
        }
        if (coins_id2 <= 0) {
            return e.reply('他的喵喵币不够哦，无法与他决斗~', false, { at: true });
        }

        let i = Math.floor(Math.random() * 2);

        let Duelcoins = 0;

        if (match) {
        Duelcoins = parseInt(match[1], 10);

        if (Duelcoins > coins_id1) {
          return e.reply('你没有那么多喵喵币哦~', false, { at: true });
        }
        if (Duelcoins > coins_id2) {
          return e.reply('他没有那么多喵喵币哦~', false, { at: true });
        }

        }else{
        Duelcoins = Math.floor(Math.random() * 30);
        }

        if (i) {
          Duelcoins = Math.min(Duelcoins, coins_id1);
          e.reply(`你输了! 你损失了${Duelcoins}个喵喵币
他获得了${Duelcoins}个喵喵币`, false, { at: true });

          userData[user_id2].coins += Duelcoins;
          userData[e.user_id].coins -= Duelcoins;

          if (userData[e.user_id].coins <= 0) {
              userData[e.user_id].coins = 0;
              e.reply([segment.at(e.user_id), ' 破产了！']);
          }
      } else {
          Duelcoins = Math.min(Duelcoins, coins_id2);
          e.reply(`你赢了! 你获得了${Duelcoins}个喵喵币
他损失了${Duelcoins}个喵喵币`, false, { at: true });

          userData[user_id2].coins -= Duelcoins;
          userData[e.user_id].coins += Duelcoins;

          if (userData[user_id2].coins <= 0) {
              userData[user_id2].coins = 0;
              e.reply([segment.at(user_id2), ' 破产了！']);
          }
      }

      fs.writeFileSync(dataPath, yaml.stringify(userData));

      cooldowns[e.user_id] = now;
  }
}
}