import sys
import json
from mcstatus import JavaServer

def get_motd_json(host, port):
    server = JavaServer(host, int(port))
    status = server.status()
    # motd 是一个 MinecraftText 对象，包含原始 JSON
    motd_json = status.raw['description']
    print(json.dumps(motd_json, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python motd_json.py <host> <port>")
        sys.exit(1)
    get_motd_json(sys.argv[1], sys.argv[2])