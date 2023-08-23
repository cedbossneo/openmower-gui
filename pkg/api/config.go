package api

import (
	"github.com/gin-gonic/gin"
	"os"
)

// ConfigRoute get config from backend
//
// @Summary get config from backend
// @Description get config from backend
// @Tags config
// @Produce  json
// @Produce  json
// @Success 200 {object} GetConfigResponse
// @Failure 500 {object} ErrorResponse
// @Router /config [get]
func ConfigRoute(r *gin.RouterGroup) {
	r.GET("/config", func(context *gin.Context) {
		tileUri := os.Getenv("MAP_TILE_URI")
		context.JSON(200, GetConfigResponse{
			TileUri: tileUri,
		})
	})
}
