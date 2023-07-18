package api

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"os"
	"strings"
)

func SettingsRoutes(r *gin.RouterGroup) {
	GetSettings(r)
	PostSettings(r)
}

// PostSettings saves the settings to the mower_config.sh file
//
// @Summary saves the settings to the mower_config.sh file
// @Description saves the settings to the mower_config.sh file
// @Tags settings
// @Accept  json
// @Produce  json
// @Param settings body map[string]any true "settings"
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /settings [post]
func PostSettings(r *gin.RouterGroup) gin.IRoutes {
	return r.POST("/settings", func(c *gin.Context) {
		var settings map[string]any
		err := c.BindJSON(&settings)
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		// Write settings to file mower_config.sh
		var fileContent string
		for key, value := range settings {
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
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		c.JSON(200, OkResponse{})
	})
}

// GetSettings returns a JSON object with the settings
//
// @Summary returns a JSON object with the settings
// @Description returns a JSON object with the settings
// @Tags settings
// @Produce  json
// @Success 200 {object} GetSettingsResponse
// @Failure 500 {object} ErrorResponse
// @Router /settings [get]
func GetSettings(r *gin.RouterGroup) gin.IRoutes {
	return r.GET("/settings", func(c *gin.Context) {
		file, err := os.ReadFile(os.Getenv("MOWER_CONFIG_FILE"))
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		settings, err := godotenv.Parse(strings.NewReader(string(file)))
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		c.JSON(200, GetSettingsResponse{
			Settings: settings,
		})
	})
}
