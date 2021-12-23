package storm

import (
	"fmt"
	deluge "github.com/gdm85/go-libdeluge"
	"github.com/gorilla/mux"
	"github.com/spf13/afero"
	"go.uber.org/zap"
	"html/template"
	"io/fs"
	"io/ioutil"
	"net/http"
	"os"
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

// logRequest returns a logging function attached to a logger set at the correct level and fields
// for the given wrapped response, request and handler error.
func (api *Api) logRequest(rw *ResponseWriter, r *http.Request, err error) func(string, ...zap.Field) {
	logger := api.log.With(
		zap.String("Method", r.Method),
		zap.String("URL", r.URL.String()),
		zap.String("RemoteAddr", r.RemoteAddr),
		zap.Time("Time", rw.Started()),
		zap.Int("StatusCode", rw.code),
		zap.Int("ResponseSize", rw.Len()),
		zap.Duration("Duration", rw.Duration()),
	)

	if err == nil {
		return logger.Info
	}

	return logger.With(zap.Error(err)).Error
}

// Handle constructs a http.HandlerFunc that calls a handler,
// responds to the client based on the result of the handler call,
// and logs the result to the Api logger.
func (api *Api) Handle(handler HandlerFunc) http.HandlerFunc {
	return func(rw http.ResponseWriter, r *http.Request) {
		var (
			wrapped = WrapResponse(rw)
			err     = Handle(rw, r, handler)
			log     = api.logRequest(wrapped, r, err)
		)

		log(http.StatusText(wrapped.Code()))
	}
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

// renderTemplate takes the contents of a go html/template found at source `name`
// and renders it back to the file system using templateContext().
func (api *Api) renderTemplate(fs afero.Fs, name string) {
	log := api.log.With(zap.String("template", name))

	f, err := fs.Open(name)
	if err != nil {
		log.Error("failed to open template for rendering", zap.Error(err))
		return
	}

	templateSource, err := ioutil.ReadAll(f)
	if err != nil {
		log.Error("failed to read template", zap.Error(err))
		return
	}

	_ = f.Close()

	t, err := template.New(name).Parse(string(templateSource))
	if err != nil {
		log.Error("failed to parse template", zap.Error(err))
		return
	}

	w, err := fs.OpenFile(name, os.O_WRONLY|os.O_TRUNC, os.FileMode(0600))
	if err != nil {
		log.Error("failed to open template file for writing", zap.Error(err))
		return
	}

	err = t.Execute(w, api.templateContext())
	if err != nil {
		log.Error("failed to render template", zap.Error(err))
		return
	}

	err = w.Close()
	if err != nil {
		log.Error("failed to close rendered template", zap.Error(err))
		return
	}
}

func (api *Api) bindStatic(router *mux.Router) {
	var (
		static, _ = fs.Sub(Static, "frontend/dist")

		mem = afero.NewMemMapFs()
		ufs = afero.NewCopyOnWriteFs(&afero.FromIOFS{
			FS: static,
		}, mem)
	)

	api.renderTemplate(ufs, "index.html")

	fileServer := http.FileServer(afero.NewHttpFs(ufs).Dir(""))
	if api.pathPrefix != "" {
		fileServer = http.StripPrefix(api.pathPrefix, fileServer)
	}

	router.Methods(http.MethodGet).Handler(fileServer)

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
		Path("/plugins").
		HandlerFunc(api.DelugeHandler(httpGetPlugins))

	router.
		Methods(http.MethodPost).
		Path("/plugins/{id}").
		HandlerFunc(api.DelugeHandler(httpEnablePlugin))

	router.
		Methods(http.MethodDelete).
		Path("/plugins/{id}").
		HandlerFunc(api.DelugeHandler(httpDisablePlugin))

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

	router.
		Methods(http.MethodGet).
		Path("/labels").
		HandlerFunc(api.DelugeHandler(httpLabels))

	router.
		Methods(http.MethodPost).
		Path("/labels/{id}").
		HandlerFunc(api.DelugeHandler(httpCreateLabel))

	router.
		Methods(http.MethodDelete).
		Path("/labels/{id}").
		HandlerFunc(api.DelugeHandler(httpDeleteLabel))

	router.
		Methods(http.MethodGet).
		Path("/torrents/labels").
		HandlerFunc(api.DelugeHandler(httpTorrentsLabels))

	router.
		Methods(http.MethodPost).
		Path("/torrent/{id}/label").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpSetTorrentLabel)))

	// Static files
	api.bindStatic(primaryRouter)
}
