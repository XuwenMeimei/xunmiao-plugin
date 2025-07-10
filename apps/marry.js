import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import yaml from 'yaml';

const _path = process.cwd().replace(/\\/g, '/');
const marryDataPath = `${_path}/plugins/xunmiao-plugin/data/marry_datayaml`;

function getMarryData() {
    if (!fs.existsSync(marryDataPath)) fs.writeFileSync(marryDataPath,yaml.stringify({}));
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
            },
            {
            reg: '^#?我愿意$',
            fnc: 'accept'
            },
            {
            reg: '^#?我拒绝$',
            fnc: 'reject'
            }
            ]
        })
    }

    async marry(e) {
        if (!e.isGroup) {
            return e.reply('这个功能仅支持群聊使用哦~');
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
        return e.reply([segment.at(userId), ' 不可以这样！']);
        }

        if (message.filter(item => item.type === 'at').length > 1) {
        return e.reply([segment.at(userId), ' 不能同时和两个人结婚哦~ ']);
        }

        if (message.some(item => item.qq === '2582312528')) {
            return e.reply([segment.at(userId), ' 啊嘞?这...这样不行啦~(害羞) ']);
        }

        if (!atUserId) {
            return e.reply([segment.at(userId), ' 请@你想要结婚的人哦~ ']);
        }

        if (userId == atUserId) {
            return e.reply([segment.at(userId), ' 你不能和自己结婚哦~ ']);
        }

        if (marryData[userId] && marryData[userId].married) {
            return e.reply([segment.at(userId), ' 你已经结婚了哦~ ']);
        }

        if (marryData[atUserId] && marryData[atUserId].married) {
            return e.reply([segment.at(userId), ' 对方已经结婚了哦~ ']);
        }

        let she_he = await this.people(e, 'sex', userId);

        if (!marryData[userId] || !marryData[userId].married) {
            let sex = '';
            if (sex == 'male') {
                sex = '小姐';
            } else if (sex == 'female') {
                sex = '先生';
            }

            marryData[userId] = {
                married: false,
                target: atUserId
            };
            fs.writeFileSync(marryDataPath, yaml.stringify(marryData));

            return e.reply([
            segment.at(atUserId), "\n",
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${atUserId}`), "\n",
            segment.at(userId), "\n",
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${userId}`), "\n",
            `向你求婚：‘亲爱的${sex}您好！`, "\n",
            `在茫茫人海中，能够与${sex}相遇相知相恋，我深感幸福，守护你是我今生的选择，我想有个自己的家，一个有你的家,嫁给我好吗？’`, "\n",
            segment.at(atUserId), "\n",
            `那么这位${sex}，你愿意嫁给ta吗？at并发送【我愿意】或者【我拒绝】，回应${she_he}哦！`]);
        }else{
            return;
        }
    }

    async accept(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');
        const marryData = getMarryData();
        const userId = e.user_id;

        let proposerId = null
        for (let id in marryData) {
            if (marryData[id].target === userId && !marryData[id].married) {
                proposerId = id;
                break;
            }
        }
        if (!proposerId) {
            return e.reply([segment.at(userId), ' 还没有人向你求婚哦~']);
        }

        marryData[userId] = {
            married: true,
            partner: proposerId
        };
        marryData[proposerId].married = true;
        marryData[proposerId].partner = userId;
        delete marryData[proposerId].target;

        fs.writeFileSync(marryDataPath, yaml.stringify(marryData));

        return e.reply([
            segment.at(userId), "\n",
            '相亲相爱幸福永，同德同心幸福长。愿你俩情比海深！祝福你们新婚愉快，幸福美满，激情永在，白头偕老！',
        ])
    }

    async reject(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~');

        const marryData = getMarryData();
        const userId = e.user_id;
        
        let proposerId = null;
        for (let id in marryData) {
            if (marryData[id].target === userId && !marryData[id].married) {
                proposerId = id;
                break;
            }
        }
        if (!proposerId) {
            return e.reply([segment.at(userId), ' 没有人向你求婚，不要捣乱啦~']);
        }

        delete marryData[proposerId];
        fs.writeFileSync(marryDataPath, yaml.stringify(marryData));

        return e.reply([
            segment.at(userId), "\n",
            '抱歉，拒绝了对方的求婚。希望你们能找到更合适的人选！'
        ]);
    }

    async people(e, keys, id) {
        let memberMap = await e.group.getMemberMap();
        let arrMember = Array.from(memberMap.values());
        var this_one = arrMember.filter(item => {
            return item.user_id == id
        })
        var lp = this_one[0]
        if (keys == 'sex') {
            var she_he = '她'
            if (lp.sex == 'male')
                she_he = '他'
            return she_he
        }
        if (keys == 'nickname') {
            var name = lp.nickname
            if (lp.card !== '')
                name = lp.card
            return name
        }
    }
}
    