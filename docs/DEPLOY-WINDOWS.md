# Deploy to GitHub from a Windows 11 Pro terminal

Push this build to `https://github.com/Sangam-Info/Shree-Giriraj-Textile`
using git in **Windows Terminal (PowerShell)** — no web file uploads.

---

## One-time: install the tools (skip any you already have)
Open **Windows Terminal** (PowerShell) and run:
```powershell
winget install --id Git.Git -e
winget install --id GitHub.cli -e
```
Close and reopen the terminal so `git` and `gh` are on PATH.

Sign in to GitHub once (opens a browser):
```powershell
gh auth login
```
Choose: GitHub.com → HTTPS → "Login with a web browser".

---

## Push the build

1. Unzip the delivered `Shree-Giriraj-Textile-repo.zip` somewhere, e.g. `C:\dev\`.
   You get a folder `shree-giriraj-textile` that already contains a git commit.

2. In the terminal, go into it and point it at the repo, then push:
```powershell
cd C:\dev\shree-giriraj-textile

git remote add origin https://github.com/Sangam-Info/Shree-Giriraj-Textile.git
git branch -M main
git push -u origin main
```

### If the push is rejected ("updates were rejected" / remote has a README)
The repo already had a commit (e.g. an auto-created README). Merge it in, then push:
```powershell
git pull origin main --allow-unrelated-histories --no-edit
git push -u origin main
```
If a file conflicts (usually `README.md`), keep this project's version:
```powershell
git checkout --ours README.md
git add README.md
git commit --no-edit
git push -u origin main
```

Done — refresh the repo page; all files are there.

---

## From now on (ongoing flow — terminal only)
- When Claude pushes updates (after you link GitHub to the chat), just pull:
  ```powershell
  cd C:\dev\shree-giriraj-textile
  git pull
  ```
- When you make local changes, push them:
  ```powershell
  git add .
  git commit -m "your message"
  git push
  ```

> Tip: once the repo is on GitHub, connect it to **Cloudflare Pages** (Workers & Pages →
> Create → Pages → Connect to Git). After that, every `git push` to `main` auto-deploys
> the live site — see `docs/SETUP.md`.
