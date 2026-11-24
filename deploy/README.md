# Hosting PlateShift on your own server

PlateShift is a static site: HTML, JavaScript and JSON printer profiles (~18 MB). Conversion runs in the visitor's browser, so the server only hands out files. No Node.js, database or backend process is needed on the server.

## DigitalOcean quick path
The normal `deploy/release.sh` workflow builds and prerenders the candidate, then runs
`npm run test:release:mobile-es` before any upload or swap. This Chromium mobile-emulation
test taps the five Spanish single-spool links and reloads each finder result with the
saved language cleared. It also checks that the X1 Carbon original AMS warning appears
before the PETG link in both English and Spanish, visually and in reading order.
It uses an in-memory catalog, never included in the release.
Run it independently against the current build, or set `BASE=https://filashift.com`
for a separate smoke test using the live catalog. Use `CHROME` to override the executable.

Before the five-printer suite, `npm run test:release:mobile-es:shortcuts` runs as a
single blocking check for the Creator 5 Pro, A1, X1 Carbon and Snapmaker U1. Each
Spanish shortcut must focus its own printer section, and that section’s shopping
link must open the correct single-spool results and retain Spanish after reload.
Use `npm run test:release:mobile-es:bambu` to run just the two Bambu paths on demand.

`npm run test:release:mobile-en:shortcuts` is the English pre-upload check for the
Flashforge Creator 5 Pro and Snapmaker U1. In mobile touch emulation it taps each
shortcut, checks that focus moves to the matching section, then opens that section’s
PLA single-spool results and verifies the English filters before and after reload.

1. Create Droplet: Ubuntu 24.04 LTS, Basic, Regular SSD, the smallest size ($4–6/mo) is enough; pick the closest US region (e.g. New York).
2. Authentication: choose **SSH Key** (add yours).
3. Advanced options → **Add initialization scripts** → paste `digitalocean-cloud-init.yaml`.
4. Create, wait ~3 minutes, then upload the site (replace IP):
   ```bash
   scp plateshift-site.zip root@YOUR_DROPLET_IP:/tmp/
   ssh root@YOUR_DROPLET_IP 'unzip -o /tmp/plateshift-site.zip -d /var/www/plateshift'
   ```
5. Open http://YOUR_DROPLET_IP — PlateShift should load.
6. Domain + HTTPS: in Porkbun DNS, delete the default parking records for `filashift.com` (the ALIAS/A record to `uixie.porkbun.com` and the `*`/`www` CNAMEs), then add `A  @  167.99.104.154` and `A  www  167.99.104.154`. The server already runs `Caddyfile.filashift` (installed as `/etc/caddy/Caddyfile`), so Caddy obtains the certificate automatically as soon as DNS resolves; `www` redirects to `https://filashift.com`. Check with `dig +short filashift.com` and `curl -I https://filashift.com`.

## 1. Server
Any small Linux VPS (1 vCPU, 512 MB–1 GB RAM, Ubuntu 24.04 LTS) is plenty. Point your domain's DNS A record (and AAAA for IPv6) at the server's IP address.

## 2. Install a web server (pick one)

**Caddy (simplest, automatic HTTPS)**
```bash
sudo apt update && sudo apt install -y caddy
sudo mkdir -p /var/www/plateshift
sudo cp Caddyfile /etc/caddy/Caddyfile      # edit the domain first
sudo systemctl reload caddy
```

**nginx + Let's Encrypt**
```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
sudo mkdir -p /var/www/plateshift
sudo cp nginx-plateshift.conf /etc/nginx/sites-available/plateshift   # edit the domain first
sudo ln -s /etc/nginx/sites-available/plateshift /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d plateshift.example.com
```

## 3. Upload the site
Either unzip `plateshift-site.zip` into `/var/www/plateshift/`:
```bash
scp plateshift-site.zip user@server:/tmp/
ssh user@server 'sudo unzip -o /tmp/plateshift-site.zip -d /var/www/plateshift && sudo chown -R www-data:www-data /var/www/plateshift'
```
or, from the project folder, run `./deploy/deploy.sh user@server` (builds and rsyncs; your user needs write access to /var/www/plateshift).

## 4. Basic hardening
```bash
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
sudo apt install -y unattended-upgrades
```
Use SSH keys and disable password login (`PasswordAuthentication no` in /etc/ssh/sshd_config).

## Licensing note
The printer profiles are derived from OrcaSlicer's system profiles (AGPL-3.0). Because the site is offered publicly over a network, the safest course is to publish PlateShift's source (for example a public GitHub repository) and link it in the footer.

## Updating
Rebuild (`npm run build`) and upload `dist/public/` again. Asset file names change with each build, so visitors always get the new version.

## Caddy version and certificate backup

The server runs Caddy from the official repository (`/etc/apt/sources.list.d/caddy-stable.list`), upgraded from Ubuntu's 2.6.2 to 2.11.9. Update it with `apt update && apt install caddy`; unattended-upgrades only covers Ubuntu's own packages, so Caddy updates are manual.

`Caddyfile.filashift` sets a global `email support@jacksoncgc.com`. Let's Encrypt is used first, and ZeroSSL takes over automatically if Let's Encrypt fails. ZeroSSL refuses Caddy requests without an email (error `caddy_legacy_user_removed`). Backups from the upgrade are in `/root/` on the server (`caddy-backup-*.tgz`, `Caddyfile.pre-upgrade`, `Caddyfile.pre-email`).
