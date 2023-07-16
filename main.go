package main

import (
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"mowgli-gui/pkg/api"
)

func main() {
	_ = godotenv.Load()
	// Launch a web server that serves the web/dist directory as static files and serve a route /api/settings that returns a JSON object with the settings.
	// The web server should listen on port 8080.
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.Use(static.Serve("/", static.LocalFile("./web/dist", false)))
	apiGroup := r.Group("/api")
	api.SettingsRoutes(apiGroup)
	api.ContainersRoutes(apiGroup)
	r.Run(":8080")
}
