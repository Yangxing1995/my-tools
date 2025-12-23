package json

import (
	"net/http"

	"github.com/gin-gonic/gin"

	httpapi "my-tools/internal/api/http"
)

func Register(r *gin.RouterGroup) {
	svc := NewService()
	g := r.Group("/json")

	g.POST("/format", func(c *gin.Context) {
		var req FormatRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", err.Error()))
			return
		}

		formatted, err := svc.FormatJSON(req.JSON, req.Indent)
		if err != nil {
			c.JSON(http.StatusBadRequest, httpapi.Fail("invalid_json", err.Error()))
			return
		}

		c.JSON(http.StatusOK, httpapi.OK(FormatResponse{
			Formatted: formatted,
		}))
	})

	g.POST("/minify", func(c *gin.Context) {
		var req MinifyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", err.Error()))
			return
		}

		minified, err := svc.MinifyJSON(req.JSON)
		if err != nil {
			c.JSON(http.StatusBadRequest, httpapi.Fail("invalid_json", err.Error()))
			return
		}

		c.JSON(http.StatusOK, httpapi.OK(MinifyResponse{
			Minified: minified,
		}))
	})
}
