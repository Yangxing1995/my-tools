package server

import (
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"

	v1 "my-tools/internal/api/v1"
)

type Server struct {
	Engine *gin.Engine
}

func New() *Server {
	e := gin.New()
	e.Use(gin.Logger(), gin.Recovery())

	staticDir := filepath.Join("web", "static")
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
	// JSON 格式化页面
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

	e.GET("/healthz", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	api := e.Group("/api")
	v1g := api.Group("/v1")
	v1.Register(v1g)

	return &Server{Engine: e}
}
