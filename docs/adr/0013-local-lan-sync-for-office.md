# 13. Cloudless WAN Sync via Local Office Server & Secure Tunnels

**Status**: Accepted  
**Date**: 2026-05-24  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Role**: `@agency-security-engineer` (Security Engineer) & `@agency-backend-architect` (Backend Architect)

## Context

To avoid recurring cloud database and file storage hosting fees (especially for large binary assets like service tag photos), the system must synchronize snapshot records and media files directly to a **local office server** (running on a PC or NAS at the contractor's headquarters) rather than a cloud-hosted infrastructure (e.g., AWS S3/RDS).

However, technicians operate in the field and need to submit completed diagnostics and photos in real-time from job sites over cellular networks, meaning the local office server must be accessible from the Wide Area Network (WAN). Exposing a local office network to the public internet introduces serious security risks (DoS, brute force, network penetration). We must establish a secure, zero-cloud-cost WAN sync transport.

## Decision

We will implement a hybrid **Local Office Storage + Cloudless Secure Tunnel Transport** sync architecture:

1. **Local Server Stack**: The contractor runs a lightweight local sync server (Node.js/Express + SQLite master database) on an office PC or NAS. Photos are saved in a local, compressed directory structure.
2. **WAN Tunnel (Cloudflare Tunnels)**: To expose the office server API securely without paying for public static IPs or opening firewall ports, we utilize **Cloudflare Tunnels** (free tier). The office server runs a local tunnel daemon (`cloudflared`) that maintains an outbound connection to Cloudflare, exposing the REST API endpoints via a secure subdomain (e.g., `https://sync.myhvacshop.com`).
3. **HMAC-SHA256 Request Signing**: To protect the exposed endpoints, we implement API request signing rather than static tokens.
   - Every technician device is provisioned with a unique, server-side generated secret key.
   - For every sync request, the mobile app generates a signature using HMAC-SHA256 over a payload containing a client-side millisecond timestamp.
   - The server verifies the signature and rejects any requests with timestamps older than 300 seconds (5 minutes) to protect against replay attacks.
4. **Cloudflare Rate Limiting**: The public subdomain is configured with Cloudflare rate-limiting rules (maximum 10 requests/minute per device IP) to prevent Denial of Service (DoS) and automated scanning attempts.
5. **Active Job Scope Caching**: To prevent local SQLite database bloat and performance degradation on technicians' phones, the office server only pushes historical records and notes for sites/customers that are currently assigned to the technician's upcoming schedule (7-day rolling window). Older job records are pruned locally.
6. **Client-Side Photo Compression**: To conserve cellular data and local server storage, the mobile app automatically downscales and compresses all service tag photos to a web-optimized JPEG format (maximum 1080p, 70% quality, targeting ~150KB to 200KB per image) and strips EXIF location metadata before writing to the Outbox.
7. **Explicit Visual Sync Queue**: The mobile UI provides a dedicated progress tray displaying transfer progress and queue counts. Successful sync triggers a dual-tap haptic pulse (150ms) and acoustic chime, while failures display a red warning banner.

## Hard Questions (5-Year Operator Perspective)

> [!WARNING]
> **1. Handling Local Office Power or Internet Outages:**
> If the office server goes offline (due to power cuts or internet outages), technicians in the field cannot sync.
> *Mitigation*: The mobile app's local **Outbox** serves as a persistent, offline-first queue. Finalized snapshots are safely stored in local encrypted SQLite database files until the server becomes reachable again. The app automatically retries sync with exponential backoff.
>
> **2. Office Server Hardware Failures and Backups:**
> Storing all business data locally on a single office PC introduces a single point of failure.
> *Mitigation*: The local server software will include an automated, scheduled local backup task that copies the SQLite database and photos directory to a secondary external USB drive or local NAS partition on the office network.
>
> **3. Technician Key Provisioning and Offboarding:**
> If a technician leaves the company, their signing keys must be revoked.
> *Mitigation*: The local office web console allows administrators to immediately deactivate a technician ID, revoking their credentials from the active HMAC validator.

## Cost of Being Wrong

If this cloudless sync model fails:
- **Security Breach**: An exposed office port or compromised token could allow attackers to traverse the local network, risking business data theft or ransomware.
- **Data Loss**: Lack of robust local backup schedules on the office server could result in permanent loss of historical records if the office hard drive crashes.
