// Code generated by swaggo/swag. DO NOT EDIT.

package docs

import "github.com/swaggo/swag"

const docTemplate = `{
    "schemes": {{ marshal .Schemes }},
    "swagger": "2.0",
    "info": {
        "description": "{{escape .Description}}",
        "title": "{{.Title}}",
        "contact": {},
        "version": "{{.Version}}"
    },
    "host": "{{.Host}}",
    "basePath": "{{.BasePath}}",
    "paths": {
        "/containers": {
            "get": {
                "description": "list all containers",
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "containers"
                ],
                "summary": "list all containers",
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/api.ContainerListResponse"
                        }
                    },
                    "500": {
                        "description": "Internal Server Error",
                        "schema": {
                            "$ref": "#/definitions/api.ErrorResponse"
                        }
                    }
                }
            }
        },
        "/containers/{containerId}/logs": {
            "get": {
                "description": "get container logs",
                "produces": [
                    "text/event-stream"
                ],
                "tags": [
                    "containers"
                ],
                "summary": "get container logs",
                "parameters": [
                    {
                        "type": "string",
                        "description": "container id",
                        "name": "containerId",
                        "in": "path",
                        "required": true
                    }
                ],
                "responses": {}
            }
        },
        "/containers/{containerId}/{command}": {
            "post": {
                "description": "execute a command on a container",
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "containers"
                ],
                "summary": "execute a command on a container",
                "parameters": [
                    {
                        "type": "string",
                        "description": "container id",
                        "name": "containerId",
                        "in": "path",
                        "required": true
                    },
                    {
                        "type": "string",
                        "description": "command to execute (start/stop/restart)",
                        "name": "command",
                        "in": "path",
                        "required": true
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/api.OkResponse"
                        }
                    },
                    "500": {
                        "description": "Internal Server Error",
                        "schema": {
                            "$ref": "#/definitions/api.ErrorResponse"
                        }
                    }
                }
            }
        },
        "/openmower/call/{command}": {
            "post": {
                "description": "call a service",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "openmower"
                ],
                "summary": "call a service",
                "parameters": [
                    {
                        "type": "string",
                        "description": "command to call, could be: mower_start, mower_home, mower_s1, mower_s2, emergency, mow",
                        "name": "command",
                        "in": "path",
                        "required": true
                    },
                    {
                        "description": "request body",
                        "name": "CallReq",
                        "in": "body",
                        "required": true,
                        "schema": {
                            "type": "object",
                            "additionalProperties": true
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/api.OkResponse"
                        }
                    },
                    "500": {
                        "description": "Internal Server Error",
                        "schema": {
                            "$ref": "#/definitions/api.ErrorResponse"
                        }
                    }
                }
            }
        },
        "/openmower/map/area/add": {
            "post": {
                "description": "add a map area",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "openmower"
                ],
                "summary": "add a map area",
                "parameters": [
                    {
                        "description": "request body",
                        "name": "CallReq",
                        "in": "body",
                        "required": true,
                        "schema": {
                            "$ref": "#/definitions/mower_map.AddMowingAreaSrvReq"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/api.OkResponse"
                        }
                    },
                    "500": {
                        "description": "Internal Server Error",
                        "schema": {
                            "$ref": "#/definitions/api.ErrorResponse"
                        }
                    }
                }
            }
        },
        "/openmower/map/area/{index}": {
            "delete": {
                "description": "delete a map area",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "openmower"
                ],
                "summary": "delete a map area",
                "parameters": [
                    {
                        "type": "string",
                        "description": "index of the area to delete",
                        "name": "index",
                        "in": "path",
                        "required": true
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/api.OkResponse"
                        }
                    },
                    "500": {
                        "description": "Internal Server Error",
                        "schema": {
                            "$ref": "#/definitions/api.ErrorResponse"
                        }
                    }
                }
            }
        },
        "/openmower/subscribe/{topic}": {
            "get": {
                "description": "subscribe to a topic",
                "tags": [
                    "openmower"
                ],
                "summary": "subscribe to a topic",
                "parameters": [
                    {
                        "type": "string",
                        "description": "topic to subscribe to, could be: diagnostics, status, gps, imu, ticks, highLevelStatus",
                        "name": "topic",
                        "in": "path",
                        "required": true
                    }
                ],
                "responses": {}
            }
        },
        "/settings": {
            "get": {
                "description": "returns a JSON object with the settings",
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "settings"
                ],
                "summary": "returns a JSON object with the settings",
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/api.GetSettingsResponse"
                        }
                    },
                    "500": {
                        "description": "Internal Server Error",
                        "schema": {
                            "$ref": "#/definitions/api.ErrorResponse"
                        }
                    }
                }
            },
            "post": {
                "description": "saves the settings to the mower_config.sh file",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "tags": [
                    "settings"
                ],
                "summary": "saves the settings to the mower_config.sh file",
                "parameters": [
                    {
                        "description": "settings",
                        "name": "settings",
                        "in": "body",
                        "required": true,
                        "schema": {
                            "type": "object",
                            "additionalProperties": true
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/api.OkResponse"
                        }
                    },
                    "500": {
                        "description": "Internal Server Error",
                        "schema": {
                            "$ref": "#/definitions/api.ErrorResponse"
                        }
                    }
                }
            }
        }
    },
    "definitions": {
        "api.Container": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string"
                },
                "labels": {
                    "type": "object",
                    "additionalProperties": {
                        "type": "string"
                    }
                },
                "names": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "state": {
                    "type": "string"
                }
            }
        },
        "api.ContainerListResponse": {
            "type": "object",
            "properties": {
                "containers": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/api.Container"
                    }
                }
            }
        },
        "api.ErrorResponse": {
            "type": "object",
            "properties": {
                "error": {
                    "type": "string"
                }
            }
        },
        "api.GetSettingsResponse": {
            "type": "object",
            "properties": {
                "settings": {
                    "type": "object",
                    "additionalProperties": {
                        "type": "string"
                    }
                }
            }
        },
        "api.OkResponse": {
            "type": "object",
            "properties": {
                "ok": {
                    "type": "string"
                }
            }
        },
        "geometry_msgs.Point32": {
            "type": "object",
            "properties": {
                "msg.Package": {
                    "type": "integer"
                },
                "x": {
                    "type": "number"
                },
                "y": {
                    "type": "number"
                },
                "z": {
                    "type": "number"
                }
            }
        },
        "geometry_msgs.Polygon": {
            "type": "object",
            "properties": {
                "msg.Package": {
                    "type": "integer"
                },
                "points": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/geometry_msgs.Point32"
                    }
                }
            }
        },
        "mower_map.AddMowingAreaSrvReq": {
            "type": "object",
            "properties": {
                "area": {
                    "$ref": "#/definitions/mower_map.MapArea"
                },
                "isNavigationArea": {
                    "type": "boolean"
                },
                "msg.Package": {
                    "type": "integer"
                }
            }
        },
        "mower_map.MapArea": {
            "type": "object",
            "properties": {
                "area": {
                    "$ref": "#/definitions/geometry_msgs.Polygon"
                },
                "msg.Package": {
                    "type": "integer"
                },
                "name": {
                    "type": "string"
                },
                "obstacles": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/geometry_msgs.Polygon"
                    }
                }
            }
        }
    }
}`

// SwaggerInfo holds exported Swagger Info so clients can modify it
var SwaggerInfo = &swag.Spec{
	Version:          "",
	Host:             "",
	BasePath:         "",
	Schemes:          []string{},
	Title:            "",
	Description:      "",
	InfoInstanceName: "swagger",
	SwaggerTemplate:  docTemplate,
	LeftDelim:        "{{",
	RightDelim:       "}}",
}

func init() {
	swag.Register(SwaggerInfo.InstanceName(), SwaggerInfo)
}
