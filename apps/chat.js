import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'
import fetch from 'node-fetch'

const _path = process.cwd().replace(/\\/g, "/");
const configPath = `${_path}/plugins/xunmiao-plugin/config/deepseek/config.yaml`;

export class chat extends plugin {
  constructor() {
    super({
      name: '寻喵聊天',
      dsc: '寻喵聊天功能',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '[\\s\\S]*',
          fnc: 'chat'
        }
      ]
    });

    this.deepseekConfig = this.loadConfig();
  }

  loadConfig() {
    if (!fs.existsSync(configPath)) {
      console.error(`❌ DeepSeek 配置文件未找到: ${configPath}`);
      return {};
    }

    try {
      const file = fs.readFileSync(configPath, 'utf8');
      return yaml.parse(file);
    } catch (err) {
      console.error('❌ 读取 DeepSeek 配置失败:', err);
      return {};
    }
  }

  async chat(e) {
    if (!e.msg || typeof e.msg !== 'string') return;

    const msg = e.msg.trim();
    if (!msg || !this.deepseekConfig.api_key) return;

    const deepseek_url = 'https://api.deepseek.com/chat/completions';
    const model = this.deepseekConfig.model || 'deepseek-chat';
    const api_key = this.deepseekConfig.api_key;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    };

    const checkBody = {
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个内容审核助手，只回答“是”或“否”。请判断用户这句话是否包含不文明、侮辱、色情或攻击性语言，只回答“是”或“否”，不要添加解释。'
        },
        {
          role: 'user',
          content: msg
        }
      ]
    };

    try {
      const checkRes = await fetch(deepseek_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(checkBody)
      });

      const checkData = await checkRes.json();
      const checkReply = checkData.choices?.[0]?.message?.content?.trim().toLowerCase();

      if (checkReply.includes('是')) {

        await e.reply('不可以说脏话哦~');

        const group = this.e.bot.pickGroup(e.group_id, true);
        const member = group.pickMember(e.user_id);

        await member.mute(30);

        return;
      }

    } catch (err) {
      console.error('💥 DeepSeek 请求失败:', err);
    }
  }
}