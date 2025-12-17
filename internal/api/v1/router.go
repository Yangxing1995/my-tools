package v1

import (
	"github.com/gin-gonic/gin"

	"my-tools/internal/api/v1/csr"
)

func Register(r *gin.RouterGroup) {
	csr.Register(r)
}
