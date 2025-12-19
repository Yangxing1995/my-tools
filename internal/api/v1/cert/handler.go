package cert

import (
	"net/http"

	"github.com/gin-gonic/gin"

	httpapi "my-tools/internal/api/http"
)

func Register(r *gin.RouterGroup) {
	svc := NewService()
	g := r.Group("/cert")
	g.POST("/split", func(c *gin.Context) {
		var req SplitCertChainRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, httpapi.Fail("bad_request", err.Error()))
			return
		}

		certs, err := svc.SplitCertChain(req.CertChain)
		if err != nil {
			c.JSON(http.StatusBadRequest, httpapi.Fail("invalid_cert", err.Error()))
			return
		}

		c.JSON(http.StatusOK, httpapi.OK(SplitCertChainResponse{
			Certs: certs,
			Count: len(certs),
		}))
	})
}
