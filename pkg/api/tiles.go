package api

import (
	"github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func proxy(dbProvider types.IDBProvider) func(c *gin.Context) {
	return func(c *gin.Context) {
		tileServer, err := dbProvider.Get("system.map.tileServer")
		if err != nil {
			panic(err)
		}
		remote, err := url.Parse(string(tileServer))
		if err != nil {
			panic(err)
		}

		proxy := httputil.NewSingleHostReverseProxy(remote)
		proxy.Director = func(req *http.Request) {
			req.Header = c.Request.Header
			req.Host = remote.Host
			req.URL.Scheme = remote.Scheme
			req.URL.Host = remote.Host
			req.URL.Path = c.Param("proxyPath")
		}

		proxy.ServeHTTP(c.Writer, c.Request)
	}
}
func TilesProxy(r *gin.Engine, dbProvider types.IDBProvider) {
	r.Any("/tiles/*proxyPath", proxy(dbProvider))
}
