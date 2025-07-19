import plugin from '../../../lib/plugins/plugin.js';
import { exec } from 'child_process';

// 严格校验IPv4
function isIPv4(ip) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
  return ip.split('.').every(n => {
    const num = Number(n);
    return num >= 0 && num <= 255;
  });
}

// 简单校验IPv6（可根据需求增强）
function isIPv6(ip) {
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::1)|(::))$/;
  return ipv6Regex.test(ip);
}

// 严格校验域名，不允许端口、协议、路径
function isDomain(domain) {
  if (domain.length > 253) return false;
  if (domain.endsWith('.')) domain = domain.slice(0, -1);
  const labels = domain.split('.');
  if (labels.some(label => !/^[a-zA-Z0-9-]{1,63}$/.test(label))) return false;
  if (labels.some(label => label.startsWith('-') || label.endsWith('-'))) return false;
  return labels.length > 0;
}

function isValidTarget(input) {
  return isIPv4(input) || isIPv6(input) || isDomain(input);
}

export class tools extends plugin {
  constructor() {
    super({
      name: '寻喵工具',
      dsc: '寻喵工具功能',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#ping\\s+(.*)$',
          fnc: 'ping'
        }
      ]
    });
  }

  async ping(e) {
    const input = e.msg.match(/^#ping\s+(.*)$/)?.[1].trim();
    if (!input) return e.reply('请提供服务器地址，例如：#ping mc.hypixel.net');

    if (!isValidTarget(input)) {
      return e.reply('请输入合法的IPv4地址、IPv6地址或域名（不含端口、协议）');
    }

    const isWin = process.platform === 'win32';
    const cmd = isWin ? `ping -n 4 ${input}` : `ping -c 4 ${input}`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        return e.reply(`Ping 失败:\n${stderr || err.message}`);
      }
      // 直接返回原生ping输出，格式接近系统cmd
      e.reply(stdout.trim());
    });
  }
}
