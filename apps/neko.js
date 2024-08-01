import plugin from '../../../lib/plugins/plugin.js'

export class neko extends plugin {
  constructor() {
    super({
      name: '寻喵',
      dsc: '寻喵功能',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#*寻喵(~+|!+|\.|。|酱|在吗|在嘛)?$',
          fnc: 'neko'
        },
        {
          reg: '^#*寻喵(贴+|蹭+)(~+|!+)?$',
          fnc: 'nekotie'
        },
        {
          reg: '^#*寻喵(抱+)(~+|!+)?$',
          fnc: 'nekobao'
        }
      ]
    })
  }

  async neko() {
    const replies = ["我在哦~", "怎么啦?", "喵?", "nya~", "贴贴~", "哇呜~"];
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    return this.reply(randomReply, false, { at: true });
  }

  async nekotie() {
    const replies = ["贴贴~", "喵~(蹭)", "喵~(贴)", "nya~(贴)", "nya~(蹭)"];
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    return this.reply(randomReply, false, { at: true });
  }

  async nekobao() {
    const replies = ["抱抱~"];
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    return this.reply(randomReply, false, { at: true });
  }
}
