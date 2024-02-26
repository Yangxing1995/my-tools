package main

import (
	"io/ioutil"
	"path/filepath"

	"my-tools/csrfmt"
	"my-tools/domainchecker"

	"github.com/gin-gonic/gin"
)

func main() {

	r := gin.Default()

	domainchecker.Register(r)
	csrfmt.Register(r)

	// 创建一个路由处理程序，用于加载 HTML 页面
	r.GET("/", func(c *gin.Context) {
		path := "/Users/trustasia/go/src/yx/my-tools/static"
		data, err := ioutil.ReadFile(filepath.Join(path, "index.html"))
		if err != nil {
			c.AbortWithError(500, err)
		} else {
			c.Data(200, "", data)
		}
	})

	r.Run(":8080")
}
