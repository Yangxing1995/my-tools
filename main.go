package main

import (
	"embed"
	"fmt"

	"my-tools/conf"
	"my-tools/csrfmt"
	"my-tools/domainchecker"

	"github.com/gin-gonic/gin"
)

//go:embed static/*
var content embed.FS

func main() {

	config.Init(content)

	r := gin.Default()

	domain.Register(r)
	csrfmt.Register(r)

	// 创建一个路由处理程序，用于加载 HTML 页面
	r.GET("/", func(c *gin.Context) {
		data, ok := config.AppConfig.Htmls["index.html"]
		if !ok {
			c.AbortWithError(500, fmt.Errorf("Html not found"))
		} else {
			c.Data(200, "", data)
		}
	})

	r.Run(":8111")
}
