package storm

import (
	"bytes"
	"fmt"
	deluge "github.com/gdm85/go-libdeluge"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
	"html/template"
	"io/ioutil"
	"net/http"
	"strings"
)

func appendSuffix(s, suffix string) string {
	if strings.HasSuffix(s, suffix) {
		return s
	}

	return fmt.Sprint(s, suffix)
}

func New(log *zap.Logger, pool *ConnectionPool, pathPrefix string) *Api {
	api := &Api{
		pool:       pool,
		pathPrefix: strings.TrimSuffix(pathPrefix, "/"),
		log:        log,
		router:     mux.NewRouter(),
	}

	api.router.NotFoundHandler = api.httpNotFound()
	api.bind()

	return api
}

type Api struct {
	pool       *ConnectionPool
	pathPrefix string

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

func (api *Api) templateContext() interface{} {
	path := appendSuffix(api.pathPrefix, "/")
	return map[string]string{
		"BasePath":    path,
		"BaseAPIPath": fmt.Sprint(path, "api/"),
	}
}

func (api *Api) renderStaticTemplate(name string) {
	log := api.log.With(zap.String("template", name))

	data, err := Static.Open(name)
	if err != nil {
		log.Error("failed to open template for rendering", zap.Error(err))
		return
	}

	tmpl, err := ioutil.ReadAll(data)
	if err != nil {
		log.Error("failed to read template", zap.Error(err))
		return
	}

	t, err := template.New(name).Parse(string(tmpl))
	if err != nil {
		log.Error("failed to parse template", zap.Error(err))
		return
	}

	var b bytes.Buffer
	err = t.Execute(&b, api.templateContext())
	if err != nil {
		log.Error("failed to render template", zap.Error(err))
		return
	}

	err = Static.AddBytes(name, b.Bytes())
	if err != nil {
		log.Error("failed to set bytes", zap.Error(err))
	}
}

func (api *Api) bindStatic(router *mux.Router) {
	api.renderStaticTemplate("/index.html")

	fs := http.FileServer(Static)
	if api.pathPrefix != "" {
		fs = http.StripPrefix(api.pathPrefix, fs)
	}

	router.Methods(http.MethodGet).Handler(fs)
}

func (api *Api) bind() {
	primaryRouter := api.router
	if api.pathPrefix != "" {
		primaryRouter = api.router.PathPrefix(api.pathPrefix).Subrouter()
	}

	router := primaryRouter.PathPrefix("/api").Subrouter()
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
	api.bindStatic(primaryRouter)
}
