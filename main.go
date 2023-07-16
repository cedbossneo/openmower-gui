package main

import (
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"os"
	"strings"
)
import "github.com/joho/godotenv"

func main() {
	// Launch a web server that serves the web/dist directory as static files and serve a route /api/settings that returns a JSON object with the settings.
	// The web server should listen on port 8080.
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.Use(static.Serve("/", static.LocalFile("./web/dist", false)))
	r.GET("/api/settings", func(c *gin.Context) {
		file, err := os.ReadFile("mower_config.sh")
		if err != nil {
			c.Error(err)
			return
		}
		settings, err := godotenv.Parse(strings.NewReader(string(file)))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(200, gin.H{
			"settings": settings,
		})
	})
	r.POST("/api/settings", func(c *gin.Context) {
		var settings map[string]string
		err := c.BindJSON(&settings)
		if err != nil {
			c.Error(err)
			return
		}
		err = godotenv.Write(settings, "mower_config.sh")
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(200, "ok")
	})
	r.Run(":8080")
}
