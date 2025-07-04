import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import yaml from 'yaml'
import fetch from 'node-fetch'

const _path = process.cwd().replace(/\\/g, "/");
const configPath = `${_path}/plugins/xunmiao-plugin/config/deepseek/config.yaml`;

export class duel extends plugin {
  constructor() {
    super({
      name: '寻喵聊天',
      dsc: '调用 DeepSeek API 进行对话',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '[\\s\\S]*',
          fnc: 'chat'
        }
      ]
    });

    // 读取配置
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
    const msg = e.msg.trim();
    if (!msg || !this.deepseekConfig.api_key) return;

    const deepseek_url = 'https://api.deepseek.com/v1/chat/completions';
    const ai_model = this.deepseekConfig.model || 'deepseek-chat';
    const api_key = this.deepseekConfig.api_key;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    };

    const body = {
      model: ai_model,
      messages: [
        { role: 'system', content: '你是一个可爱又聪明的猫娘助手，请用亲切有趣的语气回答用户问题。' },
        { role: 'user', content: msg }
      ]
    };

    try {
      const response = await fetch(deepseek_url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        return e.reply(`请求失败：${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim();

      if (reply) {
        return e.reply(reply);
      } else {
        return e.reply('喵呜~ 这次没有收到回复呢。');
      }
    } catch (error) {
      console.error('DeepSeek 请求错误：', error);
      return e.reply('请求 DeepSeek 失败喵，可能是网络问题或配置错误。');
    }
  }
}
