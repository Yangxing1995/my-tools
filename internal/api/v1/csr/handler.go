package csr

import (
	"net/http"

	"github.com/gin-gonic/gin"

	httpapi "my-tools/internal/api/http"
)

func Register(r *gin.RouterGroup) {
	svc := NewService()
	g := r.Group("/csr")
	g.POST("/format", func(c *gin.Context) {
		var req FormatCSRRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", err.Error()))
			return
		}

		pem, err := svc.FormatCSR(req.CSR)
		if err != nil {
			c.JSON(http.StatusBadRequest, httpapi.Fail("invalid_csr", err.Error()))
			return
		}

		c.JSON(http.StatusOK, httpapi.OK(FormatCSRResponse{PEM: pem}))
	})
}
