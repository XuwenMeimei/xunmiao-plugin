import plugin from '../../../lib/plugins/plugin.js'
import { exec } from 'child_process'
import punycode from 'punycode'
import dns from 'dns/promises'

function isIPv6(address) {
  const ipv6Regex = /^(?:([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::)|((?:[0-9a-fA-F]{1,4}:){1,7}:)|((?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})|((?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2})|((?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3})|((?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4})|((?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5})|([0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6})|(::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}))$/;
  return ipv6Regex.test(address);
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
          reg: '^#ping\\s+(.+)$',
          fnc: 'ping'
        }
      ]
    });
  }

  async ping(e) {
    const input = e.msg.match(/^#ping\s+(.+)$/)?.[1].trim();
    if (!input) return e.reply('请提供服务器地址，例如：#ping mc.hypixel.net');

    if (!/^[a-zA-Z0-9.\-\u4e00-\u9fa5]+$/.test(input)) {
      return e.reply('服务器地址格式不正确哦~');
    }

    if (isIPv6(input)) {
      return e.reply('还不支持 IPv6 地址哦~');
    }

    let asciiInput;
    try {
      asciiInput = punycode.toASCII(input);
    } catch {
      return e.reply('域名转换失败，请检查输入');
    }

    let cnameTarget = asciiInput;
    try {
      const cnameRes = await dns.resolveCname(asciiInput);
      if (cnameRes?.length > 0) {
        cnameTarget = punycode.toASCII(cnameRes[0].replace(/\.$/, ''));
      }
    } catch {
      // ignore
    }

    const isWin = process.platform === 'win32';
    const command = isWin ? `ping -n 4 "${asciiInput}"` : `ping -c 4 "${asciiInput}"`;

    exec(command, async (err, stdout, stderr) => {
      if (err || stderr) {
        return e.reply(`Ping 失败：${stderr || err.message}`);
      }

      const lines = stdout.trim().split('\n');

      let ipMatch = lines[0].match(/PING\s.+\s\(([\d.]+)\)/);
      if (!ipMatch && isWin) {
        ipMatch = lines[0].match(/\[([\d.]+)\]/);
      }
      const ip = ipMatch?.[1] || asciiInput;

      const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(input);
      const targetDisplay = isIPv4 ? ip : `${cnameTarget} [${ip}]`;

      const replyLines = lines.filter(line => {
        if (isWin) return line.includes('字节=');
        else return line.includes('bytes from');
      });

      const timesAndTTL = replyLines.map(line => {
        let timeMatch = line.match(/time=([\d.]+) ?ms/);
        let ttlMatch = line.match(/ttl=(\d+)/i);

        if ((!timeMatch || !ttlMatch) && isWin) {
          timeMatch = line.match(/时间[=<]?([\d]+)ms/);
          ttlMatch = line.match(/TTL=(\d+)/i);
          if (timeMatch && ttlMatch) {
            return {
              time: parseInt(timeMatch[1]),
              ttl: parseInt(ttlMatch[1])
            };
          }
          return null;
        }

        if (!timeMatch || !ttlMatch) return null;

        return {
          time: Math.round(parseFloat(timeMatch[1])),
          ttl: parseInt(ttlMatch[1])
        };
      }).filter(item => item !== null);

      const sent = 4;
      const received = timesAndTTL.length;
      const lost = sent - received;
      const lossRate = Math.round((lost / sent) * 100);

      const msgLines = [];
      msgLines.push(`正在 Ping ${targetDisplay} 具有 32 字节的数据:`);

      timesAndTTL.forEach(({ time, ttl }) => {
        msgLines.push(`来自 ${ip} 的回复: 字节=32 时间=${time}ms TTL=${ttl}`);
      });

      if (received === 0) {
        msgLines.push(`请求超时。`);
      }

      msgLines.push('');
      msgLines.push(`${ip} 的 Ping 统计信息:`);
      msgLines.push(`    数据包: 已发送 = ${sent}，已接收 = ${received}，丢失 = ${lost} (${lossRate}% 丢失)`);

      if (received > 0) {
        const numericTimes = timesAndTTL.map(t => t.time);
        const min = Math.min(...numericTimes);
        const max = Math.max(...numericTimes);
        const avg = Math.round(numericTimes.reduce((a, b) => a + b, 0) / numericTimes.length);
        msgLines.push(`往返行程的估计时间(以毫秒为单位):`);
        msgLines.push(`    最短 = ${min}ms，最长 = ${max}ms，平均 = ${avg}ms`);
      }

      // 使用锅巴封装的合并转发（群聊）或普通文本（私聊）
      if (e.isGroup) {
        const forward = await makeForwardMsg(e, msgLines);
        await e.reply(forward);
      } else {
        for (const line of msgLines) {
          await e.reply(line);
        }
      }
    });
  }
}
