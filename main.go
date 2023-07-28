package main

import (
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerfiles "github.com/swaggo/files"

	"github.com/cedbossneo/openmower-gui/docs"
	"github.com/cedbossneo/openmower-gui/pkg/api"
	"github.com/cedbossneo/openmower-gui/pkg/providers"
	ginSwagger "github.com/swaggo/gin-swagger"
	"os"
)
import "github.com/gin-contrib/cors"

// gin-swagger middleware
// swagger embed files

func main() {
	_ = godotenv.Load()
	// Launch a web server that serves the web/dist directory as static files and serve a route /api/settings that returns a JSON object with the settings.
	// The web server should listen on port 8080.
	gin.SetMode(gin.ReleaseMode)
	docs.SwaggerInfo.BasePath = "/api"
	r := gin.Default()
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowWebSockets = true
	r.Use(cors.New(config))
	r.Use(static.Serve("/", static.LocalFile(os.Getenv("WEB_DIR"), false)))
	apiGroup := r.Group("/api")
	dockerProvider := providers.NewDockerProvider()
	rosProvider := providers.NewRosProvider()
	api.SettingsRoutes(apiGroup)
	api.ContainersRoutes(apiGroup, dockerProvider)
	api.OpenMowerRoutes(apiGroup, rosProvider)
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))
	r.Run(":4006")
}
