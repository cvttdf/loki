const GITHUB_REPO = 'cvttdf/loki'

export interface UpdateInfo {
  version: string
  htmlUrl: string
  publishedAt: string
  body: string
}

export function isNewer(current: string, latest: string): boolean {
  const cur = current.startsWith('v') ? current.slice(1) : current
  const lat = latest.startsWith('v') ? latest.slice(1) : latest
  const curParts = cur.split('.').map(Number)
  const latParts = lat.split('.').map(Number)
  const len = Math.max(curParts.length, latParts.length)
  for (let i = 0; i < len; i++) {
    const c = curParts[i] ?? 0
    const l = latParts[i] ?? 0
    if (l > c) return true
    if (l < c) return false
  }
  return false
}

export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
  try {
    const resp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
    if (!resp.ok) return null
    const release = await resp.json() as {
      tag_name: string
      html_url: string
      published_at: string
      body: string
    }
    const latestVersion = release.tag_name
    if (!isNewer(currentVersion, latestVersion)) return null
    return {
      version: latestVersion.startsWith('v') ? latestVersion.slice(1) : latestVersion,
      htmlUrl: release.html_url,
      publishedAt: release.published_at,
      body: (release.body ?? '').slice(0, 500),
    }
  } catch {
    return null
  }
}
