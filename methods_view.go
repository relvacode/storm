package storm

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	deluge "github.com/gdm85/go-libdeluge"
	"net/http"
	"sort"
)

type ViewTorrent struct {
	Hash  string
	Label string
	*deluge.TorrentStatus
}

type ViewUpdate struct {
	Torrents []*ViewTorrent
	Session  *deluge.SessionStatus
	DiskFree int64
}

type ViewUpdateResponse struct {
	ViewUpdate
	ETag string
}

func httpViewUpdate(conn deluge.DelugeClient, r *http.Request) (interface{}, error) {
	var (
		q     = r.URL.Query()
		ids   = q["id"]
		state = deluge.TorrentState(q.Get("state"))
	)

	torrents, err := conn.TorrentsStatus(state, ids)
	if err != nil {
		return nil, err
	}

	var torrentHashes = make([]string, 0, len(torrents))
	for k := range torrents {
		torrentHashes = append(torrentHashes, k)
	}
	sort.Strings(torrentHashes)

	var torrentLabels = make(map[string]string)

	plugin, err := labelPluginClient(conn)
	if err == nil {
		labels, err := plugin.GetTorrentsLabels(state, ids)
		if err == nil {
			torrentLabels = labels
		}
	}

	var responseTorrents = make([]*ViewTorrent, 0, len(torrents))
	for _, k := range torrentHashes {
		responseTorrents = append(responseTorrents, &ViewTorrent{
			Hash:          k,
			Label:         torrentLabels[k],
			TorrentStatus: torrents[k],
		})
	}

	session, err := conn.GetSessionStatus()
	if err != nil {
		return nil, err
	}

	diskFree, err := conn.GetFreeSpace(q.Get("path"))

	update := ViewUpdate{
		Torrents: responseTorrents,
		Session:  session,
		DiskFree: diskFree,
	}

	// ETag calculation
	var h = sha1.New()
	_ = json.NewEncoder(h).Encode(&update)

	responseETag := hex.EncodeToString(h.Sum(nil))

	if requestETag := r.Header.Get("ETag"); requestETag != "" && requestETag == responseETag {
		return nil, &Error{
			Code:    http.StatusNotModified,
			Message: "View not modified since last request",
		}
	}

	return &ViewUpdateResponse{
		ViewUpdate: update,
		ETag:       responseETag,
	}, nil
}
