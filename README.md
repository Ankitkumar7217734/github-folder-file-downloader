# GitHub Folder & File Downloader

A simple, client-side web page that lets you download a specific file or folder from a GitHub repository instead of cloning the entire repo.

## Live demo

https://ankitkumar7217734.github.io/github-folder-file-downloader/

## How to use

1. Open the live demo or `index.html` in any modern browser.
2. Paste a GitHub URL pointing to either a file or a folder, for example:
   - Folder: `https://github.com/owner/repo/tree/main/src/components`
   - File: `https://github.com/owner/repo/blob/main/README.md`
3. Click **Download**.

## What it does

- **Files**: Fetches the raw file content through the GitHub API and downloads it directly.
- **Folders**: Uses the GitHub Git Trees API to list every file under the folder, downloads each file in parallel batches, and packages them into a ZIP archive.

## Notes

- Works out of the box for **public repositories** without authentication.
- GitHub API rate limits apply (60 requests per hour for unauthenticated requests).
- Large folders may take a little time because files are fetched individually.
- No server or build step is required; everything runs in the browser.
