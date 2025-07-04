export class duel extends plugin {
  constructor() {
    super({
      name: '寻喵聊天',
      dsc: '寻喵聊天功能',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '[\s\S]*',
          fnc: 'chat'
        }
      ]
    })
  }

    async chat(e) {
    const message = e.message;
    const groupId = e.group_id;

    // 这里可以添加聊天逻辑，比如回复用户的消息
    // 例如，简单地回复用户发送的消息
        return e.reply(`${groupId}说: ${message}`, false, { at: false });
    }
}