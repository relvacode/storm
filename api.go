package deluge_api

import (
	deluge "github.com/gdm85/go-libdeluge"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
	"net/http"
)

func New(log *zap.Logger, pool *ConnectionPool) *Api {
	api := &Api{
		pool:   pool,
		log:    log,
		router: mux.NewRouter(),
	}

	api.router.NotFoundHandler = api.httpNotFound()
	api.bind()

	return api
}

type Api struct {
	pool *ConnectionPool

	log    *zap.Logger
	router *mux.Router
}

// Handle wraps a HandlerFunc with Api middleware
func (api *Api) Handle(f HandlerFunc) http.HandlerFunc {
	adaptor := Adaptor(f)
	adaptor = Log(api.log, adaptor)
	return adaptor
}

func (api *Api) DelugeHandler(f DelugeMethod) http.HandlerFunc {
	return api.Handle(func(r *http.Request) (interface{}, error) {
		conn, err := api.pool.Get(r.Context())
		if err != nil {
			return nil, err
		}

		ret, err := f(conn, r)
		api.pool.Put(conn)

		switch t := err.(type) {
		case deluge.RPCError:
			api.log.Error(t.TraceBack, zap.String("ErrorType", t.ExceptionType), zap.String("ErrorMessage", t.ExceptionMessage))
			err = RPCError{
				ExceptionType:    t.ExceptionType,
				ExceptionMessage: t.ExceptionMessage,
			}
		}

		return ret, err
	})
}

func (api *Api) ServeHTTP(rw http.ResponseWriter, r *http.Request) {
	rw.Header().Set("Access-Control-Allow-Origin", "http://localhost:4200")
	rw.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
	rw.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")

	api.router.ServeHTTP(rw, r)
}

// httpNotFound implements an http.Handler that returns a not found error message.
func (api *Api) httpNotFound() http.Handler {
	return api.Handle(func(r *http.Request) (interface{}, error) {
		return nil, &Error{
			Message: "Not found",
			Code:    http.StatusNotFound,
		}
	})
}

func (api *Api) bind() {

	router := api.router.PathPrefix("/api").Subrouter()
	router.NotFoundHandler = api.httpNotFound()

	// CORS
	router.Methods(http.MethodOptions).HandlerFunc(func(rw http.ResponseWriter, request *http.Request) {
		rw.WriteHeader(http.StatusOK)
	})

	router.
		Methods(http.MethodGet).
		Path("/torrents").
		HandlerFunc(api.DelugeHandler(httpTorrentsStatus))
	router.
		Methods(http.MethodPost).
		Path("/torrents").
		HandlerFunc(api.DelugeHandler(httpAddTorrent))
	router.
		Methods(http.MethodDelete).
		Path("/torrents").
		HandlerFunc(api.DelugeHandler(httpDeleteTorrents))
	router.
		Methods(http.MethodPost).
		Path("/torrents/pause").
		HandlerFunc(api.DelugeHandler(httpPauseTorrents))
	router.
		Methods(http.MethodPost).
		Path("/torrents/resume").
		HandlerFunc(api.DelugeHandler(httpResumeTorrents))

	router.
		Methods(http.MethodGet).
		Path("/torrent/{id}").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpTorrentStatus)))
	router.
		Methods(http.MethodDelete).
		Path("/torrent/{id}").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpDeleteTorrent)))
	router.
		Methods(http.MethodPut).
		Path("/torrent/{id}").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpSetTorrentOptions)))
	router.
		Methods(http.MethodPost).
		Path("/torrent/{id}/pause").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpPauseTorrent)))
	router.
		Methods(http.MethodPost).
		Path("/torrent/{id}/resume").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpResumeTorrent)))

	// Static files
	api.router.Methods(http.MethodGet).Handler(http.FileServer(Static))
}
