# System Requirements

> Minimum and recommended hardware, software, and network requirements for running Identity Radar.

## Hardware

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 16 GB | 32 GB |
| CPU | 4 cores | 8 cores |
| Disk | 50 GB free | 100 GB SSD |
| Network | 100 Mbps LAN | 1 Gbps LAN |

The AI model download requires approximately 20 GB of disk space. PostgreSQL data grows roughly 1 GB per 10,000 identities monitored.

## Operating System

| OS | Supported Versions |
|----|-------------------|
| Windows | Windows 10 21H2+, Windows 11, Windows Server 2022+ |
| Linux | Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, RHEL 9, Debian 12 |
| macOS | macOS 13+ (Apple Silicon or Intel) |

## Software Prerequisites

| Software | Version | Notes |
|----------|---------|-------|
| Docker Desktop | 4.40+ | Required. WSL 2 backend on Windows. |
| Docker Compose | v2.20+ | Bundled with Docker Desktop |
| Git | 2.40+ | For Linux/macOS install only |
| Web browser | Chrome 120+, Edge 120+, Firefox 120+, Safari 17+ | For accessing the dashboard |

## Network Ports

| Port | Service | Direction | Notes |
|------|---------|-----------|-------|
| 3000 | Identity Radar UI | Inbound | Main application |
| 5432 | PostgreSQL | Internal | Database (not exposed externally in production) |
| 12434 | Docker Model Runner | Internal | Local AI model inference |
| 80 | Caddy HTTP | Inbound | Redirects to HTTPS (production) |
| 443 | Caddy HTTPS | Inbound | TLS termination (production) |

For air-gapped deployments, no outbound internet access is required after initial setup.

## Verification

Run the following to confirm Docker is ready:

```bash
docker --version
docker compose version
```

Both commands should return version numbers meeting the minimums above.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Docker not found | Install Docker Desktop from https://docker.com/products/docker-desktop |
| WSL 2 not enabled (Windows) | Run `wsl --install` in an elevated PowerShell and reboot |
| Insufficient disk space | Free at least 50 GB before running the installer |
| Port 3000 in use | Stop the conflicting process or change the port in `.env.local` |

## Next Steps

- [Install on Windows](./install-windows.md)
- [Install on Linux](./install-linux.md)
- [Install air-gapped](./install-airgap.md)
