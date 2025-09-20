# Running Expo (React Native) in Docker

This setup containers the Expo dev server for web and native development.

## Prereqs
- Docker Desktop installed and running
- Ports: `19000`, `19001`, `19006` available

## Start
From repo root:

```powershell
# Build and run Expo with tunnel (works off-LAN)
docker compose -f docker-compose.expo.yml up --build
```

Then open the Expo web app:
- http://localhost:19006

For native (Expo Go):
- Use the QR from the terminal output. The `--tunnel` flag enables access without being on the same LAN.

## Common tips
- Windows file watching can be slow. This setup mounts your code so changes reload automatically.
- If ports are taken, change mappings in `docker-compose.expo.yml`.
- You can switch to LAN mode for speed if your device is on the same network:

```yaml
# in docker-compose.expo.yml
command: ["npm", "run", "start", "--", "--lan", "--non-interactive", "--host", "lan"]
```

## Troubleshooting
- If you see Metro not reachable, ensure firewall allows Docker on these ports.
- Some native modules (build toolchains) aren’t needed for Expo Go; ejecting/building native apps requires more tooling than provided here.
