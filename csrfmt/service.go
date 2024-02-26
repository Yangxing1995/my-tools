package csrfmt

import (
	"html/template"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// PageData 结构用于传递数据到 HTML 模板中
type PageData struct {
	OutputText string
}

func Register(app *gin.Engine) {
	r := app.Group("/csr")

	r.GET("/", func(c *gin.Context) {

		w := c.Writer
		// 默认展示页面
		renderTemplate(w, "index.html", PageData{})
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

		renderTemplate(w, "index.html", data)
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
	tmpl, err := template.New("index.html").Parse(`
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>处理换行服务</title>
		</head>
		<body>
			<h1>处理换行</h1>
			
			<form action="/" method="post">
				<label for="inputText">输入文本:</label>
				<textarea id="inputText" name="inputText" rows="4" cols="50">{{.OutputText}}</textarea>
				<br>
				<input type="submit" value="处理文本">
			</form>
			
			<p>处理后的文本:</p>
			<pre>{{.OutputText}}</pre>
		</body>
		</html>
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

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

func fmtCSRForJson(csr string) string {

	newCSR := ""
	spilt := strings.Split(csr, "\n")

	for i := 0; i < len(spilt); i++ {
		newCSR += spilt[i] + "\\n"
	}

	return newCSR
}
