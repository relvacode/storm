package storm

import (
	"fmt"
	deluge "github.com/gdm85/go-libdeluge"
	"github.com/gorilla/mux"
	"net/http"
	"net/url"
)

type DelugeMethod func(conn deluge.DelugeClient, r *http.Request) (interface{}, error)

func torrentIDs(q url.Values, min int) ([]string, error) {
	var ids = q["id"]
	if len(ids) < min {
		return nil, &Error{Code: http.StatusBadRequest, Message: fmt.Sprintf("At least %d torrent ID(s) are required", min)}
	}

	return ids, nil
}

func httpTorrentsStatus(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	var (
		q     = r.URL.Query()
		ids   = q["id"]
		state = deluge.TorrentState(q.Get("state"))
	)

	return conn.TorrentsStatus(state, ids)
}

func httpDeleteTorrents(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	var (
		q       = r.URL.Query()
		rmFiles = q.Get("files") == "true"
	)

	ids, err := torrentIDs(q, 1)
	if err != nil {
		return nil, err
	}

	errors, err := conn.RemoveTorrents(ids, rmFiles)
	if err != nil {
		return nil, err
	}

	if len(errors) > 0 {
		return &errors, nil
	}

	return nil, nil
}

func httpPauseTorrents(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	ids, err := torrentIDs(r.URL.Query(), 1)
	if err != nil {
		return nil, err
	}

	return nil, conn.PauseTorrents(ids...)
}

func httpResumeTorrents(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	ids, err := torrentIDs(r.URL.Query(), 1)
	if err != nil {
		return nil, err
	}

	return nil, conn.ResumeTorrents(ids...)
}

type AddTorrentRequest struct {
	Type string
	URI  string
	Data string

	Options deluge.Options
}

type AddTorrentResponse struct {
	ID string
}

func httpAddTorrent(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	var req AddTorrentRequest

	err := Read(r, &req)
	if err != nil {
		return nil, err
	}

	var id string
	switch req.Type {
	case "url":
		id, err = conn.AddTorrentURL(req.URI, &req.Options)
	case "magnet":
		id, err = conn.AddTorrentMagnet(req.URI, &req.Options)
	case "file":
		id, err = conn.AddTorrentFile(req.URI, req.Data, &req.Options)
	default:
		return nil, &Error{Code: http.StatusBadRequest, Message: "Torrent Type must be one of url, magnet or file"}
	}

	if err != nil {
		return nil, err
	}

	// The RPC returns an empty ID if the torrent could not be parsed or processed.
	if id == "" {
		return nil, &Error{Code: http.StatusUnprocessableEntity, Message: "Torrent file could not be read"}
	}

	return AddTorrentResponse{ID: id}, nil
}

type TorrentMethod func(id string, conn deluge.DelugeClient, r *http.Request) (interface{}, error)

func TorrentHandler(f TorrentMethod) DelugeMethod {
	return func(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
		vars := mux.Vars(r)
		return f(vars["id"], conn, r)
	}
}

func httpTorrentStatus(id string, conn deluge.DelugeClient, _ *http.Request) (interface{}, error) {
	return conn.TorrentStatus(id)
}

func httpDeleteTorrent(id string, conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	ok, err := conn.RemoveTorrent(id, r.URL.Query().Get("files") == "true")
	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, &Error{Code: http.StatusNotFound, Message: "Requested torrent could not be deleted"}
	}

	return nil, nil
}

func httpPauseTorrent(id string, conn deluge.DelugeClient, _ *http.Request) (interface{}, error) {
	return nil, conn.PauseTorrents(id)
}

func httpResumeTorrent(id string, conn deluge.DelugeClient, _ *http.Request) (interface{}, error) {
	return nil, conn.ResumeTorrents(id)
}

func httpSetTorrentOptions(id string, conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	var req deluge.Options

	err := Read(r, &req)
	if err != nil {
		return nil, err
	}

	return nil, conn.SetTorrentOptions(id, &req)
}

func httpGetSessionStatus(conn deluge.DelugeClient, _ *http.Request) (interface{}, error) {
	return conn.GetSessionStatus()
}
