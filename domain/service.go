package domain

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strings"

	"github.com/gin-gonic/gin"

	"my-tools/domain/utils"

	"my-tools/config"
)

// Register 注册
func Register(app *gin.Engine) {

	r := app.Group("/domain")

	// 创建一个路由处理程序，用于加载 HTML 页面
	r.GET("", func(c *gin.Context) {
		data, ok := config.AppConfig.Htmls["domain.html"]
		if !ok {
			c.AbortWithError(500, fmt.Errorf("Html not found"))
		} else {
			c.Data(200, "", data)
		}
	})

	r.POST("/check", func(c *gin.Context) {
		// 获取前端发送的域名和token参数
		domains := c.PostForm("domain")
		token := c.PostForm("token")

		if domains == "" {
			c.String(http.StatusBadRequest, "domain is empty")
			return
		}

		// 域名按照逗号分隔
		domainsArr := strings.Split(domains, ",")

		if len(domainsArr) < 2 {
			// 按照换行分隔
			domainsArr = strings.Split(domains, "\n")
		}

		var domainsResult []*DomainCheckResult
		for _, domain := range domainsArr {
			domain = strings.TrimSpace(domain)
			var results []*CheckResult

			if domain == "" || !utils.ValidateDomain(domain) {
				domainsResult = append(domainsResult, &DomainCheckResult{
					Domain:   domain,
					Analysis: "这不是一个正常的域名或IP",
				})
				continue
			}

			// 移除前缀 *.
			if strings.HasPrefix(domain, "*.") {
				domain = strings.TrimPrefix(domain, "*.")
			}

			content := getDomainContent(domain, "https")
			results = append(results, content)

			content = getDomainContent(domain, "http")
			results = append(results, content)

			if token != "" {
				content = getProxyContent(domain, token)
				results = append(results, content)
			}

			domainsResult = append(domainsResult, &DomainCheckResult{
				Domain:   domain,
				Result:   results,
				Analysis: "暂未实现，请联系人工处理",
			})
		}

		data, err := json.Marshal(domainsResult)
		if err != nil {
			c.AbortWithError(500, err)
		} else {
			c.Data(200, "application/json", data)
		}

	})
}

type DomainCheckResult struct {
	Domain   string         `json:"domain"`
	Result   []*CheckResult `json:"result"`
	Analysis string         `json:"analysis"`
}

type CheckResult struct {
	Name    string `json:"name"`
	Content string `json:"content"`
	Err     error  `json:"err"`
	Cmd     string `json:"cmd"`
}

func getProxyContent(domain string, token string) *CheckResult {
	// 使用curl命令获取数据
	cmd := exec.Command("curl", "-i", "-H", fmt.Sprintf("X-CMC-DCV-Host:%s", domain), fmt.Sprintf("https://file.httpsauto.com/.well-known/pki-validation/%s.txt", token))
	output, err := cmd.CombinedOutput()

	return &CheckResult{
		Name:    "代理结果",
		Content: string(output),
		Err:     err,
		Cmd:     cmd.String(),
	}
}

func getDomainContent(domain string, proto string) *CheckResult {
	// 使用curl命令获取数据
	cmd := exec.Command("curl", "-i", fmt.Sprintf("%s://%s/.well-known/pki-validation/gsdv.txt", proto, domain))
	output, err := cmd.CombinedOutput()
	return &CheckResult{
		Name:    proto + "结果",
		Content: string(output),
		Err:     err,
		Cmd:     cmd.String(),
	}
}
