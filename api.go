package storm

import (
	"crypto/subtle"
	"encoding/base64"
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
	"time"
)

const (
	ApiAuthCookieName = "storm-api-key"
)

func appendSuffix(s, suffix string) string {
	if strings.HasSuffix(s, suffix) {
		return s
	}

	return fmt.Sprint(s, suffix)
}

func New(log *zap.Logger, pool *ConnectionPool, pathPrefix string, apiKey string, development bool) *Api {
	api := &Api{
		pool:       pool,
		pathPrefix: strings.TrimSuffix(pathPrefix, "/"),
		apiKey:     apiKey,
		log:        log,
		router:     mux.NewRouter(),
	}

	api.router.NotFoundHandler = api.httpNotFound()
	api.bind(development)

	return api
}

type Api struct {
	pool       *ConnectionPool
	pathPrefix string
	apiKey     string

	log    *zap.Logger
	router *mux.Router
}

func (api *Api) DelugeHandler(f DelugeMethod) http.HandlerFunc {
	return func(rw http.ResponseWriter, r *http.Request) {
		_ = Handle(rw, r, func(r *http.Request) (interface{}, error) {
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
}

func (api *Api) ServeHTTP(rw http.ResponseWriter, r *http.Request) {
	api.router.ServeHTTP(rw, r)
}

// httpNotFound implements http.Handler which returns a not found error message.
func (api *Api) httpNotFound() http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		_ = Handle(rw, r, func(r *http.Request) (interface{}, error) {
			return nil, &Error{
				Message: "Not found",
				Code:    http.StatusNotFound,
			}
		})
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

func (api *Api) bindStatic(router *mux.Router, development bool) {
	var static, _ = fs.Sub(Static, "frontend/dist")
	if development {
		static = os.DirFS("./frontend/dist")
	}

	var (
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

// keyFromRequest attempts to locate the API key from the incoming request.
// It looks for the key using these methods in the following order:
//   - The password component of a Basic auth header
//   - The cookie value ApiAuthCookieName as a base64 encoded value
func (api *Api) keyFromRequest(r *http.Request) (string, bool) {
	_, password, ok := r.BasicAuth()
	if ok {
		return password, false
	}

	fromCookie, err := r.Cookie(ApiAuthCookieName)
	if err != nil {
		return "", false
	}

	fromCookieDecoded, _ := base64.StdEncoding.DecodeString(fromCookie.Value)

	return string(fromCookieDecoded), true
}

// logForRequest takes a WrappedResponse and an incoming HTTP request and logs it
func (api *Api) logForRequest(rw *WrappedResponse, r *http.Request) {
	logger := api.log.With(
		zap.String("Method", r.Method),
		zap.String("URL", r.URL.String()),
		zap.String("RemoteAddr", r.RemoteAddr),
		zap.Time("Time", rw.Started()),
		zap.Int("StatusCode", rw.code),
		zap.Int("ResponseSize", rw.Len()),
		zap.Duration("Duration", rw.Duration()),
	)

	var logLevelFunc = logger.Info

	if rw.error != nil {
		logLevelFunc = logger.With(zap.Error(rw.error)).Error
	}

	logLevelFunc(http.StatusText(rw.code))
}

func (api *Api) httpMiddlewareLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		wr := WrapResponse(rw)

		next.ServeHTTP(wr, r)

		api.logForRequest(wr, r)
	})
}

func (api *Api) httpMiddlewareAuthenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		apiKey, fromCookie := api.keyFromRequest(r)
		if apiKey == "" {
			SendError(rw, &Error{
				Code:    http.StatusUnauthorized,
				Message: "No authentication provided in request",
			})
			return
		}

		ok := subtle.ConstantTimeCompare([]byte(api.apiKey), []byte(apiKey)) == 1
		if !ok {
			SendError(rw, &Error{
				Code:    http.StatusUnauthorized,
				Message: "Incorrect API key",
			})
			return
		}

		// If the request didn't originate from a cookie, then set the cookie
		if !fromCookie {
			http.SetCookie(rw, &http.Cookie{
				Name:     ApiAuthCookieName,
				Value:    base64.StdEncoding.EncodeToString([]byte(apiKey)),
				Path:     fmt.Sprintf("%s/api", api.pathPrefix),
				Expires:  time.Now().Add(time.Hour * 24 * 365),
				SameSite: http.SameSiteStrictMode,
				HttpOnly: true,
			})
		}

		next.ServeHTTP(rw, r)
	})
}

func (api *Api) bind(development bool) {
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

	apiRouter := router.NewRoute().Subrouter()
	apiRouter.Use(api.httpMiddlewareLog)

	// Enable API level authentication
	if api.apiKey != "" {
		apiRouter.Use(api.httpMiddlewareAuthenticate)
	}

	apiRouter.
		Methods(http.MethodGet).
		Path("/ping").
		HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
			rw.WriteHeader(http.StatusNoContent)
		})

	apiRouter.
		Methods(http.MethodGet).
		Path("/plugins").
		HandlerFunc(api.DelugeHandler(httpGetPlugins))

	apiRouter.
		Methods(http.MethodPost).
		Path("/plugins/{id}").
		HandlerFunc(api.DelugeHandler(httpEnablePlugin))

	apiRouter.
		Methods(http.MethodDelete).
		Path("/plugins/{id}").
		HandlerFunc(api.DelugeHandler(httpDisablePlugin))

	apiRouter.
		Methods(http.MethodGet).
		Path("/torrents").
		HandlerFunc(api.DelugeHandler(httpTorrentsStatus))
	apiRouter.
		Methods(http.MethodPost).
		Path("/torrents").
		HandlerFunc(api.DelugeHandler(httpAddTorrent))
	apiRouter.
		Methods(http.MethodDelete).
		Path("/torrents").
		HandlerFunc(api.DelugeHandler(httpDeleteTorrents))
	apiRouter.
		Methods(http.MethodPost).
		Path("/torrents/pause").
		HandlerFunc(api.DelugeHandler(httpPauseTorrents))
	apiRouter.
		Methods(http.MethodPost).
		Path("/torrents/resume").
		HandlerFunc(api.DelugeHandler(httpResumeTorrents))

	apiRouter.
		Methods(http.MethodGet).
		Path("/torrent/{id}").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpTorrentStatus)))
	apiRouter.
		Methods(http.MethodDelete).
		Path("/torrent/{id}").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpDeleteTorrent)))
	apiRouter.
		Methods(http.MethodPut).
		Path("/torrent/{id}").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpSetTorrentOptions)))
	apiRouter.
		Methods(http.MethodPost).
		Path("/torrent/{id}/pause").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpPauseTorrent)))
	apiRouter.
		Methods(http.MethodPost).
		Path("/torrent/{id}/resume").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpResumeTorrent)))

	apiRouter.
		Methods(http.MethodGet).
		Path("/labels").
		HandlerFunc(api.DelugeHandler(httpLabels))

	apiRouter.
		Methods(http.MethodPost).
		Path("/labels/{id}").
		HandlerFunc(api.DelugeHandler(httpCreateLabel))

	apiRouter.
		Methods(http.MethodDelete).
		Path("/labels/{id}").
		HandlerFunc(api.DelugeHandler(httpDeleteLabel))

	apiRouter.
		Methods(http.MethodGet).
		Path("/torrents/labels").
		HandlerFunc(api.DelugeHandler(httpTorrentsLabels))

	apiRouter.
		Methods(http.MethodPost).
		Path("/torrent/{id}/label").
		HandlerFunc(api.DelugeHandler(TorrentHandler(httpSetTorrentLabel)))

	// Static files
	api.bindStatic(primaryRouter, development)
}
