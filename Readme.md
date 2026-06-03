# my-tools

本项目是一个本地运行的 Web 工具箱，当前形态是 **Go + Gin 托管静态页面，纯文本工具在浏览器端实现**。

## 目标

- 把常用文本处理、编码转换、证书/CSR 查看能力统一到一个本地网页里。
- 纯文本工具默认纯前端实现，不依赖后端 API。
- 用户输入在浏览器端处理，避免上传到服务端或被服务器持久化留存。
- 保持项目简单：无前端打包器、无 npm 运行时依赖、便于本地使用和测试。

## 快速开始

```shell
go run ./cmd/mytools
```

默认监听：`http://127.0.0.1:8111`

健康检查：

- `GET /healthz`

## 当前工具

- JSON 格式化/压缩：支持从日志行或混杂文本中提取 JSON 后处理。
- Base64 编解码：按 UTF-8 文本处理。
- URL 编解码：处理 URL percent-encoding。
- PG Array 转换：把换行、逗号或空格分隔的一串 ID 转成 PostgreSQL 查询片段。
- CSR 格式化/解析：规范化 PEM，展示 Subject、SAN、公钥和签名算法等字段。
- 证书格式化/解析：拆分证书链，展示 Subject、Issuer、有效期、序列号、SHA1、公钥和签名算法等字段。

## 纯前端实现约束

新增纯文本工具时，默认放在前端实现：

- 工具纯函数放在 `web/static/utils.js`。
- 页面交互、DOM 更新、状态保存放在 `web/static/app.js`。
- 对应单元测试放在 `web/static/utils.test.js`。
- HTML 页面直接按顺序引入 `utils.js` 和 `app.js`，不引入打包器。
- 工具处理过程不得把输入内容发送到后端 API，除非该工具明确声明需要服务端能力。
- 浏览器侧可以按功能需要使用 `sessionStorage` 保存当前会话的临时页面状态；这些内容不应传给服务端。

证书/CSR 规范化规则：

- 兼容 `\\r\\n` / `\\n` / `\r\n` / `\r`，统一输出为 `\n`。
- 自动提取 PEM header/footer 中间的 body。
- 去掉 body 中的空白字符。
- 按 64 字符换行输出。
- 输出始终带对应 PEM header/footer，且末尾带一个 `\n`。

证书和 CSR 的基础 ASN.1/X.509 解析也在前端完成。SM2/国密能力后续可以通过前端库或 WASM 扩展，不引入服务端依赖。

## 项目结构

```text
cmd/mytools/                 # 程序入口
internal/server/             # Gin engine、静态页面路由、健康检查
internal/api/http/           # 预留的统一响应结构
internal/api/v1/             # 预留的 v1 API 路由聚合
web/static/index.html        # 首页
web/static/*.html            # 各工具页面
web/static/app.js            # 页面交互逻辑
web/static/utils.js          # 纯前端工具函数
web/static/utils.test.js     # 纯前端工具单元测试
web/static/style.css         # 样式
```

## 测试

```shell
node --check web/static/utils.js
node --check web/static/app.js
node --test web/static/utils.test.js
go test ./...
```

## Build

Linux amd64 示例：

```shell
CGO_ENABLED=0 GO111MODULE=on GOOS=linux GOARCH=amd64 go build -o dist/mytools-linux-amd64 ./cmd/mytools
```

本地构建：

```shell
go build ./cmd/mytools
```

## 后续方向

- 继续补纯前端文本工具，例如时间戳、Hash、文本去重排序。
- 证书/CSR 解析层补充更多 OID 和扩展字段。
- 评估通过前端库或 WASM 支持 SM2/SM3/国密验签。
- 端口、静态资源目录等运行参数支持配置化。
