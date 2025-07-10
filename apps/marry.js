import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'

const _path = process.cwd().replace(/\\/g, '/')
const marryDataPath = `${_path}/plugins/xunmiao-plugin/data/marry_data.yaml`

function getMarryData() {
    if (!fs.existsSync(marryDataPath)) fs.writeFileSync(marryDataPath, yaml.stringify({}))
    return yaml.parse(fs.readFileSync(marryDataPath, 'utf8')) || {}
}

function saveMarryData(data) {
    fs.writeFileSync(marryDataPath, yaml.stringify(data))
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
                    fnc: 'acceptmarry'
                },
                {
                    reg: '^#?我拒绝$',
                    fnc: 'rejectmarry'
                }
            ]
        })
    }

    async marry(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~')

        const marryData = getMarryData()
        const userId = e.user_id
        const message = e.message

        if (message.some(item => item.qq === 'all')) {
            return e.reply([segment.at(userId), ' 不可以这样！'])
        }

        const atList = message.filter(item => item.type === 'at')
        if (atList.length !== 1) {
            return e.reply([segment.at(userId), ' 请只@一个你想结婚的人哦~'])
        }

        const atUserId = atList[0].qq

        if (atUserId === '2582312528') {
            return e.reply([segment.at(userId), ' 啊嘞?这...这样不行啦~(害羞) '])
        }

        if (userId === atUserId) {
            return e.reply([segment.at(userId), ' 你不能和自己结婚哦~ '])
        }

        if (marryData[userId]?.married) {
            return e.reply([segment.at(userId), ' 你已经结婚了哦~ '])
        }

        if (marryData[atUserId]?.married) {
            return e.reply([segment.at(userId), ' 对方已经结婚了哦~ '])
        }

        if (marryData[userId]?.proposing) {
            return e.reply([segment.at(userId), ' 你正在向别人求婚，请等待回应~ '])
        }

        let she_he = await this.people(e, 'sex', userId)

        marryData[userId] = {
            married: false,
            target: atUserId,
            proposing: true
        }

        saveMarryData(marryData)

        return e.reply([
            segment.at(atUserId), "\n",
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${atUserId}`), "\n",
            segment.at(userId), "\n",
            segment.image(`https://q1.qlogo.cn/g?b=qq&s=0&nk=${userId}`), "\n",
            `向你求婚：‘亲爱的${segment.at(atUserId)}您好！`, "\n",
            `在茫茫人海中，能够与${segment.at(atUserId)}相遇相知相恋，我深感幸福，守护你是我今生的选择，我想有个自己的家，一个有你的家,嫁给我好吗？’`, "\n",
            segment.at(atUserId), "\n",
            `那么这位${segment.at(atUserId)}，你愿意嫁给ta吗？at并发送【我愿意】或者【我拒绝】，回应${she_he}哦！`
        ])
    }

    async acceptmarry(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~')

        const marryData = getMarryData()
        const userId = e.user_id
        const atList = e.message.filter(item => item.type === 'at')
        if (atList.length !== 1) {
            return e.reply([segment.at(userId), ' 请@向你求婚的那个人~'])
        }

        const proposerId = atList[0].qq

        const proposer = marryData[proposerId]
        if (!proposer || proposer.target !== userId || proposer.married || !proposer.proposing) {
            return e.reply([segment.at(userId), ' 没有检测到来自此人的有效求婚哦~'])
        }

        marryData[userId] = {
            married: true,
            partner: proposerId
        }

        marryData[proposerId].married = true
        marryData[proposerId].partner = userId
        delete marryData[proposerId].target
        delete marryData[proposerId].proposing

        saveMarryData(marryData)

        return e.reply([
            segment.at(userId), "\n",
            '相亲相爱幸福永，同德同心幸福长。愿你俩情比海深！祝福你们新婚愉快，幸福美满，激情永在，白头偕老！'
        ])
    }

    async rejectmarry(e) {
        if (!e.isGroup) return e.reply('这个功能仅支持群聊使用哦~')

        const marryData = getMarryData()
        const userId = e.user_id
        const atList = e.message.filter(item => item.type === 'at')
        if (atList.length !== 1) {
            return e.reply([segment.at(userId), ' 请@向你求婚的那个人~'])
        }

        const proposerId = atList[0].qq

        const proposer = marryData[proposerId]
        if (!proposer || proposer.target !== userId || proposer.married || !proposer.proposing) {
            return e.reply([segment.at(userId), ' 这个人没有向你求婚哦~'])
        }

        delete marryData[proposerId]
        saveMarryData(marryData)

        return e.reply([
            segment.at(userId), "\n",
            '你拒绝了对方的求婚，希望你们都能找到属于自己的幸福！'
        ])
    }

    async people(e, keys, id) {
        let memberMap = await e.group.getMemberMap()
        let arrMember = Array.from(memberMap.values())
        let lp = arrMember.find(item => item.user_id == id)
        if (!lp) return 'ta'

        if (keys == 'sex') {
            return lp.sex === 'male' ? '他' : '她'
        }
        if (keys == 'nickname') {
            return lp.card || lp.nickname
        }
    }
}
