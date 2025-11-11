# GitHub Actions Workflows

## 📦 docker-build.yml

自动构建和推送 Docker 镜像到 GitHub Container Registry (ghcr.io)。

### 触发条件

| 事件 | 分支/标签 | 操作 |
|------|----------|------|
| `push` | `main`, `master` | 构建并推送镜像（标签：`latest`） |
| `push` | 其他分支 | 构建并推送镜像（标签：分支名） |
| `push` | tags `v*.*.*` | 构建并推送镜像（多个语义化版本标签） |
| `pull_request` | `main`, `master` | 仅构建（不推送） |
| `workflow_dispatch` | 任意 | 手动触发 |

### 生成的镜像标签

创建 tag `v1.2.3` 会生成：
- `ghcr.io/USER/REPO:v1.2.3`
- `ghcr.io/USER/REPO:v1.2`
- `ghcr.io/USER/REPO:v1`
- `ghcr.io/USER/REPO:latest` （如果是默认分支）

推送到 `main` 分支会生成：
- `ghcr.io/USER/REPO:latest`
- `ghcr.io/USER/REPO:main`
- `ghcr.io/USER/REPO:main-abc1234` （commit SHA）

### 首次使用设置

1. **启用 GitHub Packages 权限**
   ```
   仓库 Settings → Actions → General → Workflow permissions
   选择 "Read and write permissions"
   点击 "Save"
   ```

2. **（可选）设置 Secrets**
   如果需要推送到其他镜像仓库（如 Docker Hub）：
   ```
   仓库 Settings → Secrets and variables → Actions
   添加：
   - DOCKERHUB_USERNAME
   - DOCKERHUB_TOKEN
   ```

3. **推送代码触发构建**
   ```bash
   git add .
   git commit -m "feat: 添加 Docker 支持"
   git push origin main
   ```

4. **查看构建状态**
   - 进入仓库的 **Actions** 页面
   - 点击 "Build and Push Docker Image" workflow
   - 查看构建日志

5. **手动触发构建**
   - 进入 Actions 页面
   - 选择 "Build and Push Docker Image"
   - 点击 "Run workflow"
   - 选择分支并运行

### 镜像拉取

构建完成后，可以使用以下命令拉取镜像：

```bash
# 拉取最新版本
docker pull ghcr.io/YOUR_USERNAME/amazon-auto:latest

# 拉取特定版本
docker pull ghcr.io/YOUR_USERNAME/amazon-auto:v1.0.0

# 拉取特定分支
docker pull ghcr.io/YOUR_USERNAME/amazon-auto:main
```

### 镜像可见性设置

默认情况下，镜像是私有的。如果要公开：

1. 进入 `https://github.com/users/YOUR_USERNAME/packages/container/amazon-auto`
2. 点击 "Package settings"
3. 在 "Danger Zone" 中点击 "Change visibility"
4. 选择 "Public"

### 多平台支持

workflow 配置为构建多平台镜像：
- `linux/amd64` - x86_64 服务器（Intel/AMD）
- `linux/arm64` - ARM 服务器（AWS Graviton, Apple Silicon）

### 构建缓存

使用 GitHub Actions 缓存（`gha`）加速后续构建：
- 第一次构建：较慢（约 5-10 分钟）
- 后续构建：较快（约 2-5 分钟）

### 故障排查

#### 权限错误
```
Error: buildx failed with: ERROR: failed to solve: failed to push...
```
**解决**：检查 Workflow permissions 是否设置为 "Read and write permissions"

#### 磁盘空间不足
```
ERROR: failed to solve: failed to compute cache key: failed to calculate checksum...
```
**解决**：GitHub Actions 提供的磁盘空间通常足够，如果遇到问题可以清理构建缓存

#### 构建超时
**解决**：GitHub Actions 免费版有构建时间限制（6小时），通常不会超时

### 监控构建

可以添加构建状态徽章到 README.md：

```markdown
[![Docker Build](https://github.com/YOUR_USERNAME/amazon-auto/actions/workflows/docker-build.yml/badge.svg)](https://github.com/YOUR_USERNAME/amazon-auto/actions/workflows/docker-build.yml)
```

### 高级配置

如需自定义 workflow，可以修改 `.github/workflows/docker-build.yml`：

- 修改触发分支
- 添加测试步骤
- 推送到多个镜像仓库
- 添加通知（Slack, Discord 等）
- 自动部署到服务器

## 📚 相关文档

- [DEPLOYMENT.md](../../DEPLOYMENT.md) - 完整部署指南
- [README.md](../../README.md) - 项目说明
- [Dockerfile](../../Dockerfile) - Docker 镜像配置
- [docker-compose.yml](../../docker-compose.yml) - Docker Compose 配置

