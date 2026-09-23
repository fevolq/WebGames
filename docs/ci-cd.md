# CI 与镜像发布

GitHub Actions 工作流位于 `.github/workflows/check.yml`，在 Actions 中显示为 **CI / Docker image**。

## 触发方式

| 事件 | 构建与检查 | 发布到 GHCR |
| --- | --- | --- |
| 推送到 `main` | 是 | `latest`、`sha-<完整提交 SHA>` |
| 推送 `v*` 标签，例如 `v1.0.0` | 是 | `v1.0.0`、`sha-<完整提交 SHA>` |
| 向 `main` 提交 PR（含 fork） | 是 | 否 |
| 手动运行，选择 `main` 或 `v*` 标签 | 是 | 使用对应分支或标签的规则 |
| 手动运行，选择其他分支 | 是 | 否 |

版本标签不会覆盖 `latest`；`latest` 始终由主分支构建更新。相同 Git ref 的新运行会取消尚未完成的旧运行。

## 验证与发布顺序

1. 使用 Node.js 24 和锁文件安装依赖，执行 `npm run check`。
2. 校验 Docker Compose 配置，再使用项目的多阶段 Dockerfile 构建 `linux/amd64` 镜像，复用 GitHub Actions 构建缓存。
3. 从镜像启动 Nginx，验证所有游戏路由、懒加载资源、资源内容、MIME、缓存策略与真实 404。检查所用的构建清单从镜像中提取。
4. 验证通过后，将镜像导出为短期工作流产物，再交给独立发布任务推送。同一份镜像只构建一次，发布阶段不重新构建。

检查任务仅有 `contents: read` 权限；发布任务仅在允许的推送或手动事件中运行，并获得 `packages: write`。发布通过 GitHub 自动提供的 `GITHUB_TOKEN` 登录 GHCR，不需要另外配置 Docker Hub 凭据或个人令牌。

发布目标根据当前 GitHub 仓库自动生成并转为小写。本仓库为 `ghcr.io/fevolq/webgames`。发布完成后，可在该次 Actions 运行的摘要中查看完整镜像标签。

## 使用镜像

项目的 `docker-compose.yaml` 默认使用 `ghcr.io/fevolq/webgames:latest`。在该文件所在目录执行：

```sh
docker compose up -d
```

服务默认监听宿主机的 `8080` 端口。每次执行上述命令都会拉取所选镜像，有更新时重建容器；无需在服务器构建源码。当前发布的镜像支持 `linux/amd64`。

可通过环境变量或同目录的本地 `.env` 文件覆盖端口和完整镜像地址，例如：

```dotenv
PORT=8081
WEBGAMES_IMAGE=ghcr.io/fevolq/webgames:v1.0.0
```

版本标签需先由 CI 发布，也可以使用 `ghcr.io/fevolq/webgames:sha-<完整提交 SHA>` 固定到某次构建。修改后重新执行 `docker compose up -d`。本地 `.env` 不提交到仓库。

查看日志使用 `docker compose logs -f`，停止并移除容器使用 `docker compose down`。当前流程交付容器镜像，服务器需要执行上述命令完成部署或更新。

GHCR 首次创建的包默认私有。如需匿名拉取，在 GitHub Packages 的包设置中将可见性设为公开；保留私有时，部署机器需要先使用具有该包读取权限的凭据登录 GHCR。如果组织限制了 Actions 的包写入权限，或同名包由其他来源创建，需要在仓库或包设置中允许此仓库的 Actions 发布。

工作流使用 GitHub 与 Docker 的官方 Actions，参考 [GitHub 的镜像发布文档](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images) 和 [GHCR 使用说明](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)。
