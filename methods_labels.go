package storm

import (
	"fmt"
	deluge "github.com/gdm85/go-libdeluge"
	"github.com/gorilla/mux"
	"net/http"
)

// getClientV1 gets the underlying version 1 client from a DelugeClient interface.
func getClientV1(conn deluge.DelugeClient) (*deluge.Client, error) {
	switch client := conn.(type) {
	case *deluge.Client:
		return client, nil
	case *deluge.ClientV2:
		return &client.Client, nil
	default:
		return nil, fmt.Errorf("failed to obtain version 1 Deluge client")
	}
}

// labelPluginClient constructs an instance of a deluge.LabelPlugin client from the input DelugeClient connection.
func labelPluginClient(conn deluge.DelugeClient) (*deluge.LabelPlugin, error) {
	client, err := getClientV1(conn)
	if err != nil {
		return nil, err
	}

	return &deluge.LabelPlugin{
		Client: client,
	}, nil
}

// httpLabels gets the current labels
func httpLabels(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	plugin, err := labelPluginClient(conn)
	if err != nil {
		return nil, err
	}

	return plugin.GetLabels()
}

// httpCreateLabel creates a new label
func httpCreateLabel(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	vars := mux.Vars(r)

	plugin, err := labelPluginClient(conn)
	if err != nil {
		return nil, err
	}

	err = plugin.AddLabel(vars["id"])
	if err != nil {
		return nil, err
	}

	return nil, nil
}

// httpCreateLabel deletes an existing label
func httpDeleteLabel(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	vars := mux.Vars(r)

	plugin, err := labelPluginClient(conn)
	if err != nil {
		return nil, err
	}

	err = plugin.RemoveLabel(vars["id"])
	if err != nil {
		return nil, err
	}

	return nil, nil
}

// httpTorrentsLabels gets labels associated with all torrents matching the filter.
// 		?id[]	One or more torrent IDs
//		?state	Torrents of this state
//
//		Returns a mapping of torrent hash to torrent labels
func httpTorrentsLabels(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	ids, err := torrentIDs(r.URL.Query(), 0)
	if err != nil {
		return nil, err
	}

	state := (deluge.TorrentState)(r.URL.Query().Get("state"))

	plugin, err := labelPluginClient(conn)
	if err != nil {
		return nil, err
	}

	labels, err := plugin.GetTorrentsLabels(state, ids)
	if err != nil {
		return nil, err
	}

	return labels, nil
}

type SetTorrentLabelRequest struct {
	Label string
}

// httpSetTorrentLabel sets the label for a given torrent hash
func httpSetTorrentLabel(id string, conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	var req SetTorrentLabelRequest

	err := Read(r, &req)
	if err != nil {
		return nil, err
	}

	plugin, err := labelPluginClient(conn)
	if err != nil {
		return nil, err
	}

	err = plugin.SetTorrentLabel(id, req.Label)
	if err != nil {
		return nil, err
	}

	return nil, nil
}
