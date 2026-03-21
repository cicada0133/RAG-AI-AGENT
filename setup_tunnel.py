#!/usr/bin/env python3
"""
Setup SSH reverse tunnel for local GPU → VPS backend
1. Copies local SSH public key to VPS authorized_keys
2. Enables GatewayPorts in sshd_config
3. Updates docker-compose.yml to use host-gateway for Ollama
4. Restarts containers
"""
import paramiko, sys, os

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = "YOUR_VPS_IP"
USER = "YOUR_VPS_USER"
PASSWORD = "YOUR_VPS_PASSWORD"
APP_DIR = "/opt/central-ai"

def run(ssh, cmd, timeout=60):
    print(f"  $ {cmd[:100]}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out.strip(): print("   ", out.strip()[-300:])
    if err.strip() and code != 0: print("  [ERR]", err.strip()[-200:])
    return code, out, err

# docker-compose with host-gateway so containers can reach VPS host (tunnel endpoint)
COMPOSE_CONTENT = '''services:
  ollama:
    image: ollama/ollama
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped

  backend:
    build: ./backend
    ports:
      - "8050:8050"
    environment:
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
      - LLM_PROVIDER=ollama
      - OLLAMA_MODEL=llama3.2:3b
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - uploads_data:/app/temp_uploads
      - chroma_data:/app/chroma_db
    depends_on:
      - ollama
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3050:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP:8050
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  ollama_data:
  uploads_data:
  chroma_data:
'''

def main():
    # Read local public key
    key_path = os.path.expanduser("~/.ssh/id_ed25519.pub")
    if not os.path.exists(key_path):
        key_path = os.path.expanduser("~/.ssh/id_rsa.pub")
    with open(key_path) as f:
        pubkey = f.read().strip()
    print(f"Using public key: {pubkey[:60]}...")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"\nConnecting to {HOST}...")
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("Connected!")

    # 1. Add SSH public key to authorized_keys
    print("\n[1/5] Adding SSH public key to VPS...")
    run(ssh, "mkdir -p /root/.ssh && chmod 700 /root/.ssh")
    run(ssh, f"grep -qF '{pubkey}' /root/.ssh/authorized_keys 2>/dev/null || echo '{pubkey}' >> /root/.ssh/authorized_keys")
    run(ssh, "chmod 600 /root/.ssh/authorized_keys")
    print("    SSH key added!")

    # 2. Enable GatewayPorts in sshd_config
    print("\n[2/5] Enabling GatewayPorts in sshd_config...")
    run(ssh, "grep -q '^GatewayPorts' /etc/ssh/sshd_config && sed -i 's/^GatewayPorts.*/GatewayPorts clientspecified/' /etc/ssh/sshd_config || echo 'GatewayPorts clientspecified' >> /etc/ssh/sshd_config")
    # Also ensure AllowTcpForwarding is on
    run(ssh, "grep -q '^AllowTcpForwarding' /etc/ssh/sshd_config && true || echo 'AllowTcpForwarding yes' >> /etc/ssh/sshd_config")
    run(ssh, "systemctl reload sshd")
    print("    GatewayPorts enabled!")

    # 3. Update docker-compose to use host-gateway
    print("\n[3/5] Updating docker-compose.yml (adding host-gateway for backend)...")
    sftp = ssh.open_sftp()
    with sftp.open(f"{APP_DIR}/docker-compose.yml", 'w') as f:
        f.write(COMPOSE_CONTENT)
    sftp.close()
    print("    docker-compose.yml updated!")

    # 4. Restart containers with new config
    print("\n[4/5] Restarting containers...")
    run(ssh, f"cd {APP_DIR} && docker compose down 2>&1 | tail -3", timeout=30)
    run(ssh, f"cd {APP_DIR} && docker compose up -d --build 2>&1 | tail -10", timeout=600)

    # 5. Status
    print("\n[5/5] Container status:")
    run(ssh, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

    print(f"""
╔══════════════════════════════════════════════════════════╗
║          SSH Reverse Tunnel Setup Complete!              ║
╠══════════════════════════════════════════════════════════╣
║  Now run THIS command on your local machine (Windows):   ║
║                                                          ║
║  ssh -N -R 0.0.0.0:11434:localhost:11434 \\               ║
║      YOUR_VPS_USER@YOUR_VPS_IP                                 ║
║                                                          ║
║  Keep this terminal open while testing!                  ║
╠══════════════════════════════════════════════════════════╣
║  Also make sure Ollama is running locally:               ║
║  set OLLAMA_HOST=0.0.0.0                                 ║
║  ollama serve                                            ║
╠══════════════════════════════════════════════════════════╣
║  Frontend: http://YOUR_VPS_IP:3050                    ║
║  Backend:  http://YOUR_VPS_IP:8050                    ║
╚══════════════════════════════════════════════════════════╝
""")
    ssh.close()

if __name__ == "__main__":
    main()
