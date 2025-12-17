# my-tools
 
 本项目是一个本地运行的 Web 工具箱（Go + Gin）。
 
 目标：
 
 - 把常用的证书/订单/账单等工具能力统一到一个本地网页里
 - 后端负责业务逻辑与调用本地 CLI，前端仅负责展示与交互
 - 单人自用优先：简单、可扩展、可测试
 
 ## 快速开始
 
 ### 启动服务
 
 ```shell
 go run ./cmd/mytools
 ```
 
 默认监听：`http://127.0.0.1:8111`
 
 健康检查：
 
 - `GET /healthz`
 
 ### CSR 格式化（JSON -> PEM）
 
 API：
 
 - `POST /api/v1/csr/format`
 
 Request JSON：
 
 ```json
 {
   "csr": "-----BEGIN CERTIFICATE REQUEST-----\\r\\nMIID...\\r\\n-----END CERTIFICATE REQUEST-----\\r\\n"
 }
 ```
 
 Response JSON：
 
 ```json
 {
   "ok": true,
   "data": {
     "pem": "-----BEGIN CERTIFICATE REQUEST-----\nMIID...\n-----END CERTIFICATE REQUEST-----\n"
   }
 }
 ```
 
 CSR 规范化规则（当前实现）：
 
 - 兼容 `\\r\\n` / `\\n` / `\r\n` / `\r`，统一输出为 `\n`
 - 自动提取 header/footer 中间的 body（如果存在）
 - 去掉 body 中的空白字符（空格、tab、换行）
 - 按 64 字符换行输出
 - 输出始终带 CSR header/footer，且末尾带一个 `\n`

 ## 设计思路（简化版）

 这个项目采用一个很“朴素”的分层，目的是让后续不断加工具时不容易乱：

 - **domain（领域/业务规则）**：放“跟业务有关、跟技术无关”的纯逻辑与模型。
   - 例如 CSR 的规范化、订单状态约束、账单参数规则等。
   - 特点：尽量不依赖 `gin` / `net/http` / `os/exec`，更容易写单测。
 - **api（接口层）**：处理 HTTP 的输入输出，把请求参数转换成 domain 需要的输入，把 domain 输出转换成 JSON 响应。
   - 例如 `ShouldBindJSON`、返回统一的 `{ok,data,error}`。
 - **infra（基础设施）**：跟“外部世界”打交道的实现。
   - 例如后面要做的本地 CLI 执行封装（超时、stdout/stderr、exit code 等）。

 简单理解：

 - **domain** 决定“怎么做才算对”
 - **api** 负责“怎么对外提供服务”
 - **infra** 负责“怎么调用系统能力/外部工具”
 
 ## 项目结构（骨架）
 
 ```text
 cmd/mytools/                 # 程序入口
 internal/server/             # gin engine、路由组装
 internal/api/http/           # 统一响应结构
 internal/api/v1/             # v1 路由聚合
 internal/api/v1/csr/         # CSR 功能（HTTP + Service + DTO）
 internal/domain/csr/         # CSR 领域纯逻辑（可单测）
 internal/infra/execx/        # （规划中）统一 CLI 执行封装
 web/static/                  # （规划中）静态网页
 ```
 
 ## 测试
 
 当前推荐仅跑新骨架相关测试：
 
 ```shell
 go test ./internal/...
 ```
 
 ## Build
 
 你可以按目标系统交叉编译：
 
 ```shell
 CGO_ENABLED=0 GO111MODULE=on GOOS=linux GOARCH=amd64 go build ./cmd/mytools
 ```
 
 ## Roadmap（下一步规划）
 
 ### 1. 统一 CLI Runner（execx）
 
 - 提供通用执行能力：超时、stdout/stderr 捕获、exit code、输出大小限制、工作目录、env
 - 业务模块禁止直接 `os/exec`，统一走 `execx`
 
 ### 2. 导出账单工具（调用本地 CLI）
 
 - `POST /api/v1/billing/export`
 - 先做同步导出（快），如需要再升级异步任务
 
 ### 3. Setigo 订单查询/操作工具（调用本地 CLI）
 
 - 查询：`GET /api/v1/setigo/orders` / `GET /api/v1/setigo/orders/{id}`
 - 操作：`POST /api/v1/setigo/orders/{id}:action`
 
 ### 4. Web UI
 
 - 首页：工具列表 + 搜索
 - 每个工具一个页面：输入区、输出区、复制/下载
 
 ### 5. 配置化
 
 - 端口、CLI 路径、默认超时、工作目录等支持通过 env/flag/yaml 配置