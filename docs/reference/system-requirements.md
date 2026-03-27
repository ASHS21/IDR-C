# System Requirements Reference

> Canonical hardware, software, and network requirements for Identity Radar.

This is the authoritative system requirements table. The [getting-started guide](../getting-started/system-requirements.md) provides additional context and installation-specific instructions.

## Hardware Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| RAM | 16 GB | 32 GB | AI model uses ~8 GB at inference time |
| CPU | 4 cores | 8 cores | More cores improve sync and scan performance |
| Disk | 50 GB free | 100 GB SSD | AI model is ~20 GB; DB grows ~1 GB per 10K identities |
| Network | 100 Mbps LAN | 1 Gbps LAN | Required for source system connectivity |

## Operating Systems

| OS | Supported Versions |
|----|-------------------|
| Windows | 10 21H2+, 11, Server 2022+ |
| Ubuntu | 22.04 LTS, 24.04 LTS |
| RHEL | 9.x |
| Debian | 12 |
| macOS | 13+ (Apple Silicon or Intel) |

## Software Dependencies

| Software | Required Version | Purpose |
|----------|-----------------|---------|
| Docker Desktop | 4.40+ | Container runtime |
| Docker Compose | v2.20+ | Service orchestration |
| Git | 2.40+ | Source management (Linux/macOS install) |
| Node.js | 20 LTS | Runtime (bundled in Docker image) |
| PostgreSQL | 16+ | Database (bundled in Docker image) |

## Network Ports

| Port | Protocol | Service | Exposure |
|------|----------|---------|----------|
| 3000 | TCP | Identity Radar application | LAN / localhost |
| 5432 | TCP | PostgreSQL | Internal only |
| 12434 | TCP | Docker Model Runner (AI) | Internal only |
| 80 | TCP | Caddy HTTP redirect | WAN (production only) |
| 443 | TCP | Caddy HTTPS | WAN (production only) |

## Browser Compatibility

| Browser | Minimum Version |
|---------|----------------|
| Google Chrome | 120+ |
| Microsoft Edge | 120+ |
| Mozilla Firefox | 120+ |
| Safari | 17+ |

## Next Steps

- [Install on Windows](../getting-started/install-windows.md)
- [Install on Linux](../getting-started/install-linux.md)
- [Port Reference](./ports.md)
