package server

import (
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"

	v1 "wrench/internal/api/v1"
)

type Server struct {
	Engine *gin.Engine
}

func New() *Server {
	return NewWithStaticDir(filepath.Join("web", "static"))
}

func NewWithStaticDir(staticDir string) *Server {
	e := gin.New()
	e.Use(gin.Logger(), gin.Recovery())

	e.Static("/static", staticDir)

	e.GET("/", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "index.html"))
	})
	// CSR 页面
	e.GET("/csr", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "csr.html"))
	})
	// 证书格式化页面
	e.GET("/cert", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "cert.html"))
	})
	// CSR 与证书匹配页面
	e.GET("/cert-match", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "cert-match.html"))
	})
	// JSON 解析器页面
	e.GET("/json", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "json.html"))
	})
	// Base64 编解码页面
	e.GET("/base64", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "base64.html"))
	})
	// URL 编解码页面
	e.GET("/url", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "url.html"))
	})
	// PG Array 转换页面
	e.GET("/pg-array", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "pg-array.html"))
	})
	// 文本处理页面
	e.GET("/text", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "text.html"))
	})
	// 时间计算页面
	e.GET("/time", func(c *gin.Context) {
		c.File(filepath.Join(staticDir, "time.html"))
	})

	e.GET("/healthz", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	api := e.Group("/api")
	v1g := api.Group("/v1")
	v1.Register(v1g)

	return &Server{Engine: e}
}
