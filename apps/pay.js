import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs';
import yaml from 'yaml';

const _path = process.cwd().replace(/\\/g, "/");
const dataPath = `${_path}/plugins/xunmiao-plugin/data/user_data.yaml`;

const cooldowns = {};

export class duel extends plugin {
    constructor() {
      super({
        name: '寻喵转账',
        dsc: '寻喵转账功能',
        event: 'message',
        priority: 5000,
        rule: [
          {
            reg: '^#转账(.*)$',
            fnc: 'pay'
          }
        ]
      })
    }
    async pay (e) {
    if (e.isGroup) {
        const now = Date.now();
        const cooldownTime = 600 * 1000;

        if (cooldowns[e.user_id]) {
            const timePassed = now - cooldowns[e.user_id];
            const timeLeft = cooldownTime - timePassed;
            if (timeLeft > 0) {
                const secondsLeft = Math.ceil(timeLeft / 1000);
                return e.reply(`你需要等待${secondsLeft}秒后才能再次转账哦~`, false, { at: true });
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

        console.log(e.msg);
        console.log(message);
        console.log(e.user_id);
        console.log(user_id2);

        if (message.some(item => item.qq === 'all')) {
          return e.reply('6', false, { at: true });
        }

        if (message.filter(item => item.type === 'at').length > 1) {
          return e.reply('不能同时转给两个人哦~', false, { at: true });
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply('你要给我钱嘛?~', false, { at: true });
        }

        if(!user_id2){
          return e.reply('请@你想要转账的人哦~', false, { at: true });
        }

        if (e.user_id == user_id2) {
            return e.reply('你不能给自己转账哦~', false, { at: true });
        }

        const regex = /#转账\s*(\d+)$/;
        const match = e.msg.match(regex);
        
        let paycoins = null;
        if (match) {
          paycoins = parseInt(match[1], 10);
          userData[user_id2].coins += paycoins;
          userData[e.user_id].coins -= paycoins;

          if (coins_id1 < paycoins) {
            return e.reply('你没有那么多喵喵币哦~', false, { at: true });
        }

          fs.writeFileSync(dataPath, yaml.stringify(userData));

          cooldowns[e.user_id] = now;

          return e.reply(`你成功给他转了${paycoins}个喵喵币哦~`, false, { at: true });
        }else{
            return e.reply(`要告诉我喵喵币的数量哦~`, false, { at: true });
        }
    }
    }
}