package storm

import (
	deluge "github.com/gdm85/go-libdeluge"
	"github.com/gorilla/mux"
	"net/http"
)

// httpGetPlugins gets all the currently enabled plugins
func httpGetPlugins(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	return conn.GetEnabledPlugins()
}

func httpEnablePlugin(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	id := mux.Vars(r)["id"]

	err := conn.EnablePlugin(id)
	if err != nil {
		return nil, err
	}

	return nil, nil
}

func httpDisablePlugin(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	id := mux.Vars(r)["id"]

	err := conn.DisablePlugin(id)
	if err != nil {
		return nil, err
	}

	return nil, nil
}
