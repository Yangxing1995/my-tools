package csrfmt

import (
	"html/template"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"my-tools/conf"
)

// PageData 结构用于传递数据到 HTML 模板中
type PageData struct {
	OutputText   string
	RouterPrefix string
}

const (
	routerPrefix = "/csr"
)

func Register(app *gin.Engine) {
	r := app.Group(routerPrefix)

	r.GET("", func(c *gin.Context) {

		w := c.Writer
		// 默认展示页面
		renderTemplate(w, "csr.html", PageData{})
	})

	r.POST("/", func(c *gin.Context) {
		r := c.Request
		w := c.Writer

		r.ParseForm()

		inputText := r.FormValue("inputText")
		outputText := processText(inputText)

		data := PageData{
			OutputText: outputText,
		}

		renderTemplate(w, "csr.html", data)
		return
	})
}

func processText(inputText string) string {
	// 处理文本，根据需求替换换行符

	if strings.Contains(inputText, "\r\n") {
		// 用户粘贴文本后，把文本中换行符替换成\n
		inputText = strings.ReplaceAll(inputText, "\r\n", "\\n")
	} else if strings.Contains(inputText, "\\n") {
		// 用户粘贴文本后，把文本中\n替换成换行符
		inputText = strings.ReplaceAll(inputText, "\\n", "\r\n")
	}

	return inputText
}

func renderTemplate(w http.ResponseWriter, tmplName string, data PageData) {
	htmlData, ok := conf.AppConfig.Htmls[tmplName]

	if !ok {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Html not found"))
		return
	}

	tmpl, err := template.New(tmplName).Parse(string(htmlData))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data.RouterPrefix = routerPrefix

	err = tmpl.Execute(w, data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// 整行的CSR改成每行的
func formatCSR(csr string) string {
	// 去掉首尾的标头和标尾
	csr = strings.TrimPrefix(csr, "-----BEGIN CERTIFICATE REQUEST-----")
	csr = strings.TrimSuffix(csr, "-----END CERTIFICATE REQUEST-----")
	csr = strings.TrimSpace(csr)

	// 每行64个字符切割
	var formattedCSR strings.Builder
	const lineLength = 64
	for i := 0; i < len(csr); i += lineLength {
		end := i + lineLength
		if end > len(csr) {
			end = len(csr)
		}
		formattedCSR.WriteString(csr[i:end] + "\n")
	}

	// 添加标头和标尾
	finalCSR := "-----BEGIN CERTIFICATE REQUEST-----\n" + formattedCSR.String() + "-----END CERTIFICATE REQUEST-----\n"
	return finalCSR
}
