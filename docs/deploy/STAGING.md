# Putting SellEase staging online (abc-staging.selease.com)

This guide is for the owner. You do every step yourself: Claude never sees your passwords, keys or tokens.
Allow about an hour the first time. After that, updating staging is two button presses on GitHub.

**What you'll end up with:** SellEase running at **https://abc-staging.selease.com** on your staging Droplet, with:
- automatic HTTPS
- its own database
- design photos stored in DigitalOcean Spaces
- three manual buttons on GitHub: **Deploy**, **Migrate database** and **Staging tools** (load demo data / wipe)

**What you need:**
- your DigitalOcean account
- the place where `selease.com`'s DNS is managed
- your GitHub account (syedGitHubProj)
- a terminal on your Mac

In the commands below, replace `203.0.113.10` with your **Droplet's IP address** and `youruser` with the user you normally sign in to the Droplet with.

---

## Step 0: Create a new Droplet (skip if you're reusing one)

### 0a. An SSH key on your Mac (your own key, for you to sign in)

Check whether you already have one:

```bash
ls ~/.ssh/id_ed25519.pub
```

If it says "No such file", make one. When it asks for a **passphrase**, choose one and remember it; it protects the key if your Mac is lost.

```bash
ssh-keygen -t ed25519 -C "owner-mac"
```

Print the public half, which is safe to share, to paste into DigitalOcean:

```bash
cat ~/.ssh/id_ed25519.pub
```

### 0b. Create the Droplet in DigitalOcean

Go to https://cloud.digitalocean.com, then **Create → Droplets**, and choose:

| Setting | Choose | Why |
|---|---|---|
| **Region** | **Bangalore (BLR1)**, or Singapore (SGP1) | Closest to Pakistan, so pages load faster. Put the Spaces bucket (Step 3) in the same region. If Spaces isn't offered in Bangalore, use Singapore for both. |
| **Image** | **Marketplace → "Docker on Ubuntu"** (Ubuntu 24.04) | Docker and Docker Compose come already installed. |
| **Size** | **Basic → Regular → 4 GB RAM / 2 CPUs / 80 GB SSD** (about US$24/month) | Enough for staging and later 2–3 client apps. 2 GB is too small. |
| **Authentication** | **SSH Key → New SSH Key**: paste the line from `cat ~/.ssh/id_ed25519.pub` and name it "Owner Mac" | Safer than a password. |
| **Backups** | Optional (adds about 20% to the price) | Nice for staging. The live server gets its own database backups in Phase 5. |
| **Monitoring** | Tick **Improved metrics monitoring** (free) | Shows memory and CPU graphs. |
| **Hostname** | `selease-staging` | Just a label. |

Click **Create Droplet**. After about a minute it shows an **IP address**: that's the `203.0.113.10` used in the commands below.

### 0c. A firewall (only web and SSH open)

In DigitalOcean go to **Networking → Firewalls → Create Firewall**. Name it `selease-web` and set these **Inbound rules**:

| Type | Protocol | Port | Sources |
|---|---|---|---|
| SSH | TCP | 22 | All IPv4, All IPv6 |
| HTTP | TCP | 80 | All IPv4, All IPv6 |
| HTTPS | TCP | 443 | All IPv4, All IPv6 |
| Custom | UDP | 443 | All IPv4, All IPv6 (faster HTTPS for phones) |

Leave the outbound rules as they are. Under **Apply to Droplets**, choose `selease-staging`, then click **Create Firewall**.

> Use this DigitalOcean firewall, not Ubuntu's own `ufw`: Docker skips `ufw`'s rules, but it can't skip this one.

### 0d. First sign-in, updates and your own user

From your Mac (the first sign-in is as `root`; type `yes` when asked about the fingerprint):

```bash
ssh root@203.0.113.10
```

Install the latest security updates. This can take a few minutes; if a purple screen asks a question, press Enter to keep the default.

```bash
apt update && apt upgrade -y
```

Make your own user (replace `farooq` with the name you want). It asks you to choose a password, which you'll need for `sudo`. Press Enter through the other questions.

```bash
adduser farooq
```

Give it admin rights, Docker rights and your SSH key:

```bash
usermod -aG sudo,docker farooq && rsync --archive --chown=farooq:farooq ~/.ssh /home/farooq
```

Restart the Droplet so the updates take effect:

```bash
reboot
```

Wait a minute, then **check you can sign in as your own user** (from now on, always use this):

```bash
ssh farooq@203.0.113.10
```

```bash
sudo whoami
```

It should print `root` after asking for your password.

**Only after that works**, switch off direct `root` sign-in (safer):

```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && sudo systemctl restart ssh
```

Your new Droplet is ready. Carry on with **Step 1**, using `farooq` wherever the guide says `youruser`.

---

## Step 1: Check the Droplet

Connect to the Droplet as you normally do:

```bash
ssh youruser@203.0.113.10
```

Then check three things:

```bash
free -h
```
The **Mem total** should be about **4 GB or more**. Each app needs roughly 1–1.5 GB, so 2 GB is too small.

```bash
docker --version && docker compose version
```
Both should print a version. If not, install Docker from https://docs.docker.com/engine/install/ubuntu/ and come back.

```bash
sudo ss -ltnp | grep -E ':(80|443) '
```
- **Nothing printed:** the web ports are free. Carry on.
- **Something printed** (for example PTRP's Caddy or nginx): **stop here and tell Claude what it shows.** Two apps can't both own ports 80/443. We'll set up one shared Caddy, and the PTRP side of that change is done in the PTRP project, not here.

## Step 2: Point the address at the Droplet (DNS)

Where `selease.com`'s DNS is managed, add one record:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `abc-staging` | your Droplet's IP | 300 (or the lowest offered) |

Check it on your Mac after a few minutes. It should print your Droplet's IP:

```bash
dig +short abc-staging.selease.com
```

## Step 3: Make a Spaces bucket for photos

In DigitalOcean go to **Spaces Object Storage → Create Bucket**:
1. Choose the **same region as your Droplet** (for example Singapore `sgp1`).
2. Name it, for example `selease-photos`.
3. Keep **file listing restricted** (private).

Then go to **Spaces Object Storage → Access Keys → Create Access Key**:
1. Give it access to **this bucket only** (read/write/delete).
2. Copy the **Access Key** and **Secret Key** somewhere safe for Step 5. The secret is shown only once.

Note the bucket's **endpoint**, for example `https://sgp1.digitaloceanspaces.com`. It's the region part only, without the bucket name.

> One bucket serves every client. Each client's photos go into its own folder (`abc-staging/`, `abc/`, …).

## Step 4: A deploy user and key for GitHub

GitHub needs its own key to reach the Droplet. Don't reuse your personal key.

**On your Mac:** make the key pair. Press Enter if it asks for a passphrase, because GitHub can't type one.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/sellease_deploy -N "" -C "github-deploy-sellease"
```

Print the **public** half (safe to copy):

```bash
cat ~/.ssh/sellease_deploy.pub
```

**On the Droplet:** create the `deploy` user, let it use Docker, and give it the public key. Replace the quoted text with the line you just printed.

```bash
sudo adduser --disabled-password --gecos "" deploy
```

```bash
sudo usermod -aG docker deploy
```

```bash
sudo mkdir -p /home/deploy/.ssh && echo "PASTE-THE-.pub-LINE-HERE" | sudo tee /home/deploy/.ssh/authorized_keys && sudo chown -R deploy:deploy /home/deploy/.ssh && sudo chmod 700 /home/deploy/.ssh && sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Make the folders SellEase uses:

```bash
sudo mkdir -p /opt/caddy/sites /opt/sellease/abc-staging && sudo chown -R deploy:deploy /opt/caddy /opt/sellease
```

> Being in the `docker` group gives the `deploy` user full control of Docker on this Droplet. That's normal for a deploy user, but only GitHub (with the key above) signs in as `deploy`.

## Step 5: Put the server files in place

**On your Mac**, from the SEAPP folder, copy the files to the Droplet's `/tmp` folder with your usual login:

```bash
cd ~/myDesk/SEAPP && scp deploy/caddy/docker-compose.yml deploy/caddy/Caddyfile youruser@203.0.113.10:/tmp/ && scp deploy/caddy/sites/sellease.caddy.example youruser@203.0.113.10:/tmp/abc-staging.caddy && scp deploy/app/.env.example youruser@203.0.113.10:/tmp/sellease.env
```

**On the Droplet**, move them into place:

```bash
sudo mv /tmp/docker-compose.yml /tmp/Caddyfile /opt/caddy/ && sudo mv /tmp/abc-staging.caddy /opt/caddy/sites/ && sudo mv /tmp/sellease.env /opt/sellease/abc-staging/.env && sudo chown -R deploy:deploy /opt/caddy /opt/sellease && sudo chmod 600 /opt/sellease/abc-staging/.env
```

The site file is already set up for `abc-staging.selease.com`, so you don't need to change it.

Now fill in the settings. First make a database password and copy it:

```bash
openssl rand -hex 24
```

Then open the settings file:

```bash
sudo -u deploy nano /opt/sellease/abc-staging/.env
```

Fill in:
- `POSTGRES_PASSWORD=`: the password you just made.
- `SPACES_ENDPOINT=`: your region's endpoint from Step 3.
- `SPACES_BUCKET=`: the bucket name.
- `SPACES_KEY=` and `SPACES_SECRET=`: the Spaces keys from Step 3.
- Leave `STACK=abc-staging`, `APP_ENVIRONMENT=Staging` and `IMAGE_OWNER=syedgithubproj` as they are.

Save with **Ctrl + O**, then **Enter**, and exit with **Ctrl + X**.

> No Spaces yet? Set `PHOTOS_STORE=Local` and photos are kept on the Droplet instead. You can switch later, but photos uploaded before the switch won't move across.

## Step 6: Start Caddy

On the Droplet:

```bash
cd /opt/caddy && sudo -u deploy docker compose up -d
```

## Step 7: Give GitHub the server details

On your Mac, get the Droplet's fingerprint, so GitHub only ever talks to the real server:

```bash
ssh-keyscan -t ed25519 203.0.113.10
```

On GitHub, open the SEAPP repository → **Settings → Environments → New environment**, name it **`abc-staging`**, then **Add environment secret** four times:

| Secret name | Value |
|---|---|
| `SERVER_HOST` | the Droplet's IP |
| `SERVER_USER` | `deploy` |
| `SERVER_SSH_KEY` | the **private** key: everything printed by `cat ~/.ssh/sellease_deploy`, including the BEGIN and END lines |
| `SERVER_KNOWN_HOSTS` | the line(s) printed by `ssh-keyscan` above |

> The private key never leaves your Mac except into this GitHub secret. Don't paste it anywhere else.

## Step 8: Deploy, set up the database, load demo data

On GitHub, open **Actions** and run these three, one after another. For each one: click it in the list, then **Run workflow**, choose `abc-staging`, and **Run workflow** again. Wait for a green tick before starting the next.

1. **Deploy**: builds the app and starts it on the Droplet. The first time takes about 5–10 minutes.
2. **Migrate database**: creates the tables and the basics (roles, categories, settings).
3. **Staging tools** with action `load-demo`: adds the demo designs, factories and customers.

## Step 9: Create your Admin account

On the Droplet, as the deploy user. Replace `farooq` and the name with your own; the username can also be your phone number.

```bash
sudo -u deploy /opt/sellease/abc-staging/sellease.sh create-admin farooq "Your Full Name"
```

It asks for a password twice and doesn't show what you type. Use at least 8 characters, and don't reuse a password from somewhere else.

## Step 10: Try it

Open **https://abc-staging.selease.com** on your phone and laptop:
1. Sign in with the Admin account from Step 9.
2. **Users & roles → Add staff member** for each person who should try it. Tell them their first password in person.
3. Open a design, **Edit design → Add photo**, and check the photo appears. This confirms Spaces works.

---

## Every time there's new work to try

After you've pushed the new work (`git push origin main`):
1. **Actions → Deploy** → `abc-staging`.
2. **Actions → Migrate database** → `abc-staging`. It's safe to run even when nothing changed, and Claude will tell you when it's needed.

## Wiping staging

**Actions → Staging tools**:
1. Choose action `wipe-staging`.
2. In the confirm box, type exactly **`WIPE abc-staging`**.
3. Run it.

This **deletes everything on staging**: designs, customers, factories and all staff accounts. Afterwards, repeat **Step 9** to create your Admin account, and run `load-demo` again if you want the demo data back. Photos already in Spaces stay there (unused), and nothing on any other server is touched.

The app itself refuses `load-demo` and `wipe-staging` on any server whose `.env` doesn't say `APP_ENVIRONMENT=Staging`.

## If something goes wrong

- **The site doesn't open, or there's a certificate warning:** the DNS record (Step 2) may not have spread yet. Wait 10 minutes and check `dig` again. Caddy's messages: `cd /opt/caddy && sudo -u deploy docker compose logs --tail 50 caddy`
- **What's running:** `sudo -u deploy /opt/sellease/abc-staging/sellease.sh status`
- **Recent API messages:** `sudo -u deploy /opt/sellease/abc-staging/sellease.sh logs`
- **A workflow failed:** open it on GitHub, click the red step, and send Claude the error text. **Remove any password or key first.**
