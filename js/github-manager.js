class GitHubManagerClass {
  constructor() {
    this.apiBase = 'https://api.github.com';
    this.tokenKey = 'github_oauth_token';
  }
  get token() { return localStorage.getItem(this.tokenKey); }
  set token(v) { localStorage.setItem(this.tokenKey, v); }

  async authenticate() {
    const existing = this.token;
    if (existing) return { ok: true, token: existing, cached: true };
    const token = prompt('Enter GitHub Personal Access Token (repo,gist scopes):');
    if (!token) return { ok: false, error: 'Authentication cancelled' };
    this.token = token.trim();
    return { ok: true, token: this.token };
  }

  async request(path, options = {}) {
    if (!this.token) await this.authenticate();
    const res = await fetch(`${this.apiBase}${path}`, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${this.token}`,
        ...(options.headers || {})
      }
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.status === 204 ? {} : res.json();
  }

  listRepos() { return this.request('/user/repos?per_page=100&sort=updated'); }
  cloneRepo(repoUrl, localPath = '/repos') { return window.DragonCheerpX.execute(`cd ${localPath} && git clone ${repoUrl}`); }
  commitChanges(message) { return window.DragonCheerpX.execute(`git add . && git commit -m ${JSON.stringify(message)}`); }
  pushChanges() { return window.DragonCheerpX.execute('git push'); }
  createRepo(name, description = '') { return this.request('/user/repos', { method: 'POST', body: JSON.stringify({ name, description, private: false }) }); }
  createGist(files, description = '') { return this.request('/gists', { method: 'POST', body: JSON.stringify({ description, public: false, files }) }); }
}
window.GitHubManager = new GitHubManagerClass();
