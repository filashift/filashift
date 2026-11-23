# Hosting PlateShift on your own server

PlateShift is a static site: HTML, JavaScript and JSON printer profiles (~18 MB). Conversion runs in the visitor's browser, so the server only hands out files. No Node.js, database or backend process is needed on the server.

## DigitalOcean quick path
1. Create Droplet: Ubuntu 24.04 LTS, Basic, Regular SSD, the smallest size ($4–6/mo) is enough; pick the closest US region (e.g. New York).
2. Authentication: choose **SSH Key** (add yours).
3. Advanced options → **Add initialization scripts** → paste `digitalocean-cloud-init.yaml`.
4. Create, wait ~3 minutes, then upload the site (replace IP):
   ```bash
   scp plateshift-site.zip root@YOUR_DROPLET_IP:/tmp/
   ssh root@YOUR_DROPLET_IP 'unzip -o /tmp/plateshift-site.zip -d /var/www/plateshift'
   ```
5. Open http://YOUR_DROPLET_IP — PlateShift should load.
6. Domain + HTTPS: add an A record pointing your domain at the droplet IP, then on the server edit `/etc/caddy/Caddyfile`, replace `:80` with the domain and run `systemctl reload caddy`. Caddy obtains the certificate automatically.

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
