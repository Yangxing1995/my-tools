package v1

import (
	"github.com/gin-gonic/gin"

	"my-tools/internal/api/v1/sectigo"
)

func Register(r *gin.RouterGroup) {
	sectigo.Register(r)
}
