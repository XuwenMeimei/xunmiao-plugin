import plugin from '../../../lib/plugins/plugin.js';
import { exec } from 'child_process';

function isIPv4(ip) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
  return ip.split('.').every(n => {
    const num = Number(n);
    return num >= 0 && num <= 255;
  });
}

function isIPv6(ip) {
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::1)|(::))$/;
  return ipv6Regex.test(ip);
}

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
      priority: 0,
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

    const cmd = `ping -c 4 ${input}`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        return e.reply(`Ping 失败:\n${stderr || err.message}`);
      }
      const lines = stdout.trim().split('\n');

      const headerMatch = lines[0].match(/^PING\s+([^\s]+)\s+\(([\d.]+)\)/);
      const host = headerMatch ? headerMatch[1] : input;
      const ip = headerMatch ? headerMatch[2] : input;

      const replyLines = lines.filter(line => line.includes('bytes from'));
      const replies = replyLines.map(line => {
        const m = line.match(/bytes from [^(]+\(([\d.]+)\): icmp_seq=(\d+) ttl=(\d+) time=([\d.]+) ms/);
        if (!m) return null;
        return {
          ip: m[1],
          seq: m[2],
          ttl: m[3],
          time: parseFloat(m[4])
        };
      }).filter(x => x);
      const statLineIndex = lines.findIndex(line => line.includes('packets transmitted'));
      const statLine = statLineIndex >= 0 ? lines[statLineIndex] : '';
      const lossMatch = statLine.match(/(\d+) packets transmitted, (\d+) received, (\d+)% packet loss/);

      const rttLine = lines.find(line => line.startsWith('rtt min/avg/max/mdev'));
      const rttMatch = rttLine ? rttLine.match(/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/) : null;

      let msg = `正在 Ping ${host} [${ip}] 具有 32 字节的数据:\n`;

      replies.forEach(r => {
        msg += `来自 ${r.ip} 的回复: 字节=32 时间=${r.time.toFixed(0)}ms TTL=${r.ttl}\n`;
      });

      if (replies.length === 0) {
        msg += '请求超时。\n';
      }

      if (lossMatch) {
        const sent = lossMatch[1];
        const received = lossMatch[2];
        const loss = lossMatch[3];
        msg += `\n${ip} 的 Ping 统计信息:\n`;
        msg += `    数据包: 已发送 = ${sent}，已接收 = ${received}，丢失 = ${sent - received} (${loss}% 丢失)，\n`;
      } else {
        msg += `\nPing 统计信息解析失败。\n`;
      }

      if (rttMatch) {
        const min = parseFloat(rttMatch[1]).toFixed(0);
        const avg = parseFloat(rttMatch[2]).toFixed(0);
        const max = parseFloat(rttMatch[3]).toFixed(0);
        msg += `往返行程的估计时间(以毫秒为单位):\n`;
        msg += `    最短 = ${min}ms，最长 = ${max}ms，平均 = ${avg}ms\n`;
      }

      e.reply(msg);
    });
  }
}
