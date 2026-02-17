# Running on Unraid (Docker) & updating from your local machine

This app runs on your **Unraid server** in Docker. Code lives on your **local machine** and in a **Git host** (e.g. GitHub); Unraid gets updates by pulling from that Git host (or by pulling a pre-built image from a registry).

---

## How the code flows

```
┌─────────────────┐      git push       ┌─────────────────┐      git pull       ┌─────────────────┐
│  Your computer  │ ─────────────────► │  GitHub/GitLab  │ ◄───────────────── │  Unraid server  │
│  (where you     │                    │  (remote repo)  │                    │  (Docker runs   │
│   edit code)    │                    │                 │                    │   the app)      │
└─────────────────┘                    └─────────────────┘                    └─────────────────┘
```

- You develop and push from your **local machine**.
- The **remote repo** (GitHub, GitLab, etc.) is the single source of truth.
- **Unraid** clones that repo once, then runs `git pull` when you want to update, rebuilds the image, and restarts the container.

So the first thing you need is: **put this project on a Git remote** so Unraid can pull from it.

---

## Part 1: Your local machine — get the code on a Git host

If the project is only on your PC right now, do this once:

1. **Create a repo on GitHub (or GitLab, etc.)**  
   e.g. `https://github.com/yourusername/body-health-app`

2. **In your project folder on your PC**, init Git (if not already) and add the remote:
   ```powershell
   cd D:\dev\body-health-app
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/body-health-app.git
   git push -u origin main
   ```
   Use your real repo URL. If you already have a remote, just make sure you push:
   ```powershell
   git push origin main
   ```

3. **Whenever you change the app**, push from your machine. Either run:
   ```powershell
   npm run push
   ```
   (uses the default commit message “Updates”), or with your own message:
   ```powershell
   npm run push -- "Describe your change"
   ```
   Or do it manually:
   ```powershell
   git add .
   git commit -m "Describe your change"
   git push origin main
   ```
   After that, you’ll update the app on Unraid by pulling and rebuilding there (see Part 3).

---

## Part 2: Unraid server — prerequisites

Do this once on Unraid.

### 2.1 Docker Compose

Unraid doesn’t ship with Docker Compose. Use the **Docker Compose Manager** plugin:

1. In Unraid: **Apps** → search **“Docker Compose Manager”** → **Install**.
2. After install you can run `docker compose` from the Unraid **Terminal** (or over SSH).

### 2.2 Git (so Unraid can clone/pull your repo)

You need `git` on Unraid only if you want to **build the image on Unraid** from the repo (Option A below).

- **Unraid 6.10 and earlier:** **NerdTools** (Community Applications) → enable **git**.
- **Unraid 6.11+:** NerdPack/NerdTools changed; use **un-get** or another method from the Unraid forums to install `git` if you follow Option A.

If you use **Option B** (build image on your PC or in CI and push to a registry), Unraid only needs to pull an image — **no git on Unraid**.

### 2.3 Where to put the project on Unraid

A good place is under appdata, e.g.:

- **Path:** `/mnt/user/appdata/body-health-app`

You’ll put the repo (and thus the Dockerfile and `docker-compose.yml`) here so Docker Compose can build and run the container.

---

## Part 3: Unraid — two ways to run and update

### Option A: Build on Unraid (clone repo, then pull to update)

Unraid holds the repo, runs `git pull`, then builds the image and starts the container. Requires **git on Unraid** and **Docker Compose Manager**.

#### First-time setup on Unraid

1. Open **Unraid Terminal** (or SSH into Unraid).

2. Create the app directory and clone your repo (use your real repo URL):
   ```bash
   mkdir -p /mnt/user/appdata/body-health-app
   cd /mnt/user/appdata/body-health-app
   git clone https://github.com/yourusername/body-health-app.git .
   ```
   (The `.` at the end clones into the current folder so the Dockerfile and `docker-compose.yml` are in `/mnt/user/appdata/body-health-app`.)

3. Build and start the container:
   ```bash
   docker compose up -d --build
   ```

4. Open the app in a browser: **http://&lt;unraid-ip&gt;:8080**  
   (Replace `<unraid-ip>` with your Unraid server’s IP or hostname.)

#### Updating when you’ve pushed new code from your PC

On Unraid (Terminal or SSH), from the project directory:

```bash
cd /mnt/user/appdata/body-health-app
git pull
docker compose build --no-cache
docker compose up -d
```

Or use the script (make it executable once):

```bash
chmod +x /mnt/user/appdata/body-health-app/scripts/update-and-restart.sh
/mnt/user/appdata/body-health-app/scripts/update-and-restart.sh
```

So the process is: **edit on PC → push to GitHub → on Unraid run the three commands above (or the script)**.

---

### Option B: Build image elsewhere, Unraid only runs the image (no git on Unraid)

You build the Docker image on your **local machine** (or in GitHub Actions), push it to **Docker Hub** or **GitHub Container Registry**, and Unraid only pulls and runs that image. Unraid never needs git or the source code.

#### One-time: create a registry repo and push from your PC

1. Create a repo on **Docker Hub** (e.g. `yourusername/body-health-app`) or use **GitHub Container Registry** (e.g. `ghcr.io/yourusername/body-health-app`).

2. On your **local machine** (in the project folder), build and push (example for Docker Hub):
   ```powershell
   cd D:\dev\body-health-app
   docker build -t yourusername/body-health-app:latest .
   docker push yourusername/body-health-app:latest
   ```
   Log in first if needed: `docker login`.

3. On Unraid you’ll add a container that uses **this image** (see below). No clone, no Dockerfile on Unraid.

#### First-time setup on Unraid (Option B)

1. **Docker** tab → **Add Container**.
2. **Name:** e.g. `body-health-app`.
3. **Repository:** `yourusername/body-health-app` (or `ghcr.io/yourusername/body-health-app` for GHCR).
4. **Tag:** `latest` (or leave default).
5. **Network:** Bridge.
6. **Port:** e.g. **8080** (host) → **80** (container).
7. **Restart policy:** e.g. “Unless stopped”.
8. **Apply** to create and start.

App URL: **http://&lt;unraid-ip&gt;:8080**.

#### Updating (Option B)

1. On your **PC**, after changing code:
   ```powershell
   cd D:\dev\body-health-app
   git add .
   git commit -m "Your changes"
   git push origin main
   docker build -t yourusername/body-health-app:latest .
   docker push yourusername/body-health-app:latest
   ```
2. On **Unraid**: **Docker** → find **body-health-app** → **Force update** (or stop, then **Check for updates** and start). That pulls the new image and restarts the container.

So: **push code → build & push image from PC → Unraid “Force update”**.

---

## Summary

| | Option A: Build on Unraid | Option B: Image from registry |
|--|---------------------------|--------------------------------|
| **Code on Unraid?** | Yes (cloned repo) | No |
| **Git on Unraid?** | Yes | No |
| **Where build runs** | Unraid | Your PC (or CI) |
| **Update step on Unraid** | `git pull` + `docker compose build` + `up -d` (or script) | Force update / pull new image |
| **Update step on PC** | Just `git push` | `git push` + build image + `docker push` |

- **Option A** is good if you’re fine using the Unraid terminal and want a single “push code then run a script on Unraid” flow.
- **Option B** is good if you prefer not to install git on Unraid and are okay building and pushing the image from your PC (or from CI) when you release.

---

## Unraid paths and scripts reference

- **Suggested app directory:** `/mnt/user/appdata/body-health-app`
- **Update script (Option A):** `scripts/update-and-restart.sh` (run from Unraid after `chmod +x`).
- **Port:** host **8080** → container **80** (change in `docker-compose.yml` or in the container template if using Option B).

If you tell me whether you prefer Option A (build on Unraid) or Option B (image from registry), I can give you a minimal “cheat sheet” of only the commands you’ll use.
