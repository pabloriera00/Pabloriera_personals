# Pabloriera_personals

Personal projects repository.

## 🌐 Live Site (GitHub Pages)

Once Pages is enabled, your site will be available at:

https://pabloriera00.github.io/Pabloriera_personals/

## 🚀 How to enable GitHub Pages

1. Go to **Settings** in this repository.
2. Click **Pages** in the left sidebar.
3. Under **Build and deployment**:
	 - **Source**: `Deploy from a branch`
	 - **Branch**: `main`
	 - **Folder**: `/ (root)` (or `/docs` if your site files are there)
4. Save and wait a few minutes.

## ✅ Commit and push changes

```bash
git add README.md
git commit -m "Update README with GitHub Pages setup"
git push origin main
```

## 🛠 If commit fails

If Git says identity is missing, run:

```bash
git config --global user.name "pabloriera00"
git config --global user.email "priera1@lsu.edu"
```

Then retry commit/push.

## 📁 Notes

- If this is a React/Vite app, you may need to set a base path:
	- Vite: `base: "/Pabloriera_personals/"`
	- CRA: `"homepage": "https://pabloriera00.github.io/Pabloriera_personals"`
