package api

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"os"
	"strings"
)

func SettingsRoutes(r *gin.RouterGroup) {
	r.GET("/settings", func(c *gin.Context) {
		file, err := os.ReadFile(os.Getenv("MOWER_CONFIG_FILE"))
		if err != nil {
			c.JSON(500, gin.H{
				"error": err.Error(),
			})
			return
		}
		settings, err := godotenv.Parse(strings.NewReader(string(file)))
		if err != nil {
			c.JSON(500, gin.H{
				"error": err.Error(),
			})
			return
		}
		c.JSON(200, gin.H{
			"settings": settings,
		})
	})
	r.POST("/settings", func(c *gin.Context) {
		var payload map[string]any
		err := c.BindJSON(&payload)
		if err != nil {
			c.JSON(500, gin.H{
				"error": err.Error(),
			})
			return
		}
		settings, hasSettings := payload["settings"]
		if !hasSettings {
			c.JSON(500, gin.H{
				"error": "no settings found",
			})
			return
		}
		// Write settings to file mower_config.sh
		var fileContent string
		for key, value := range settings.(map[string]any) {
			if value == true {
				value = "True"
			}
			if value == false {
				value = "False"
			}
			fileContent += "export " + key + "=" + fmt.Sprintf("%#v", value) + "\n"
		}
		err = os.WriteFile(os.Getenv("MOWER_CONFIG_FILE"), []byte(fileContent), 0644)
		if err != nil {
			c.JSON(500, gin.H{
				"error": err.Error(),
			})
			return
		}
		c.JSON(200, "ok")
	})
}
